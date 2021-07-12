import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as cb from "@aws-cdk/aws-codebuild";
import * as iam from "@aws-cdk/aws-iam";
import { ComputeType, Source } from "@aws-cdk/aws-codebuild";
import { VpcStack } from "./vpc-stack";
import { FoundationStack } from "./foundation-stack";
import * as ecr_assets from "@aws-cdk/aws-ecr-assets";
import * as s3deploy from "@aws-cdk/aws-s3-deployment";
import { DatabaseStack } from "./database-stack";

export interface DataMigrationStackProps extends cdk.StackProps {
  readonly vpcStack: VpcStack;
  readonly foundationStack: FoundationStack;
  readonly databaseStack: DatabaseStack;
  readonly appName: string;
}

export class DataMigrationStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: DataMigrationStackProps) {
    super(scope, id, props);

    const prefix = "Data";

    const container = new ecr_assets.DockerImageAsset(this, `${prefix}FlywayContainer`, {
      directory: "flyway-container",
      target: `apps/flyway`
    });

    const dataMigrationAsset = new s3deploy.BucketDeployment(this, "CopySQLData", {
      sources: [s3deploy.Source.asset("data-migration.zip")],
      destinationBucket: props.foundationStack.artifactsBucket,
      destinationKeyPrefix: "data-jobs"
    });



    const securityGroup = new ec2.SecurityGroup(this, "SecurityGroup1", {
      allowAllOutbound: true,
      description: "Security Group for the Flyway project",
      securityGroupName: "FlywayProjectSG",
      vpc: props.vpcStack.vpc
    });

    props.databaseStack.mysql_cluster.connections.allowDefaultPortFrom(securityGroup);

    const flywayProject = new cb.Project(this, `${prefix}FlywayProject`, {
      vpc: props.vpcStack.vpc,
      encryptionKey: props.foundationStack.kmsKey,
      description: "Codebuild Project to apply DB changes to the Aurora MySQL instance",
      securityGroups: [securityGroup],
      source: Source.s3({
        bucket: props.foundationStack.artifactsBucket,
        path: "data_jobs/data-migration.zip"
      }),
      subnetSelection: props.vpcStack.vpc.selectSubnets({
        subnets: props.vpcStack.vpc.privateSubnets
      }),
      environment: {
        buildImage: cb.LinuxBuildImage.fromAsset(this, "apps/flyway", {
          directory: "flyway-container"
        }),
        computeType: ComputeType.SMALL,
        privileged: false
      },
      buildSpec: cb.BuildSpec.fromObject({
        version: 0.2,
        env: {
          variables: {
            // https://flywaydb.org/documentation/configuration/parameters/baselineOnMigrate
            FLYWAY_BASELINE_ON_MIGRATE: true,
            FLYWAY_LOCATIONS: "filesystem:./sql"
          },
          "parameter-store": {
            FLYWAY_URL: `/config/${props.appName}/spring/data/jdbc/url`,
            FLYWAY_USER: "/config/shared/admin/username"
          },
          "secrets-manager": {
            FLYWAY_PASSWORD: "/secrets/mysql/admin"
          }
        },
        phases: {
          build: {
            commands: ["flyway migrate"],
            finally: ["echo Migration complete."]
          }
        }
      })
    });

    props.foundationStack.kmsKey.grantDecrypt(flywayProject);
    props.foundationStack.artifactsBucket.grantRead(flywayProject);
  }
}
