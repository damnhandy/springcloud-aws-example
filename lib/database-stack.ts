import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as kms from "aws-cdk-lib/aws-kms";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

import { ParamNames } from "./names.js";
export interface DatabaseStackProperties extends cdk.StackProps {
  readonly artifactsBucket: s3.IBucket;
  readonly endpointSecurityGroup: ec2.ISecurityGroup;
  readonly revision: string;
  readonly serviceName: string;
  readonly vpc: ec2.IVpc;
}

export class DatabaseStack extends cdk.Stack {
  public appUserCreds: secretsmanager.ISecret;
  artifactsBucket: s3.IBucket;
  public dbAdminCreds: secretsmanager.ISecret;
  public dbCluster: rds.DatabaseCluster;
  public dbUrl: ssm.IStringParameter;
  kmsKey: kms.IKey;
  vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, properties: DatabaseStackProperties) {
    super(scope, id, properties);
    if (properties.env === undefined) {
      throw new Error("props.env is undefined");
    }
    this.artifactsBucket = properties.artifactsBucket;

    this.vpc = properties.vpc;
    this.kmsKey = kms.Key.fromKeyArn(
      this,
      "KmsKeyRef",
      ssm.StringParameter.valueForStringParameter(this, ParamNames.KMS_ARN)
    );

    this.dbAdminCreds = new rds.DatabaseSecret(this, "AdminCreds", {
      encryptionKey: this.kmsKey,
      secretName: ParamNames.PG_ADMIN_SECRET,
      username: "dbadmin"
    });

    this.appUserCreds = new rds.DatabaseSecret(this, "AppuserCreds", {
      encryptionKey: this.kmsKey,
      secretName: ParamNames.DEMO_APP_USER_SECRET,
      username: "appuser"
    });

    const parameterGroup = new rds.ParameterGroup(this, "DBParameterGroup", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_2
      }),
      parameters: {
        "rds.force_ssl": "1",
        ssl: "1",
        ssl_min_protocol_version: "TLSv1.2"
      }
    });

    const securityGroup = new ec2.SecurityGroup(this, "DBSecurityGroup", {
      allowAllIpv6Outbound: false,
      allowAllOutbound: false,
      description: "Security group for Aurora Postgres",
      disableInlineRules: true,
      vpc: properties.vpc
    });

    this.dbCluster = new rds.DatabaseCluster(this, "DBCluster", {
      cloudwatchLogsExports: ["postgresql"],
      credentials: rds.Credentials.fromSecret(this.dbAdminCreds),
      defaultDatabaseName: properties.serviceName,
      deletionProtection: false,
      enableDataApi: true,
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_2
      }),
      networkType: rds.NetworkType.DUAL,
      parameterGroup: parameterGroup,
      readers: [
        rds.ClusterInstance.serverlessV2("ReaderNode1", {
          scaleWithWriter: true
        })
      ],
      securityGroups: [securityGroup],
      serverlessV2MaxCapacity: 2,
      serverlessV2MinCapacity: 0.5,
      storageEncryptionKey: this.kmsKey,
      vpc: this.vpc,
      vpcSubnets: this.vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      }),
      writer: rds.ClusterInstance.serverlessV2("WriterNode")
    });

    // this.dbCluster.addRotationSingleUser({
    //   automaticallyAfter: cdk.Duration.days(1),
    //   vpcSubnets: this.vpc.selectSubnets({
    //     subnetType: ec2.SubnetType.PRIVATE_ISOLATED
    //   }),
    //   excludeCharacters: " %+:;{}"
    // });
    this.appUserCreds.attach(this.dbCluster);
    this.dbCluster.connections.allowTo(properties.endpointSecurityGroup, ec2.Port.tcp(443));

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
  }
}
