import { Construct, Fn } from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import { ISecurityGroup, IVpc } from "@aws-cdk/aws-ec2";
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
import * as iam from "@aws-cdk/aws-iam";
import { ServicePrincipal } from "@aws-cdk/aws-iam";

export interface FlywayProjectProps {
  readonly vpc: IVpc;
  readonly kmsKey: IKey;
  readonly prefix: string;
  readonly sourceBucket: s3.IBucket;
  readonly destinationKeyPrefix: string;
  readonly destinationFileName: string;
  readonly sourceZipPath: string;
  readonly dbPassword: ISecret;
  readonly dbUsername: IStringParameter;
  readonly dbJdbcUrl: IStringParameter;
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

    const flywayProjectPolicy = new iam.ManagedPolicy(this, "CodeBuildPolicy", {
      managedPolicyName: "flyway-codebuild-policy",
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "ecr:GetDownloadUrlForLayer",
            "ecr:BatchGetImage",
            "ecr:BatchCheckLayerAvailability"
          ],
          resources: ["*"]
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["secretsmanager:GetSecretValue"],
          resources: [props.dbPassword.secretArn]
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["kms:Decrypt", "kms:DescribeKey"],
          resources: [props.dbUsername.parameterArn, props.dbJdbcUrl.parameterArn]
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["kms:Decrypt", "kms:DescribeKey"],
          resources: [this.kmsKey.keyArn]
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:GetObject*", "s3:GetBucket*", "s3:List*"],
          resources: [
            `${props.sourceBucket.bucketArn}/${props.destinationKeyPrefix}/${props.destinationFileName}`
          ]
        })
      ]
    });

    const flywayProjectRole = new iam.Role(this, "CodeBuildProjectRole", {
      assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
      roleName: "flyway-code-build-role",
      managedPolicies: [flywayProjectPolicy]
    });

    this.flywayProject = new cb.Project(this, "CodeBuildProject", {
      vpc: this.vpc,
      encryptionKey: this.kmsKey,
      description: "Codebuild Project to apply DB changes to the Aurora MySQL instance",
      securityGroups: [this.securityGroup],
      role: flywayProjectRole,
      source: Source.s3({
        bucket: props.sourceBucket,
        path: `${props.destinationKeyPrefix}/${props.destinationFileName}`
      }),
      subnetSelection: this.vpc.selectSubnets({
        subnets: this.vpc.privateSubnets
      }),
      // Note that this isn't the ideal way to do this. It would be ideal a pre-existing image
      // can be copied to ECR instead of built at the deployment time.
      environment: {
        buildImage: cb.LinuxBuildImage.fromAsset(this, "flyway", {
          directory: path.resolve(__dirname, "../flyway-container")
        }),
        computeType: ComputeType.SMALL,
        privileged: false,
        environmentVariables: {
          // https://flywaydb.org/documentation/configuration/parameters/baselineOnMigrate
          FLYWAY_BASELINE_ON_MIGRATE: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: true
          },
          FLYWAY_LOCATIONS: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: "filesystem:./sql"
          },
          FLYWAY_URL: {
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
            value: props.dbJdbcUrl.parameterName
          },
          FLYWAY_USER: {
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
            value: props.dbUsername.parameterName
          },
          FLYWAY_PASSWORD: {
            type: BuildEnvironmentVariableType.SECRETS_MANAGER,
            value: props.dbPassword.secretName
          }
        }
      },

      buildSpec: cb.BuildSpec.fromObject({
        version: 0.2,
        phases: {
          build: {
            commands: ["flyway migrate"],
            finally: ["echo Migration complete."]
          }
        }
      })
    });

    this.kmsKey.grantDecrypt(this.flywayProject);
    props.sourceBucket.grantRead(this.flywayProject);
  }
}
