import * as cdk from "@aws-cdk/core";
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import kms = require('@aws-cdk/aws-kms');
import rds = require('@aws-cdk/aws-rds');
import ssm = require('@aws-cdk/aws-ssm');
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });

    const cluster = new ecs.Cluster(this, "DemoCluster", {
      vpc: vpc
    });



    const kms_key = new kms.Key(this, 'DefaulyKey', {
      pendingWindow: cdk.Duration.days(10),
      enableKeyRotation: true,
      alias: 'alias/default'
    });

    // Create a load-balanced Fargate service and make it public
    new ecs_patterns.ApplicationLoadBalancedFargateService(this,
        "DemoApplication", {
      cluster: cluster,
      cpu: 512,
      desiredCount: 1,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry("demo/application") },
      memoryLimitMiB: 1024,
      publicLoadBalancer: true
    });

    const dbAdminCreds = new secretsmanager.Secret(this, 'DBAdminCreds', {
      secretName: '/secrets/jdbc/admin',
      encryptionKey: kms_key,
      generateSecretString: {
        secretStringTemplate: '{\\"username\\": \\"admin\\"}',
        generateStringKey: 'password',
        passwordLength: 32,
        excludeCharacters: '\\"@/\\\\',
      }
    });

    const mysql_cluster = new rds.DatabaseCluster(this, "MyRdsDb", {
      defaultDatabaseName: "MyAuroraDatabase",
      storageEncryptionKey: kms_key,
      credentials: rds.Credentials.fromSecret(dbAdminCreds),
      engine: rds.DatabaseClusterEngine.AURORA,
      instanceProps: {
        instanceType: new ec2.InstanceType(
            ec2.InstanceClass.T3
        ),
        vpc: vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE
        }
      }
    });


    new ssm.StringParameter(this, 'HostNameSSMParam', {
      parameterName: '/config/spring/data/jdbc/hostname',
      stringValue: mysql_cluster.clusterEndpoint.hostname
    });

    new ssm.StringParameter(this, 'PortSSMParam', {
      parameterName: '/config/spring/data/jdbc/port',
      stringValue: mysql_cluster.clusterEndpoint.port.toString()
    });
  }
}
