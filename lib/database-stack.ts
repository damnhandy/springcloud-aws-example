import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as kms from "aws-cdk-lib/aws-kms";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";

import { Construct } from "constructs";
import { ParamNames } from "./names";
export interface DatabaseStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
  readonly artifactsBucket: s3.IBucket;
  readonly serviceName: string;
  readonly revision: string;
  readonly endpointSecurityGroup: ec2.ISecurityGroup;
}

export class DatabaseStack extends cdk.Stack {
  public dbCluster: rds.DatabaseCluster;
  public dbUrl: ssm.IStringParameter;
  public dbAdminCreds: secretsmanager.ISecret;
  public appUserCreds: secretsmanager.ISecret;
  kmsKey: kms.IKey;
  artifactsBucket: s3.IBucket;
  vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);
    if (props.env === undefined) {
      throw new Error("props.env is undefined");
    }
    this.artifactsBucket = props.artifactsBucket;

    this.vpc = props.vpc;
    this.kmsKey = kms.Key.fromKeyArn(
      this,
      "KmsKeyRef",
      ssm.StringParameter.valueForStringParameter(this, ParamNames.KMS_ARN)
    );

    this.dbAdminCreds = new rds.DatabaseSecret(this, "AdminCreds", {
      secretName: ParamNames.PG_ADMIN_SECRET,
      username: "dbadmin",
      encryptionKey: this.kmsKey
    });

    this.appUserCreds = new rds.DatabaseSecret(this, "AppuserCreds", {
      secretName: ParamNames.DEMO_APP_USER_SECRET,
      username: "appuser",
      encryptionKey: this.kmsKey
    });

    const parameterGroup = new rds.ParameterGroup(this, "DBParameterGroup", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_2
      }),
      parameters: {
        ssl: "1",
        // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
        ssl_min_protocol_version: "TLSv1.2",
        // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
        // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
        "rds.force_ssl": "1"
      }
    });

    const securityGroup = new ec2.SecurityGroup(this, "DBSecurityGroup", {
      vpc: props.vpc,
      allowAllOutbound: false,
      description: "Security group for Aurora Postgres",
      disableInlineRules: true,
      allowAllIpv6Outbound: false
    });

    this.dbCluster = new rds.DatabaseCluster(this, "DBCluster", {
      networkType: rds.NetworkType.DUAL,
      defaultDatabaseName: props.serviceName,
      parameterGroup: parameterGroup,
      cloudwatchLogsExports: ["postgresql"],
      enableDataApi: true,
      credentials: rds.Credentials.fromSecret(this.dbAdminCreds),
      storageEncryptionKey: this.kmsKey,
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_2
      }),
      writer: rds.ClusterInstance.serverlessV2("WriterNode"),
      serverlessV2MaxCapacity: 2,
      serverlessV2MinCapacity: 0.5,
      readers: [
        rds.ClusterInstance.serverlessV2("ReaderNode1", {
          scaleWithWriter: true
        })
      ],
      securityGroups: [securityGroup],
      deletionProtection: false,
      vpc: this.vpc,
      vpcSubnets: this.vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      })
    });

    // this.dbCluster.addRotationSingleUser({
    //   automaticallyAfter: cdk.Duration.days(1),
    //   vpcSubnets: this.vpc.selectSubnets({
    //     subnetType: ec2.SubnetType.PRIVATE_ISOLATED
    //   }),
    //   excludeCharacters: " %+:;{}"
    // });
    this.appUserCreds.attach(this.dbCluster);
    this.dbCluster.connections.allowTo(props.endpointSecurityGroup, ec2.Port.tcp(443));

    // new secretsmanager.RotationSchedule(this, "PGAppUserRotationSchedule", {
    //   secret: appuserAttachment,
    //   // the properties below are optional
    //   automaticallyAfter: cdk.Duration.days(1),
    //   hostedRotation: secretsmanager.HostedRotation.postgreSqlSingleUser({
    //     functionName: "AppUserRotation",
    //     vpc: this.vpc,
    //     vpcSubnets: this.vpc.selectSubnets({
    //       subnetType: ec2.SubnetType.PRIVATE_ISOLATED
    //     }),
    //     excludeCharacters: " %+:;{}"
    //   }),
    //   rotateImmediatelyOnUpdate: true
    // });

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

    function buildJdbcUrl(dbCluster: rds.IDatabaseCluster): string {
      return `jdbc:${dbCluster.engine?.engineType}://${dbCluster.clusterEndpoint.hostname}:${dbCluster.clusterEndpoint.port}/${props.serviceName}`;
    }
  }
}
