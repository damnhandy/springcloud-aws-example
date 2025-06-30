import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as kms from "aws-cdk-lib/aws-kms";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3assets from "aws-cdk-lib/aws-s3-assets";
import * as sm from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import * as cp from "node:child_process";
import path from "node:path";

import { ParamNames as ParameterNames } from "./names.js";

/**
 *
 */
export interface DBMigrationConstructProperties extends cdk.StageProps {
  readonly database: rds.DatabaseCluster;
  readonly encryptionKey: kms.IKey;
  readonly ephemeralStorageSize?: cdk.Size;
  readonly locations: s3assets.Asset;
  readonly logGroup: logs.ILogGroup;
  readonly masterPassword: sm.ISecret;
  readonly placeholders?: Record<string, string>;
  readonly secretPlaceHolders?: Record<string, sm.ISecret>;
  readonly vpc: ec2.IVpc;
  readonly vpcSubnets: ec2.SubnetSelection;
}

/**
 *
 */
export class DBMigrationConstruct extends Construct {
  public readonly response: string;
  private resolvedSecretPlaceHolders?: Record<string, string>;
  constructor(scope: Construct, id: string, properties: DBMigrationConstructProperties) {
    super(scope, id);

    const securityGroup = new ec2.SecurityGroup(this, `${id}DBMigratorSecurityGroup`, {
      allowAllIpv6Outbound: false,
      allowAllOutbound: false,
      vpc: properties.vpc
    });
    cdk.Tags.of(securityGroup).add("Name", `${id}DBMigratorSecurityGroup`);

    const functionDir = path.resolve(import.meta.dirname, "../flyway-lambda");
    const function_ = new lambda.SingletonFunction(this, `${id}DBMigratorFunction`, {
      allowAllOutbound: false,
      applicationLogLevelV2: lambda.ApplicationLogLevel.INFO,
      code: lambda.Code.fromAsset(functionDir, {
        bundling: {
          command: [
            "/bin/sh",
            "-c",
            "./gradlew build -x test --no-daemon && cp /asset-input/build/distributions/flyway-lambda.zip /asset-output/"
          ],
          image: lambda.Runtime.JAVA_21.bundlingImage,
          local: {
            tryBundle(outputDir: string) {
              try {
                cp.execSync(`cd ${functionDir} && ./gradlew --version`);
              } catch {
                return false;
              }

              cp.execSync(`cd ${functionDir} && ./gradlew clean build -x test --no-daemon`);
              cp.execSync(
                `cp ${functionDir}/build/distributions/flyway-lambda.zip ${path.join(outputDir)}`
              );
              return true;
            }
          },
          outputType: cdk.BundlingOutput.ARCHIVED
        }
      }),
      description: "Custom resource function to deploy schema migrations using Flyway",
      environment: {
        JAVA_TOOL_OPTIONS: "-Djava.net.preferIPv4Stack=true",
        LOG_LEVEL: "DEBUG",
        POWERTOOLS_LOG_LEVEL: "INFO",
        POWERTOOLS_SERVICE_NAME: "DBMigrator"
      },
      environmentEncryption: properties.encryptionKey,
      ephemeralStorageSize: properties.ephemeralStorageSize ?? cdk.Size.mebibytes(512),
      handler: "com.damnhandy.functions.dbmigrator.DBMigratorHandler::handleRequest",
      loggingFormat: lambda.LoggingFormat.JSON,
      logGroup: properties.logGroup,
      memorySize: 512,
      paramsAndSecrets: lambda.ParamsAndSecretsLayerVersion.fromVersion(
        lambda.ParamsAndSecretsVersions.V1_0_103,
        {
          cacheEnabled: true,
          cacheSize: 500,
          logLevel: lambda.ParamsAndSecretsLogLevel.WARN
        }
      ),
      runtime: lambda.Runtime.JAVA_17,
      systemLogLevelV2: lambda.SystemLogLevel.INFO,
      timeout: cdk.Duration.minutes(10),
      tracing: lambda.Tracing.ACTIVE,
      uuid: "CC2B87AC-AA48-4B81-B4E3-FE9C4AE28A2F",
      vpc: properties.vpc,
      vpcSubnets: properties.vpcSubnets
    });

    const assetsKey = kms.Key.fromKeyArn(
      this,
      "AssetsKey",
      "arn:aws:kms:us-east-1:226350727888:key/523fea9a-b4b0-4dc1-9519-d989b14cbc73"
    );

    assetsKey.grantDecrypt(function_);
    properties.encryptionKey.grantEncryptDecrypt(function_);
    properties.masterPassword.grantRead(function_);
    properties.locations.grantRead(function_);

    const endpointSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "EndpointSecurityGroup",
      ssm.StringParameter.valueForStringParameter(this, ParameterNames.ENDPOINT_SG_ID)
    );
    function_.connections.allowTo(ec2.Peer.prefixList("pl-63a5400a"), ec2.Port.tcp(443));
    function_.connections.allowTo(endpointSecurityGroup, ec2.Port.tcp(443));
    function_.connections.allowTo(
      properties.database,
      ec2.Port.tcp(properties.database.clusterEndpoint.port)
    );
    if (properties.secretPlaceHolders) {
      this.resolvedSecretPlaceHolders = {};
      for (const k in properties.secretPlaceHolders) {
        properties.secretPlaceHolders[k].grantRead(function_);
        this.resolvedSecretPlaceHolders[k] = properties.secretPlaceHolders[k].secretName;
      }
    }
    const cr = new cdk.CustomResource(this, `${id}DBMigrator`, {
      properties: {
        locations: properties.locations.s3ObjectUrl,
        masterSecret: properties.masterPassword.secretName,
        mixed: true,
        placeHolders: properties.placeholders,
        secretPlaceHolders: this.resolvedSecretPlaceHolders
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      resourceType: "Custom::DBMigrator",
      serviceToken: function_.functionArn
    });
    cr.node.addDependency(properties.database);
    this.response = cr.getAtt("Response").toString();
  }
}
