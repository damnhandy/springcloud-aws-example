import * as cdk from "@aws-cdk/core";
import { RemovalPolicy } from "@aws-cdk/core";
import { IRepository } from "@aws-cdk/aws-ecr";
import { DockerImageAsset } from "@aws-cdk/aws-ecr-assets";
import {
  ApplicationProtocol,
  ApplicationProtocolVersion,
  Protocol
} from "@aws-cdk/aws-elasticloadbalancingv2";
import * as ecs from "@aws-cdk/aws-ecs";
import { LogDriver } from "@aws-cdk/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "@aws-cdk/aws-ecs-patterns";
import * as path from "path";
import * as ecrdeploy from "cdk-ecr-deployment";
import * as logs from "@aws-cdk/aws-logs";
import { RetentionDays } from "@aws-cdk/aws-logs";
import { Secret } from "@aws-cdk/aws-secretsmanager";
import { IVpc, Port } from "@aws-cdk/aws-ec2";
import { StringParameter } from "@aws-cdk/aws-ssm";
import { IKey } from "@aws-cdk/aws-kms";
import { ReferenceUtils } from "./utils";
import { ParamNames } from "./names";
import * as s3deploy from "@aws-cdk/aws-s3-deployment";
import * as s3 from "@aws-cdk/aws-s3";

/**
 *
 */
export interface ApplicationStackProps extends cdk.StackProps {
  readonly vpc: IVpc;
  readonly serviceName: string;
  readonly revision: string;
  readonly artifactsBucket: s3.IBucket;
  readonly destinationKeyPrefix: string;
  readonly destinationFileName: string;
  readonly sourceZipPath: string;
}

/**
 *
 */
export class ApplicationStack extends cdk.Stack {
  appRepo: IRepository;
  vpc: IVpc;
  kmsKey: IKey;
  referenceUtils: ReferenceUtils;

  constructor(scope: cdk.Construct, id: string, props: ApplicationStackProps) {
    super(scope, id, props);

    this.referenceUtils = new ReferenceUtils(this, "AppStackRefUtils");
    this.appRepo = this.referenceUtils.findEcrRepoByParam(
      StringParameter.fromStringParameterName(this, "EcrRef,", ParamNames.APP_ECR_REPO_NAME)
    );

    this.vpc = props.vpc;
    this.kmsKey = this.referenceUtils.findKmsKeyByParam(
      StringParameter.fromStringParameterName(this, "KmsRef2", ParamNames.KMS_ARN)
    );

    const sqlDataDeployment = new s3deploy.BucketDeployment(this, "CopySQLData", {
      sources: [s3deploy.Source.asset(path.resolve(__dirname, props.sourceZipPath))],
      destinationBucket: props.artifactsBucket,
      destinationKeyPrefix: props.destinationKeyPrefix
    });

    const appUserCredentials = Secret.fromSecretNameV2(
      this,
      "AppUserSecret",
      ParamNames.DEMO_APP_USER_SECRET
    );

    const cluster = new ecs.Cluster(this, "DemoCluster", {
      vpc: this.vpc,
      containerInsights: true
    });
    // Ensure that the S3 deployment happens BEFORE the creation of the ECS resources
    cluster.node.addDependency(sqlDataDeployment);

    const dockerImageAsset = new DockerImageAsset(this, "DemoAppContainerAsset", {
      directory: path.resolve(__dirname, "../springboot-app")
    });

    new ecrdeploy.ECRDeployment(this, "DeployDockerImage", {
      src: new ecrdeploy.DockerImageName(dockerImageAsset.imageUri),
      dest: new ecrdeploy.DockerImageName(`${this.appRepo.repositoryUri}:${props.revision}`)
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
        image: ecs.ContainerImage.fromEcrRepository(this.appRepo, props.revision),
        containerPort: 8080,
        environment: {
          SPRING_PROFILES_ACTIVE: "aws",
          JAVA_TOOL_OPTIONS:
            "-XX:InitialRAMPercentage=70 -XX:MaxRAMPercentage=70 -Dfile.encoding=UTF-8"
        }
      },
      assignPublicIp: true,
      protocol: ApplicationProtocol.HTTP,
      protocolVersion: ApplicationProtocolVersion.HTTP1,
      memoryLimitMiB: 1024,
      publicLoadBalancer: true,
      listenerPort: 8080
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

    this.referenceUtils.addToSecurityGroup({
      source: ecsService.service,
      parameterName: ParamNames.MYSQL_SG_ID,
      port: Port.tcp(3306),
      description: "Application access to RDS"
    });
  }
}
