import * as cdk from "@aws-cdk/core";
import { RemovalPolicy } from "@aws-cdk/core";
import { IRepository } from "@aws-cdk/aws-ecr";
import * as ecr_assets from "@aws-cdk/aws-ecr-assets";
import { FoundationStack } from "./foundation-stack";
import { Protocol } from "@aws-cdk/aws-elasticloadbalancingv2";
import * as ecs from "@aws-cdk/aws-ecs";
import { LogDriver } from "@aws-cdk/aws-ecs";
import * as ecs_patterns from "@aws-cdk/aws-ecs-patterns";
import * as path from "path";
import * as ecrdeploy from "cdk-ecr-deployment";
import * as logs from "@aws-cdk/aws-logs";
import { RetentionDays } from "@aws-cdk/aws-logs";
import { Secret } from "@aws-cdk/aws-secretsmanager";
import { Port, SecurityGroup } from "@aws-cdk/aws-ec2";
import { StringParameter } from "@aws-cdk/aws-ssm";

/**
 *
 */
export interface ApplicationStackProps extends cdk.StackProps {
  readonly foundationStack: FoundationStack;
  readonly serviceName: string;
  readonly appuserSecretName: string;
  readonly revision: string;
}

/**
 *
 */
export class ApplicationStack extends cdk.Stack {
  appRepo: IRepository;

  constructor(scope: cdk.Construct, id: string, props: ApplicationStackProps) {
    super(scope, id, props);
    this.appRepo = props.foundationStack.appRepo;

    const appUserCredentials = Secret.fromSecretNameV2(
      this,
      "AppUserSecret",
      props.appuserSecretName
    );

    const cluster = new ecs.Cluster(this, "DemoCluster", {
      vpc: props.foundationStack.networking.vpc,
      containerInsights: true
    });

    const dockerImageAsset = new ecr_assets.DockerImageAsset(this, "DemoAppContainerAsset", {
      directory: path.resolve(__dirname, "../springboot-app")
    });

    new ecrdeploy.ECRDeployment(this, "DeployDockerImage", {
      src: new ecrdeploy.DockerImageName(dockerImageAsset.imageUri),
      dest: new ecrdeploy.DockerImageName(`${this.appRepo.repositoryUri}:${props.revision}`)
    });

    const logGroup = new logs.LogGroup(this, "LogGroup", {
      encryptionKey: props.foundationStack.kmsKey,
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Create a load-balanced Fargate service and make it public
    const ecsService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      "DemoApplication",
      {
        serviceName: props.serviceName,
        loadBalancerName: `${props.serviceName}-loadbalancer`,
        cluster: cluster,
        cpu: 512,
        desiredCount: 1,
        taskImageOptions: {
          containerName: `${props.serviceName}-container`,
          enableLogging: true,
          logDriver: LogDriver.awsLogs({
            logGroup: logGroup,
            streamPrefix: `${props.serviceName}`
          }),
          image: ecs.ContainerImage.fromEcrRepository(this.appRepo, props.revision),
          containerPort: 8080,
          environment: {
            SPRING_PROFILES_ACTIVE: "aws",
            JAVA_TOOL_OPTIONS:
              "-XX:InitialRAMPercentage=70 -XX:MaxRAMPercentage=70 -Dfile.encoding=UTF-8"
          }
        },
        memoryLimitMiB: 1024,
        publicLoadBalancer: true,
        listenerPort: 8080
      }
    );

    ecsService.targetGroup.configureHealthCheck({
      path: "/actuator/health/liveness",
      port: "8081",
      protocol: Protocol.HTTP,
      healthyHttpCodes: "200"
    });
    appUserCredentials.grantRead(ecsService.taskDefinition.taskRole);
    dockerImageAsset.repository.grantPull(ecsService.taskDefinition.taskRole);
    props.foundationStack.kmsKey.grantDecrypt(ecsService.service.taskDefinition.taskRole);
    const rdsSecurityGroupParam = StringParameter.fromStringParameterName(
      this,
      "DBSecurityGroupParam",
      "/env/rds/DemoAppDB"
    );
    const dbSg = SecurityGroup.fromSecurityGroupId(
      this,
      "DBSecurityuGroup",
      rdsSecurityGroupParam.stringValue
    );
    ecsService.service.connections.allowTo(dbSg, Port.tcp(3306), "Access to RDS");
  }
}
