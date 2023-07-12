import * as path from "path";
import * as cdk from "aws-cdk-lib";

import { Tags } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { IVpc, SubnetFilter } from "aws-cdk-lib/aws-ec2";
import { IKey, Key } from "aws-cdk-lib/aws-kms";
import {
  AuroraPostgresEngineVersion,
  ClusterInstance,
  Credentials,
  DatabaseCluster,
  DatabaseClusterEngine,
  DatabaseSecret,
  IDatabaseCluster,
  ParameterGroup
} from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3assets from "aws-cdk-lib/aws-s3-assets";
import { ISecret, SecretRotation, SecretRotationApplication } from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { IStringParameter, StringParameter } from "aws-cdk-lib/aws-ssm";

import { Construct } from "constructs";
import { DBMigrationConstruct } from "./flyway-dbmigrator";
import { LookupUtils } from "./lookup-utils";
import { ParamNames } from "./names";
import { randomUUID } from "crypto";
import { Duration } from "aws-cdk-lib/core";
export interface DatabaseStackProps extends cdk.StackProps {
  readonly artifactsBucket: s3.IBucket;
  readonly serviceName: string;
  readonly revision: string;
}

export class DatabaseStack extends cdk.Stack {
  public dbCluster: DatabaseCluster;
  public dbUrl: IStringParameter;
  public dbAdminCreds: ISecret;
  public appUserCreds: ISecret;
  kmsKey: IKey;
  artifactsBucket: s3.IBucket;
  vpc: IVpc;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);
    if (props.env === undefined) {
      throw new Error("props.env is undefined");
    }
    this.artifactsBucket = props.artifactsBucket;

    this.vpc = LookupUtils.vpcLookup(this, "VpcLookup");
    this.kmsKey = Key.fromKeyArn(
      this,
      "KmsKeyRef",
      StringParameter.valueForStringParameter(this, ParamNames.KMS_ARN)
    );

    this.dbAdminCreds = new DatabaseSecret(this, "AdminCreds", {
      secretName: ParamNames.PG_ADMIN_SECRET,
      username: "postgres",
      encryptionKey: this.kmsKey
    });

    this.appUserCreds = new DatabaseSecret(this, "AppuserAdminCreds", {
      secretName: ParamNames.DEMO_APP_USER_SECRET,
      username: "appuser",
      encryptionKey: this.kmsKey
    });
    Tags.of(this.appUserCreds).add("gs:Test", "Appuser");

    // @ts-ignore
    const parameterGroup = new ParameterGroup(this, "DBParameterGroup", {
      engine: DatabaseClusterEngine.auroraPostgres({
        version: AuroraPostgresEngineVersion.VER_15_2
      }),
      parameters: {
        ssl: "1",
        // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
        ssl_min_protocol_version: "TLSv1.2",
        // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
        // Use this for Aurora MySQL
        //require_secure_transport: "ON",
        // Use this for Aurora Postgres
        // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
        "rds.force_ssl": "1"
      }
    });

    this.dbCluster = new DatabaseCluster(this, "DBCluster", {
      defaultDatabaseName: props.serviceName,
      clusterIdentifier: `${props.serviceName}-cluster`,
      parameterGroup: parameterGroup,
      credentials: Credentials.fromSecret(this.dbAdminCreds),
      storageEncryptionKey: this.kmsKey,
      engine: DatabaseClusterEngine.auroraPostgres({
        version: AuroraPostgresEngineVersion.VER_15_2
      }),
      writer: ClusterInstance.provisioned("WriterNode", {
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MEDIUM)
      }),
      readers: [
        ClusterInstance.provisioned("ReaderNode1", {
          instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MEDIUM)
        })
      ],
      deletionProtection: false,
      vpc: this.vpc,
      vpcSubnets: this.vpc.selectSubnets({
        subnetFilters: [SubnetFilter.containsIpAddresses(["100.64.12.100", "100.64.16.100"])]
      })
    });

    this.dbCluster.addRotationSingleUser({
      automaticallyAfter: Duration.days(1),
      vpcSubnets: this.vpc.selectSubnets({
        subnetFilters: [SubnetFilter.containsIpAddresses(["100.64.12.1"])]
      }),
      excludeCharacters: " %+:;{}"
    });
    this.appUserCreds.attach(this.dbCluster);

    new SecretRotation(this, "PGAppUserSecretRotation", {
      application: SecretRotationApplication.POSTGRES_ROTATION_SINGLE_USER,
      secret: this.appUserCreds,
      target: this.dbCluster,
      vpc: this.vpc,
      vpcSubnets: this.vpc.selectSubnets({
        subnetFilters: [SubnetFilter.containsIpAddresses(["100.64.12.1"])]
      }),
      excludeCharacters: " %+:;{}"
    });

    new ssm.StringParameter(this, "SecurityGroupId", {
      parameterName: ParamNames.PG_SG_ID,
      stringValue: this.dbCluster.connections.securityGroups[0].securityGroupId
    });

    new ssm.StringParameter(this, "HostNameSSMParam", {
      parameterName: ParamNames.JDBC_HOSTNAME,
      stringValue: this.dbCluster.clusterEndpoint.hostname
    });

    new ssm.StringParameter(this, "ReaderHostNameSSMParam", {
      parameterName: ParamNames.JDBC_READER_HOSTNAME,
      stringValue: this.dbCluster.clusterReadEndpoint.hostname
    });

    new ssm.StringParameter(this, "PortSSMParam", {
      parameterName: ParamNames.JDBC_PORT,
      stringValue: `${this.dbCluster.clusterEndpoint.port}`
    });

    this.dbUrl = new ssm.StringParameter(this, "JdbcUrlSSMParam", {
      parameterName: ParamNames.JDBC_URL,
      stringValue: buildJdbcUrl(this.dbCluster)
    });

    const dbMigrator = new DBMigrationConstruct(this, "DBMigrate", {
      vpc: this.vpc,
      vpcSubnets: this.vpc.selectSubnets({
        subnetFilters: [SubnetFilter.containsIpAddresses(["100.64.8.100"])]
      }),
      database: this.dbCluster,
      masterPassword: this.dbCluster.secret || this.dbAdminCreds,
      encryptionKey: this.kmsKey,
      locations: new s3assets.Asset(this, `DataMigrationAssets${randomUUID()}`, {
        deployTime: false,
        path: path.resolve(__dirname, "../data-migration/sql")
      }),
      placeholders: {
        appuser: "appuser"
      },
      secretPlaceHolders: {
        appuserSecret: this.appUserCreds
      }
    });

    function buildJdbcUrl(dbCluster: IDatabaseCluster): string {
      return `jdbc:${dbCluster.engine?.engineType}://${dbCluster.clusterEndpoint.hostname}:${dbCluster.clusterEndpoint.port}/${props.serviceName}`;
    }
  }
}
