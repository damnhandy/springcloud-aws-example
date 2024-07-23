import * as path from "path";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";

import * as lb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as kms from "aws-cdk-lib/aws-kms";
import * as logs from "aws-cdk-lib/aws-logs";

import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";

import { Construct } from "constructs";

import { ParamNames } from "./names";

/**
 *
 */
export interface ApplicationStackProps extends cdk.StackProps {
  readonly serviceName: string;
  readonly revision: string;
  readonly dbCluster: rds.IDatabaseCluster;
  readonly vpc: ec2.IVpc;
  readonly endpointSecurityGroup: ec2.ISecurityGroup;
  readonly logGroup: logs.ILogGroup;
  readonly appUserSecret: secretsmanager.ISecret;
}

/**
 *
 */
export class ApplicationStack extends cdk.Stack {
  appRepo: ecr.IRepository;
  vpc: ec2.IVpc;
  kmsKey: kms.IKey;

  constructor(scope: Construct, id: string, props: ApplicationStackProps) {
    super(scope, id, props);

    this.vpc = props.vpc;
    this.kmsKey = kms.Key.fromKeyArn(
      this,
      "KmsKeyRef",
      ssm.StringParameter.valueForStringParameter(this, ParamNames.KMS_ARN)
    );

    const appUserCredentials = secretsmanager.Secret.fromSecretNameV2(
      this,
      "AppUserSecret",
      ParamNames.DEMO_APP_USER_SECRET
    );

    const cluster = new ecs.Cluster(this, "DemoCluster", {
      vpc: this.vpc,
      containerInsights: true
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "DemoAppTaskDef", {
      memoryLimitMiB: 2048,
      cpu: 1024
    });

    const container = taskDefinition.addContainer("DemoAppContainer", {
      containerName: `${props.serviceName}-container`,
      image: ecs.ContainerImage.fromAsset(path.resolve(__dirname, "../springboot-app"), {
        assetName: "springboot-app"
      }),
      logging: ecs.LogDriver.awsLogs({
        logGroup: props.logGroup,
        streamPrefix: `${props.serviceName}`
      }),
      secrets: {
        DEMOAPP_DB_USERNAME: ecs.Secret.fromSecretsManager(props.appUserSecret, "username"),
        DEMOAPP_DB_PASSWORD: ecs.Secret.fromSecretsManager(props.appUserSecret, "password"),
        DEMOAPP_DB_NAME: ecs.Secret.fromSecretsManager(props.appUserSecret, "dbname"),
        DEMOAPP_DB_HOST: ecs.Secret.fromSecretsManager(props.appUserSecret, "host"),
        DEMOAPP_DB_PORT: ecs.Secret.fromSecretsManager(props.appUserSecret, "port")
      },
      environment: {
        SPRING_PROFILES_ACTIVE: "aws",
        JAVA_TOOL_OPTIONS: `-XX:InitialRAMPercentage=70 -XX:MaxRAMPercentage=70 -Dfile.encoding=UTF-8`
      }
    });
    this.kmsKey.grantEncryptDecrypt(taskDefinition.obtainExecutionRole());
    props.appUserSecret.grantRead(taskDefinition.obtainExecutionRole());
    /**
     * Expose the default HTTP endpoint for access through the ALB
     */
    container.addPortMappings({
      containerPort: 8080,
      protocol: ecs.Protocol.TCP
    });
    /**
     * Expose the actuator endpoints on 8081 which are accessible through the ALB
     */
    container.addPortMappings({
      containerPort: 8081,
      protocol: ecs.Protocol.TCP
    });

    const ecsSecurityGroup = new ec2.SecurityGroup(this, "DemoAppSecurityGroup", {
      vpc: this.vpc,
      allowAllOutbound: false,
      disableInlineRules: true
    });
    ecsSecurityGroup.connections.allowTo(props.endpointSecurityGroup, ec2.Port.tcp(443));
    ecsSecurityGroup.connections.allowTo(props.dbCluster, ec2.Port.tcp(5432));
    ecsSecurityGroup.connections.allowTo(ec2.Peer.prefixList("pl-63a5400a"), ec2.Port.tcp(443));

    const service = new ecs.FargateService(this, "DemoAppService", {
      assignPublicIp: false,
      cluster,
      taskDefinition,
      desiredCount: 1,
      securityGroups: [ecsSecurityGroup],
      vpcSubnets: this.vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      })
    });

    const alb = new lb.ApplicationLoadBalancer(this, "DemoAppAlb", {
      vpc: this.vpc,
      ipAddressType: lb.IpAddressType.IPV4,
      internetFacing: false,
      vpcSubnets: this.vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      })
    });
    /**
     * Primary HTTP port
     */
    service.connections.allowFrom(alb, ec2.Port.tcp(8080));
    /**
     * Health check endpoint
     */
    service.connections.allowFrom(alb, ec2.Port.tcp(8081));
    service.connections.allowTo(props.endpointSecurityGroup, ec2.Port.tcp(443));

    const listener = alb.addListener("DemoAppAlbListener", {
      open: true,
      protocol: lb.ApplicationProtocol.HTTP
    });

    listener.addTargets("DemoAppTargetGroup", {
      protocol: lb.ApplicationProtocol.HTTP,
      protocolVersion: lb.ApplicationProtocolVersion.HTTP1,
      targets: [
        service.loadBalancerTarget({
          containerName: container.containerName,
          containerPort: container.containerPort,
          protocol: ecs.Protocol.TCP
        })
      ],
      healthCheck: {
        interval: cdk.Duration.seconds(60),
        timeout: cdk.Duration.seconds(5),
        path: "/actuator/health/liveness",
        protocol: lb.Protocol.HTTP,
        port: "8081",
        healthyHttpCodes: "200"
      }
    });

    service.taskDefinition.defaultContainer?.addPortMappings({
      containerPort: 8081
    });

    alb.connections.allowTo(props.endpointSecurityGroup, ec2.Port.tcp(443));
    alb.connections.allowTo(service, ec2.Port.tcp(8081), "ALB Health Check");
    appUserCredentials.grantRead(service.taskDefinition.taskRole);

    this.kmsKey.grantDecrypt(service.taskDefinition.taskRole);
  }
}
