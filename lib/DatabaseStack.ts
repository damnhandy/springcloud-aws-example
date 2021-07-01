import * as cdk from "@aws-cdk/core";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import * as ec2 from "@aws-cdk/aws-ec2";
import { VpcStack } from "./VpcStack";
import { FoundationStack } from "./FoundationStack";
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

    const dbAdminCreds = new secretsmanager.Secret(this, "DBAdminCreds", {
      secretName: `/secrets/mysql/admin`,
      encryptionKey: props.foundationStack.kmsKey,
      generateSecretString: {
        secretStringTemplate: '{\\"username\\": \\"admin\\"}',
        generateStringKey: "password",
        passwordLength: 32,
        excludeCharacters: '\\"@/\\\\'
      }
    });

    const appuserCreds = new secretsmanager.Secret(this, "AppUserCreds", {
      secretName: `/secrets/${props.appName}/appuser`,
      encryptionKey: props.foundationStack.kmsKey,
      generateSecretString: {
        secretStringTemplate: '{\\"username\\": \\"appuser\\"}',
        generateStringKey: "password",
        passwordLength: 32,
        excludeCharacters: '\\"@/\\\\'
      }
    });

    const mysql_cluster = new rds.DatabaseCluster(this, "DemoAppRdsDb", {
      defaultDatabaseName: "DemoAppAuroraDatabase",
      storageEncryptionKey: props.foundationStack.kmsKey,
      credentials: rds.Credentials.fromSecret(dbAdminCreds),
      engine: rds.DatabaseClusterEngine.AURORA,
      instanceProps: {
        instanceType: new ec2.InstanceType(ec2.InstanceClass.T3),
        vpc: props.vpcStack.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE
        }
      }
    });

    new ssm.StringParameter(this, "HostNameSSMParam", {
      parameterName: `/config/${props.appName}/spring/data/jdbc/hostname`,
      stringValue: mysql_cluster.clusterEndpoint.hostname
    });

    new ssm.StringParameter(this, "PortSSMParam", {
      parameterName: `/config/${props.appName}/spring/data/jdbc/port`,
      stringValue: mysql_cluster.clusterEndpoint.port.toString()
    });
  }
}
