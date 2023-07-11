import * as path from "path";
import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { IVpc, Peer, Port, SecurityGroup, SubnetFilter } from "aws-cdk-lib/aws-ec2";
import { IRepository } from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { FargateTaskDefinition, LogDriver } from "aws-cdk-lib/aws-ecs";
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
  ApplicationProtocolVersion,
  IpAddressType,
  Protocol
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { IKey, Key } from "aws-cdk-lib/aws-kms";
import * as logs from "aws-cdk-lib/aws-logs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";

import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

import { Duration } from "aws-cdk-lib/core";
import { Construct } from "constructs";
import { LookupUtils } from "./lookup-utils";
import { ParamNames } from "./names";
import { IDatabaseCluster } from "aws-cdk-lib/aws-rds";

/**
 *
 */
export interface ApplicationStackProps extends StackProps {
  readonly serviceName: string;
  readonly revision: string;
  readonly dbCluster: IDatabaseCluster;
}

/**
 *
 */
export class ApplicationStack extends Stack {
  appRepo: IRepository;
  vpc: IVpc;
  kmsKey: IKey;

  constructor(scope: Construct, id: string, props: ApplicationStackProps) {
    super(scope, id, props);

    this.vpc = LookupUtils.vpcLookup(this, "VpcLookup");
    this.kmsKey = Key.fromKeyArn(
      this,
      "KmsKeyRef",
      StringParameter.valueForStringParameter(this, ParamNames.KMS_ARN)
    );

    const appUserCredentials = Secret.fromSecretNameV2(
      this,
      "AppUserSecret",
      ParamNames.DEMO_APP_USER_SECRET
    );

    const cluster = new ecs.Cluster(this, "DemoCluster", {
      vpc: this.vpc,
      containerInsights: true
    });

    const logGroup = LogGroup.fromLogGroupName(this, "LogGroup", `/app/${props.serviceName}`);

    const taskDefinition = new FargateTaskDefinition(this, "DemoAppTaskDef", {
      memoryLimitMiB: 2048,
      cpu: 1024
    });

    const container = taskDefinition.addContainer("DemoAppContainer", {
      containerName: `${props.serviceName}-container`,
      image: ecs.ContainerImage.fromAsset(path.resolve(__dirname, "../springboot-app"), {
        assetName: "springboot-app"
      }),
      logging: LogDriver.awsLogs({
        logGroup,
        streamPrefix: `${props.serviceName}`
      }),
      environment: {
        SPRING_PROFILES_ACTIVE: "aws",
        JAVA_TOOL_OPTIONS: `-XX:InitialRAMPercentage=70 -XX:MaxRAMPercentage=70 -Dfile.encoding=UTF-8`
      }
    });
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

    const ecsSecurityGroup = new SecurityGroup(this, "DemoAppSecurityGroup", {
      vpc: this.vpc,
      allowAllOutbound: false,
      disableInlineRules: true
    });
    ecsSecurityGroup.connections.allowTo(props.dbCluster, Port.tcp(5432));
    ecsSecurityGroup.connections.allowTo(Peer.ipv4("10.105.112.0/21"), Port.tcp(443));
    ecsSecurityGroup.connections.allowTo(Peer.ipv4("100.64.0.0/19"), Port.tcp(443));
    ecsSecurityGroup.connections.allowTo(Peer.prefixList("pl-63a5400a"), Port.tcp(443));

    const service = new ecs.FargateService(this, "DemoAppService", {
      assignPublicIp: false,
      cluster,
      taskDefinition,
      desiredCount: 1,
      securityGroups: [ecsSecurityGroup],
      vpcSubnets: this.vpc.selectSubnets({
        subnetFilters: [SubnetFilter.containsIpAddresses(["100.64.12.100", "100.64.16.100"])]
      })
    });

    const alb = new ApplicationLoadBalancer(this, "DemoAppAlb", {
      vpc: this.vpc,
      ipAddressType: IpAddressType.IPV4,
      internetFacing: false,
      vpcSubnets: this.vpc.selectSubnets({
        subnetFilters: [SubnetFilter.containsIpAddresses(["100.64.12.100", "100.64.16.100"])]
      })
    });
    /**
     * Primary HTTP port
     */
    service.connections.allowFrom(alb, Port.tcp(8080));
    /**
     * Health check endpoint
     */
    service.connections.allowFrom(alb, Port.tcp(8081));

    const listener = alb.addListener("DemoAppAlbListener", {
      open: true,
      protocol: ApplicationProtocol.HTTP
    });

    listener.addTargets("DemoAppTargetGroup", {
      protocol: ApplicationProtocol.HTTP,
      protocolVersion: ApplicationProtocolVersion.HTTP1,
      targets: [
        service.loadBalancerTarget({
          containerName: container.containerName,
          containerPort: container.containerPort,
          protocol: ecs.Protocol.TCP
        })
      ],
      healthCheck: {
        interval: Duration.seconds(60),
        timeout: Duration.seconds(5),
        path: "/actuator/health/liveness",
        protocol: Protocol.HTTP,
        port: "8081",
        healthyHttpCodes: "200"
      }
    });

    service.taskDefinition.defaultContainer?.addPortMappings({
      containerPort: 8081
    });

    alb.connections.allowTo(service, Port.tcp(8081), "ALB Health Check");
    appUserCredentials.grantRead(service.taskDefinition.taskRole);

    this.kmsKey.grantDecrypt(service.taskDefinition.taskRole);
  }
}
