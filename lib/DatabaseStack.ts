import * as cdk from "@aws-cdk/core";
import rds = require("@aws-cdk/aws-rds");
import ssm = require("@aws-cdk/aws-ssm");
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as kms from "@aws-cdk/aws-kms";
import { VpcStack } from "./VpcStack";
import { FoundationStack } from "./FoundationStack";

export interface DatabaseStackProps extends cdk.StackProps {
  readonly vpcStack: VpcStack;
  readonly foundationStack: FoundationStack;
}

export class DatabaseStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const dbAdminCreds = new secretsmanager.Secret(this, "DBAdminCreds", {
      secretName: "/secrets/jdbc/admin",
      encryptionKey: props.foundationStack.kmsKey,
      generateSecretString: {
        secretStringTemplate: '{\\"username\\": \\"admin\\"}',
        generateStringKey: "password",
        passwordLength: 32,
        excludeCharacters: '\\"@/\\\\'
      }
    });

    const appuserCreds = new secretsmanager.Secret(this, "AppUserCreds", {
      secretName: "/secrets/jdbc/appuser",
      encryptionKey: props.foundationStack.kmsKey,
      generateSecretString: {
        secretStringTemplate: '{\\"username\\": \\"admin\\"}',
        generateStringKey: "password",
        passwordLength: 32,
        excludeCharacters: '\\"@/\\\\'
      }
    });

    const mysql_cluster = new rds.DatabaseCluster(this, "MyRdsDb", {
      defaultDatabaseName: "MyAuroraDatabase",
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
      parameterName: "/config/spring/data/jdbc/hostname",
      stringValue: mysql_cluster.clusterEndpoint.hostname
    });

    new ssm.StringParameter(this, "PortSSMParam", {
      parameterName: "/config/spring/data/jdbc/port",
      stringValue: mysql_cluster.clusterEndpoint.port.toString()
    });
  }
}
