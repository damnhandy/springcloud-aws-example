import * as cdk from "@aws-cdk/core";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import * as ec2 from "@aws-cdk/aws-ec2";
import { VpcStack } from "./vpc-stack";
import { FoundationStack } from "./foundation-stack";
import rds = require("@aws-cdk/aws-rds");
import ssm = require("@aws-cdk/aws-ssm");

export interface DatabaseStackProps extends cdk.StackProps {
  readonly vpcStack: VpcStack;
  readonly foundationStack: FoundationStack;
  readonly appName: string;
}

export class DatabaseStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const prefix = "DemoAppDB";

    const dbAdminCreds = new secretsmanager.Secret(this, `${prefix}AdminCreds`, {
      secretName: `/secrets/mysql/admin`,
      encryptionKey: props.foundationStack.kmsKey,
      generateSecretString: {
        secretStringTemplate: '{\\"username\\": \\"admin\\"}',
        generateStringKey: "password",
        passwordLength: 32,
        excludeCharacters: '\\"@/\\\\'
      }
    });

    const appuserCreds = new secretsmanager.Secret(this, `${prefix}AppuserAdminCreds`, {
      secretName: `/secrets/${props.appName}/appuser`,
      encryptionKey: props.foundationStack.kmsKey,
      generateSecretString: {
        secretStringTemplate: '{\\"username\\": \\"appuser\\"}',
        generateStringKey: "password",
        passwordLength: 32,
        excludeCharacters: '\\"@/\\\\'
      }
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

    const mysql_cluster = new rds.DatabaseCluster(this, `${prefix}Cluster`, {
      defaultDatabaseName: `${prefix}`,
      parameterGroup: parameter_group,
      storageEncryptionKey: props.foundationStack.kmsKey,
      credentials: rds.Credentials.fromSecret(dbAdminCreds),
      engine: rds.DatabaseClusterEngine.AURORA_MYSQL,
      s3ImportBuckets: [props.foundationStack.artifactsBucket],
      instanceProps: {
        instanceType: new ec2.InstanceType(ec2.InstanceClass.T3),
        vpc: props.vpcStack.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.ISOLATED
        }
      }
    });

    new ssm.StringParameter(this, `${prefix}HostNameSSMParam`, {
      parameterName: `/config/${props.appName}/spring/data/jdbc/hostname`,
      stringValue: mysql_cluster.clusterEndpoint.hostname
    });

    new ssm.StringParameter(this, `${prefix}PortSSMParam`, {
      parameterName: `/config/${props.appName}/spring/data/jdbc/port`,
      stringValue: mysql_cluster.clusterEndpoint.port.toString()
    });
  }
}
