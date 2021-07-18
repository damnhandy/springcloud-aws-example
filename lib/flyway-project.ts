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
import * as s3deploy from "@aws-cdk/aws-s3-deployment";
import { ISecret } from "@aws-cdk/aws-secretsmanager";
import { IStringParameter } from "@aws-cdk/aws-ssm";
import * as ecrdeploy from "cdk-ecr-deployment";
import { IRepository } from "@aws-cdk/aws-ecr";
import * as ecr_assets from "@aws-cdk/aws-ecr-assets";
import * as logs from "@aws-cdk/aws-logs";
import { RetentionDays } from "@aws-cdk/aws-logs";
import * as lambda from "@aws-cdk/aws-lambda";
//import { S3EventSource } from "@aws-cdk/aws-lambda-event-sources";
// import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import { ReferenceUtils } from "./utils";

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
  readonly revision: string;
}

export class FlywayProject extends Construct {
  vpc: IVpc;
  kmsKey: IKey;
  securityGroup: ISecurityGroup;
  flywayProject: IProject;
  referenceUtils: ReferenceUtils;

  constructor(scope: Construct, id: string, props: FlywayProjectProps) {
    super(scope, id);
    this.vpc = props.vpc;
    this.kmsKey = props.kmsKey;
    this.referenceUtils = new ReferenceUtils(this, "RefUtil");

    new s3deploy.BucketDeployment(this, "CopySQLData", {
      sources: [s3deploy.Source.asset(path.resolve(__dirname, props.sourceZipPath))],
      destinationBucket: props.sourceBucket,
      destinationKeyPrefix: props.destinationKeyPrefix
    });

    this.securityGroup = new ec2.SecurityGroup(this, "ProjectSecurityGroup", {
      allowAllOutbound: true,
      description: "Security Group for the Flyway CodeBuild project",
      securityGroupName: "FlywayCodeBuildProjectSG",
      vpc: this.vpc
    });

    const flywayContainer = new ecr_assets.DockerImageAsset(this, "FlywayContainerAsset", {
      directory: path.resolve(__dirname, "../flyway-container")
    });

    new ecrdeploy.ECRDeployment(this, "FlywayImageDeploymentTagged", {
      src: new ecrdeploy.DockerImageName(flywayContainer.imageUri),
      dest: new ecrdeploy.DockerImageName(
        `${props.flywayImageRepo.repositoryUri}:${props.revision}`
      )
    });

    new ecrdeploy.ECRDeployment(this, "FlywayImageDeploymentLatestTag", {
      src: new ecrdeploy.DockerImageName(flywayContainer.imageUri),
      dest: new ecrdeploy.DockerImageName(`${props.flywayImageRepo.repositoryUri}:latest`)
    });

    const logGroup = new logs.LogGroup(this, "LogGroup", {
      encryptionKey: this.kmsKey,
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.RETAIN
    });

    // const myFunction = new NodejsFunction(this, "EventTrigger", {
    //   memorySize: 1024,
    //   timeout: cdk.Duration.seconds(5),
    //   runtime: lambda.Runtime.NODEJS_14_X,
    //   handler: "main",
    //   entry: path.join(__dirname, `/../src/my-lambda/index.ts`),
    //   bundling: {
    //     minify: true,
    //     externalModules: ["aws-sdk"]
    //   }
    // });

    const handler = new lambda.Function(this, "EventTrigger", {
      runtime: lambda.Runtime.NODEJS_14_X,
      logRetention: RetentionDays.ONE_WEEK,
      code: lambda.Code.fromAsset(path.join(__dirname, "../lambdas")),
      handler: "s3-trigger.handler",
      environment: {
        BUCKET: props.sourceBucket.bucketName
      }
    });
    // const s3EventSource = new S3EventSource(props.sourceBucket, {
    //   events: [s3.EventType.OBJECT_CREATED, s3.EventType.OBJECT_CREATED_PUT],
    //   filters: [{ prefix: "data-jobs/" }]
    // });
    // handler.addEventSource(s3EventSource);

    this.flywayProject = new cb.Project(this, "CodeBuildProject", {
      vpc: this.vpc,
      logging: {
        cloudWatch: {
          prefix: "flyway",
          logGroup,
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

    this.kmsKey.grantDecrypt(this.flywayProject);
    props.sourceBucket.grantRead(this.flywayProject);
    // There's a bug in Project resource where the ARNs for the SSM parameters
    // include a double slash, making the policy invalid. Thus, we need to re-add them
    props.dbJdbcUrl.grantRead(this.flywayProject);
    // One would think that the statement below would also make sense. However, the CDK will
    // error out citing:
    //
    // Adding this dependency (SpringBootDemoFoundationStack ->
    // SpringBootDemoAppDBStack/Flyway/CodeBuildProject/Role/Resource.Arn) would create a
    // cyclic reference.
    //
    // thus, we leave this commented out:
    // props.dbPassword.grantRead(this.flywayProject);

    this.referenceUtils.addToSecurityGroup({
      source: this.flywayProject,
      parameterName: "/env/rds/DemoAppDB",
      port: Port.tcp(3306),
      description: "Application access to RDS"
    });
  }
}
