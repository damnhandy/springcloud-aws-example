import * as cdk from "@aws-cdk/core";
import { Construct, RemovalPolicy } from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import { ISecurityGroup, IVpc, Port } from "@aws-cdk/aws-ec2";
import * as cb from "@aws-cdk/aws-codebuild";
import {
  BuildEnvironmentVariableType,
  ComputeType,
  IProject,
  Source
} from "@aws-cdk/aws-codebuild";
import * as path from "path";
import { IKey } from "@aws-cdk/aws-kms";
import * as s3 from "@aws-cdk/aws-s3";
import { EventType } from "@aws-cdk/aws-s3";
import * as s3deploy from "@aws-cdk/aws-s3-deployment";
import { ISecret } from "@aws-cdk/aws-secretsmanager";
import * as ssm from "@aws-cdk/aws-ssm";
import { IStringParameter } from "@aws-cdk/aws-ssm";
import * as ecrdeploy from "cdk-ecr-deployment";
import { IRepository } from "@aws-cdk/aws-ecr";
import * as ecr_assets from "@aws-cdk/aws-ecr-assets";
import * as logs from "@aws-cdk/aws-logs";
import { RetentionDays } from "@aws-cdk/aws-logs";
import * as lambda from "@aws-cdk/aws-lambda";
import { ParamNames } from "./names";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { LambdaDestination } from "@aws-cdk/aws-s3-notifications";

export interface FlywayProjectProps extends cdk.StackProps {
  readonly vpc: IVpc;
  readonly kmsKey: IKey;
  readonly prefix: string;
  readonly sourceBucket: s3.IBucket;
  readonly destinationKeyPrefix: string;
  readonly destinationFileName: string;
  readonly sourceZipPath: string;
  readonly dbAdminSecret: ISecret;
  readonly dbAppUser: ISecret;
  readonly dbJdbcUrl: IStringParameter;
  readonly flywayImageRepo: IRepository;
  readonly mysqlSecurityGroup: ISecurityGroup;
  readonly revision: string;
}

export class FlywayProject extends Construct {
  vpc: IVpc;
  kmsKey: IKey;
  securityGroup: ISecurityGroup;
  flywayProject: IProject;

  constructor(scope: Construct, id: string, props: FlywayProjectProps) {
    super(scope, id);
    this.vpc = props.vpc;
    this.kmsKey = props.kmsKey;

    this.securityGroup = new ec2.SecurityGroup(this, "ProjectSecurityGroup", {
      allowAllOutbound: true,
      description: "Security Group for the Flyway CodeBuild project",
      securityGroupName: "FlywayCodeBuildProjectSG",
      vpc: this.vpc
    });

    const logGroup = new logs.LogGroup(this, "LogGroup", {
      encryptionKey: this.kmsKey,
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.RETAIN
    });

    this.flywayProject = new cb.Project(this, "CodeBuildProject", {
      vpc: this.vpc,
      logging: {
        cloudWatch: {
          prefix: "flyway",
          logGroup: logGroup,
          enabled: true
        }
      },
      encryptionKey: this.kmsKey,
      description: "Codebuild Project to apply DB changes to the Aurora MySQL instance",
      securityGroups: [this.securityGroup],
      source: Source.s3({
        bucket: props.sourceBucket,
        path: `${props.destinationKeyPrefix}/${props.destinationFileName}`
      }),
      subnetSelection: this.vpc.selectSubnets({
        subnets: this.vpc.privateSubnets
      }),
      environment: {
        buildImage: cb.LinuxBuildImage.STANDARD_5_0,
        computeType: ComputeType.SMALL,
        privileged: false,
        // These values could have been just as easily added to the buildspec.yml directly
        // the upside of adding them here is twofold:
        // - It adds the IAM policy to read the values
        // - It fails faster if the permissions have not been granted
        environmentVariables: {
          FLYWAY_URL: {
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
            value: props.dbJdbcUrl.parameterName
          },
          ADMIN_CREDS: {
            type: BuildEnvironmentVariableType.SECRETS_MANAGER,
            value: props.dbAdminSecret.secretArn
          },
          APP_USER_CREDS: {
            type: BuildEnvironmentVariableType.SECRETS_MANAGER,
            value: props.dbAppUser.secretArn
          }
        }
      }
    });

    /**
     * Needed for the Lambda trigger to resolve the project name.
     */
    new ssm.StringParameter(this, "FlywayProjectNameSSMParam", {
      parameterName: ParamNames.FLYWAY_PROJECT_NAME,
      stringValue: this.flywayProject.projectName
    });

    this.kmsKey.grantDecrypt(this.flywayProject);
    props.sourceBucket.grantRead(this.flywayProject);
    // There's a bug in Project resource where the ARNs for the SSM parameters
    // include a double slash, making the policy invalid. Thus, we need to re-add them
    props.dbJdbcUrl.grantRead(this.flywayProject);

    this.flywayProject.connections.allowTo(
      props.mysqlSecurityGroup,
      Port.tcp(3306),
      "Application access to RDS"
    );

    const codebuildTrigger = new NodejsFunction(this, "EventTrigger", {
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "handler",
      entry: path.join(__dirname, "../lambdas/codebuild-trigger/s3-trigger.ts"),
      environment: {
        TARGET_BUCKET: props.sourceBucket.bucketName,
        TARGET_KEY: `${props.destinationKeyPrefix}/${props.destinationFileName}`,
        PROJECT_NAME: this.flywayProject.projectName
      },
      bundling: {
        minify: false,
        externalModules: ["aws-sdk"]
      }
    });
    props.sourceBucket.grantRead(codebuildTrigger);
    codebuildTrigger.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["codebuild:StartBuild"],
        resources: [this.flywayProject.projectArn]
      })
    );
    props.sourceBucket.addEventNotification(
      EventType.OBJECT_CREATED_PUT,
      new LambdaDestination(codebuildTrigger)
    );
    props.sourceBucket.addEventNotification(
      EventType.OBJECT_CREATED_POST,
      new LambdaDestination(codebuildTrigger)
    );
  }
}
