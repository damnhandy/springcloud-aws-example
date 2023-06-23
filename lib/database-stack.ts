import * as cdk from "aws-cdk-lib";
import { triggers } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { InstanceClass, InstanceSize, InstanceType, IVpc } from "aws-cdk-lib/aws-ec2";
import { IRepository } from "aws-cdk-lib/aws-ecr";
import { IKey } from "aws-cdk-lib/aws-kms";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as rds from "aws-cdk-lib/aws-rds";
import { IDatabaseCluster } from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { IStringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { FlywayProject } from "./flyway-project";
import { ParamNames } from "./names";
import { ReferenceUtils } from "./utils";
export interface DatabaseStackProps extends cdk.StackProps {
  readonly vpc: IVpc;
  readonly kmsKey: IKey;
  readonly artifactsBucket: s3.IBucket;
  readonly serviceName: string;
  readonly revision: string;
  readonly destinationKeyPrefix: string;
  readonly destinationFileName: string;
  readonly sourceZipPath: string;
}

export class DatabaseStack extends cdk.Stack {
  public dbCluster: IDatabaseCluster;
  public dbUrl: IStringParameter;
  public dbAdminUsername: IStringParameter;
  public dbAdminCreds: ISecret;
  public appUserCreds: ISecret;
  kmsKey: IKey;
  artifactsBucket: s3.IBucket;
  referenceUtils: ReferenceUtils;
  flywayRepo: IRepository;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id);
    this.artifactsBucket = props.artifactsBucket;
    const dbUsername = "admin";

    this.kmsKey = props.kmsKey;

    this.dbAdminCreds = new rds.DatabaseSecret(this, "AdminCreds", {
      secretName: ParamNames.MYSQL_ADMIN_SECRET,
      username: dbUsername,
      encryptionKey: this.kmsKey
    });

    this.appUserCreds = new rds.DatabaseSecret(this, "AppuserAdminCreds", {
      secretName: ParamNames.DEMO_APP_USER_SECRET,
      username: "appuser",
      encryptionKey: this.kmsKey
    });

    const parameterGroup = new rds.ParameterGroup(this, "DBParameterGroup", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_2
      }),
      parameters: {
        // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
        require_secure_transport: "ON",
        // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
        tls_version: "TLSv1.2"
      }
    });

    this.dbCluster = new rds.DatabaseCluster(this, "DBCluster", {
      defaultDatabaseName: props.serviceName,
      parameterGroup: parameterGroup,
      storageEncryptionKey: this.kmsKey,
      credentials: rds.Credentials.fromSecret(this.dbAdminCreds),
      engine: rds.DatabaseClusterEngine.AURORA_POSTGRESQL,
      s3ImportBuckets: [this.artifactsBucket],
      instanceProps: {
        instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.SMALL),
        vpc: props.vpc,
        publiclyAccessible: false,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        }
      },
      deletionProtection: false
    });

    this.appUserCreds.attach(this.dbCluster);

    new ssm.StringParameter(this, "SecurityGroupId", {
      parameterName: ParamNames.MYSQL_SG_ID,
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

    // hard coding the value for now. this.mysql_cluster.clusterEndpoint.port returns a number,
    // calling toString() renders float and not a reference to the RDS port value of the endpoint
    new ssm.StringParameter(this, "PortSSMParam", {
      parameterName: ParamNames.JDBC_PORT,
      stringValue: "3306"
    });

    this.dbAdminUsername = new ssm.StringParameter(this, "DBAdminUsername", {
      parameterName: ParamNames.MYSQL_ADMIN_SECRET,
      stringValue: dbUsername
    });

    this.dbUrl = new ssm.StringParameter(this, "JdbcUrlSSMParam", {
      parameterName: ParamNames.JDBC_URL,
      stringValue: buildJdbcUrl(this.dbCluster)
    });

    function buildJdbcUrl(dbCluster: rds.IDatabaseCluster): string {
      return `jdbc:mysql://${dbCluster.clusterEndpoint.hostname}:3306/${props.serviceName}`;
    }

    const dbTriggerFunction = new triggers.TriggerFunction(this, "MyTrigger", {
      runtime: lambda.Runtime.JAVA_17,
      handler: "index.handler",
      code: lambda.Code.fromAsset(`${__dirname}/my-trigger`)
    });
    dbTriggerFunction.executeAfter(this.dbCluster);

    new FlywayProject(this, "Flyway", {
      env: props.env,
      vpc: props.vpc,
      dbJdbcUrl: this.dbUrl,
      dbAdminSecret: this.dbAdminCreds,
      dbAppUser: this.appUserCreds,
      destinationKeyPrefix: props.destinationKeyPrefix,
      destinationFileName: props.destinationFileName,
      sourceZipPath: props.sourceZipPath,
      kmsKey: this.kmsKey,
      prefix: "app",
      sourceBucket: this.artifactsBucket,
      flywayImageRepo: this.flywayRepo,
      mysqlSecurityGroup: this.dbCluster.connections.securityGroups[0],
      revision: props.revision
    });
  }
}
