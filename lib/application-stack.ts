import * as path from "path";
import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { IVpc, Port } from "aws-cdk-lib/aws-ec2";
import { IRepository } from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { LogDriver } from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import {
  ApplicationProtocol,
  ApplicationProtocolVersion,
  Protocol
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { IKey, Key } from "aws-cdk-lib/aws-kms";
import * as logs from "aws-cdk-lib/aws-logs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";

import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

import { Construct } from "constructs";
import { LookupUtils } from "./lookup-utils";
import { ParamNames } from "./names";

/**
 *
 */
export interface ApplicationStackProps extends StackProps {
  readonly serviceName: string;
  readonly revision: string;
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

    const logGroup = new logs.LogGroup(this, "LogGroup", {
      encryptionKey: this.kmsKey,
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Create a load-balanced Fargate service and make it public
    const ecsService = new ApplicationLoadBalancedFargateService(this, "DemoApplication", {
      serviceName: props.serviceName,
      loadBalancerName: `${props.serviceName}-loadbalancer`,
      cluster,
      cpu: 512,
      desiredCount: 1,
      taskImageOptions: {
        containerName: `${props.serviceName}-container`,
        enableLogging: true,
        logDriver: LogDriver.awsLogs({
          logGroup,
          streamPrefix: `${props.serviceName}`
        }),
        image: ecs.ContainerImage.fromAsset(path.resolve(__dirname, "../springboot-app"), {
          assetName: "springboot-app"
        }),
        containerPort: 8080,
        environment: {
          SPRING_PROFILES_ACTIVE: "aws",
          JAVA_TOOL_OPTIONS:
            "-XX:InitialRAMPercentage=70 -XX:MaxRAMPercentage=70 -Dfile.encoding=UTF-8"
        }
      },
      protocol: ApplicationProtocol.HTTP,
      protocolVersion: ApplicationProtocolVersion.HTTP1,
      memoryLimitMiB: 1024,
      publicLoadBalancer: true,
      listenerPort: 80
    });
    ecsService.taskDefinition.defaultContainer?.addPortMappings({
      containerPort: 8081
    });
    ecsService.targetGroup.configureHealthCheck({
      path: "/actuator/health/liveness",
      port: "8081",
      protocol: Protocol.HTTP,
      healthyHttpCodes: "200"
    });
    ecsService.loadBalancer.connections.allowTo(
      ecsService.service,
      Port.tcp(8081),
      "ALB Health Check"
    );
    appUserCredentials.grantRead(ecsService.taskDefinition.taskRole);

    this.kmsKey.grantDecrypt(ecsService.service.taskDefinition.taskRole);
  }
}
