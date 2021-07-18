import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import { InstanceClass, InstanceSize, InstanceType, IVpc } from "@aws-cdk/aws-ec2";
import * as rds from "@aws-cdk/aws-rds";
import { IDatabaseCluster } from "@aws-cdk/aws-rds";
import * as ssm from "@aws-cdk/aws-ssm";
import { IStringParameter, StringParameter } from "@aws-cdk/aws-ssm";
import { ISecret } from "@aws-cdk/aws-secretsmanager";
import { IKey } from "@aws-cdk/aws-kms";
import * as s3 from "@aws-cdk/aws-s3";
import { IRepository } from "@aws-cdk/aws-ecr";
import { FlywayProject } from "./flyway-project";
import { ParamNames } from "./names";
import { ReferenceUtils } from "./utils";

export interface DatabaseStackProps extends cdk.StackProps {
  readonly vpc: IVpc;
  readonly artifactsBucket: s3.IBucket;
  readonly serviceName: string;
  readonly databaseName: string;
  readonly revision: string;
}

export class DatabaseStack extends cdk.Stack {
  public mysql_cluster: IDatabaseCluster;
  public dbUrl: IStringParameter;
  public dbAdminUsername: IStringParameter;
  public dbAdminCreds: ISecret;
  public appUserCreds: ISecret;
  public databaseName: string;
  kmsKey: IKey;
  artifactsBucket: s3.IBucket;
  referenceUtils: ReferenceUtils;
  flywayRepo: IRepository;

  constructor(scope: cdk.Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);
    this.artifactsBucket = props.artifactsBucket;
    this.referenceUtils = new ReferenceUtils(this, "RefUtil");

    const dbUsername = "admin";
    this.databaseName = props.databaseName;

    this.kmsKey = this.referenceUtils.findKmsKeyByParam(
      StringParameter.fromStringParameterName(this, "KmsRef", ParamNames.KMS_ARN)
    );

    this.flywayRepo = this.referenceUtils.findEcrRepoByParam(
      StringParameter.fromStringParameterName(
        this,
        "FlywatRepoRef",
        ParamNames.FLYWAY_ECR_REPO_NAME
      )
    );

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

    const parameter_group = new rds.ParameterGroup(this, "DBParameterGroup", {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_2_07_2
      }),
      parameters: {
        require_secure_transport: "ON",
        tls_version: "TLSv1.2"
      }
    });

    this.mysql_cluster = new rds.DatabaseCluster(this, "DBCluster", {
      defaultDatabaseName: this.databaseName,
      parameterGroup: parameter_group,
      storageEncryptionKey: this.kmsKey,
      credentials: rds.Credentials.fromSecret(this.dbAdminCreds),
      engine: rds.DatabaseClusterEngine.AURORA_MYSQL,
      s3ImportBuckets: [this.artifactsBucket],
      instanceProps: {
        instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.SMALL),
        vpc: props.vpc,
        publiclyAccessible: false,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE
        }
      },
      deletionProtection: false
    });

    // this.mysql_cluster.connections.allowFrom(
    //   Peer.ipv4(props.vpc.vpcCidrBlock),
    //   Port.tcp(3306),
    //   "Allow from within VPC"
    // );
    this.appUserCreds.attach(this.mysql_cluster);

    new ssm.StringParameter(this, "SecurityGroupId", {
      parameterName: ParamNames.MYSQL_SG_ID,
      stringValue: this.mysql_cluster.connections.securityGroups[0].securityGroupId
    });

    new ssm.StringParameter(this, "HostNameSSMParam", {
      parameterName: ParamNames.JDBC_HOSTNAME,
      stringValue: this.mysql_cluster.clusterEndpoint.hostname
    });

    new ssm.StringParameter(this, "ReaderHostNameSSMParam", {
      parameterName: ParamNames.JDBC_READER_HOSTNAME,
      stringValue: this.mysql_cluster.clusterReadEndpoint.hostname
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
      stringValue: buildJdbcUrl(this.mysql_cluster)
    });

    function buildJdbcUrl(mysql_cluster: rds.IDatabaseCluster): string {
      const jdbcUrl = `jdbc:mysql://${mysql_cluster.clusterEndpoint.hostname}:3306/${props.databaseName}`;
      return jdbcUrl;
    }

    new FlywayProject(this, "Flyway", {
      env: props.env,
      vpc: props.vpc,
      dbJdbcUrl: this.dbUrl,
      dbAdminSecret: this.dbAdminCreds,
      dbAppUser: this.appUserCreds,
      destinationKeyPrefix: "data-jobs",
      destinationFileName: "data-migration.zip",
      kmsKey: this.kmsKey,
      prefix: "app",
      sourceBucket: this.artifactsBucket,
      sourceZipPath: "../data-migration-out",
      flywayImageRepo: this.flywayRepo,
      mysqlSecurityGroup: this.mysql_cluster.connections.securityGroups[0],
      revision: props.revision
    });
  }
}
