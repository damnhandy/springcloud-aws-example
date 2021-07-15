import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import { InstanceClass, InstanceSize, InstanceType } from "@aws-cdk/aws-ec2";
import { FoundationStack } from "./foundation-stack";
import * as rds from "@aws-cdk/aws-rds";
import { IDatabaseCluster } from "@aws-cdk/aws-rds";
import * as ssm from "@aws-cdk/aws-ssm";
import { IStringParameter } from "@aws-cdk/aws-ssm";
import { ISecret } from "@aws-cdk/aws-secretsmanager";
import { FlywayProject } from "./flyway-project";

export interface DatabaseStackProps extends cdk.StackProps {
  readonly foundationStack: FoundationStack;
  readonly serviceName: string;
  readonly appuserSecretName: string;
  readonly revision: string;
}

export class DatabaseStack extends cdk.Stack {
  public mysql_cluster: IDatabaseCluster;
  public dbUrl: IStringParameter;
  public dbUsername: IStringParameter;
  public dbAdminCreds: ISecret;
  public appUserCreds: ISecret;

  constructor(scope: cdk.Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);
    const prefix = "DemoAppDB";
    const dbUsername = "admin";

    this.dbAdminCreds = new rds.DatabaseSecret(this, `${prefix}AdminCreds`, {
      secretName: `/secret/mysql/admin`,
      username: dbUsername,
      encryptionKey: props.foundationStack.kmsKey
    });

    this.appUserCreds = new rds.DatabaseSecret(this, `${prefix}AppuserAdminCreds`, {
      secretName: props.appuserSecretName,
      username: "appuser",
      encryptionKey: props.foundationStack.kmsKey
    });

    const parameter_group = new rds.ParameterGroup(this, `${prefix}ParameterGroup`, {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_2_07_2
      }),
      parameters: {
        require_secure_transport: "ON",
        tls_version: "TLSv1.2"
      }
    });

    this.mysql_cluster = new rds.DatabaseCluster(this, `${prefix}Cluster`, {
      defaultDatabaseName: `${prefix}`,
      parameterGroup: parameter_group,
      storageEncryptionKey: props.foundationStack.kmsKey,
      credentials: rds.Credentials.fromSecret(this.dbAdminCreds),
      engine: rds.DatabaseClusterEngine.AURORA_MYSQL,
      s3ImportBuckets: [props.foundationStack.artifactsBucket],
      instanceProps: {
        instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.SMALL),
        vpc: props.foundationStack.networking.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE
        }
      }
    });
    this.appUserCreds.attach(this.mysql_cluster);

    new ssm.StringParameter(this, `${prefix}HostNameSSMParam`, {
      parameterName: `/config/${props.serviceName}/jdbc/hostname`,
      stringValue: this.mysql_cluster.clusterEndpoint.hostname
    });

    // hard coding the value for now. this.mysql_cluster.clusterEndpoint.port returns a number,
    // calling toString() renders float and not a reference to the RDS port value of the endpoint
    new ssm.StringParameter(this, `${prefix}PortSSMParam`, {
      parameterName: `/config/${props.serviceName}/jdbc/port`,
      stringValue: "3306"
    });

    this.dbUsername = new ssm.StringParameter(this, `${prefix}DBAdminUsername`, {
      parameterName: `/config/shared/admin/username`,
      stringValue: dbUsername
    });

    this.dbUrl = new ssm.StringParameter(this, `${prefix}JdbcUrlSSMParam`, {
      parameterName: `/config/${props.serviceName}/jdbc/url`,
      stringValue: buildJdbcUrl(this.mysql_cluster)
    });

    function buildJdbcUrl(mysql_cluster: rds.IDatabaseCluster): string {
      let jdbcUrl = `jdbc:mysql://${mysql_cluster.clusterEndpoint.hostname}:3306/demoapp`;
      return jdbcUrl;
    }

    new FlywayProject(this, "Flyway", {
      env: props.env,
      vpc: props.foundationStack.networking.vpc,
      dbJdbcUrl: this.dbUrl,
      dbPassword: this.dbAdminCreds,
      dbUsername: this.dbUsername,
      destinationKeyPrefix: "data-jobs",
      destinationFileName: "data-migration.zip",
      kmsKey: props.foundationStack.kmsKey,
      prefix: "app",
      sourceBucket: props.foundationStack.artifactsBucket,
      sourceZipPath: "../data-migration-out",
      flywayImageRepo: props.foundationStack.flywayRepo,
      revision: props.revision
    });
  }
}
