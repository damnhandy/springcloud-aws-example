import * as cp from "child_process";
import * as path from "path";
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
import { ParamNames } from "./names";

/**
 *
 */
export interface DBMigrationConstructProps extends cdk.StageProps {
  readonly vpc: ec2.IVpc;
  readonly vpcSubnets: ec2.SubnetSelection;
  readonly encryptionKey: kms.IKey;
  readonly locations: s3assets.Asset;
  readonly database: rds.DatabaseCluster;
  readonly masterPassword: sm.ISecret;
  readonly ephemeralStorageSize?: cdk.Size;
  readonly placeholders?: { [key: string]: string };
  readonly secretPlaceHolders?: { [key: string]: sm.ISecret };
  readonly logGroup: logs.ILogGroup;
}

/**
 *
 */
export class DBMigrationConstruct extends Construct {
  public readonly response: string;
  private resolvedSecretPlaceHolders?: { [key: string]: string };
  constructor(scope: Construct, id: string, props: DBMigrationConstructProps) {
    super(scope, id);

    const securityGroup = new ec2.SecurityGroup(this, `${id}DBMigratorSecurityGroup`, {
      vpc: props.vpc,
      allowAllOutbound: false,
      allowAllIpv6Outbound: false
    });
    cdk.Tags.of(securityGroup).add("Name", `${id}DBMigratorSecurityGroup`);

    const functionDir = path.resolve(__dirname, "../flyway-lambda");
    const fn = new lambda.SingletonFunction(this, `${id}DBMigratorFunction`, {
      description: "Custom resource function to deploy schema migrations using Flyway",
      code: lambda.Code.fromAsset(functionDir, {
        bundling: {
          image: lambda.Runtime.JAVA_17.bundlingImage,
          command: [
            "/bin/sh",
            "-c",
            "./gradlew build --no-daemon && cp /asset-input/build/distributions/flyway-lambda.zip /asset-output/"
          ],
          outputType: cdk.BundlingOutput.ARCHIVED,
          local: {
            tryBundle(outputDir: string) {
              try {
                cp.execSync(`cd ${functionDir} && ./gradlew --version`);
              } catch {
                return false;
              }

              cp.execSync(`cd ${functionDir} && ./gradlew clean build`);
              cp.execSync(
                `cp ${functionDir}/build/distributions/flyway-lambda.zip ${path.join(outputDir)}`
              );
              return true;
            }
          }
        }
      }),
      tracing: lambda.Tracing.ACTIVE,
      logGroup: props.logGroup,
      loggingFormat: lambda.LoggingFormat.JSON,
      applicationLogLevelV2: lambda.ApplicationLogLevel.INFO,
      systemLogLevelV2: lambda.SystemLogLevel.INFO,
      handler: "com.damnhandy.functions.dbmigrator.DBMigratorHandler::handleRequest",
      runtime: lambda.Runtime.JAVA_17,
      ephemeralStorageSize: props.ephemeralStorageSize || cdk.Size.mebibytes(512),
      uuid: "CC2B87AC-AA48-4B81-B4E3-FE9C4AE28A2F",
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      environmentEncryption: props.encryptionKey,
      memorySize: 512,
      timeout: cdk.Duration.minutes(10),
      paramsAndSecrets: lambda.ParamsAndSecretsLayerVersion.fromVersion(
        lambda.ParamsAndSecretsVersions.V1_0_103,
        {
          cacheEnabled: true,
          cacheSize: 500,
          logLevel: lambda.ParamsAndSecretsLogLevel.WARN
        }
      ),
      allowAllOutbound: false,
      environment: {
        POWERTOOLS_LOG_LEVEL: "INFO",
        POWERTOOLS_SERVICE_NAME: "DBMigrator",
        LOG_LEVEL: "DEBUG",
        JAVA_TOOL_OPTIONS: "-Djava.net.preferIPv4Stack=true"
      }
    });

    const assetsKey = kms.Key.fromKeyArn(
      this,
      "AssetsKey",
      "arn:aws:kms:us-east-1:226350727888:key/523fea9a-b4b0-4dc1-9519-d989b14cbc73"
    );

    assetsKey.grantDecrypt(fn);
    props.encryptionKey.grantEncryptDecrypt(fn);
    props.masterPassword.grantRead(fn);
    props.locations.grantRead(fn);

    const endpointSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "EndpointSecurityGroup",
      ssm.StringParameter.valueForStringParameter(this, ParamNames.ENDPOINT_SG_ID)
    );
    fn.connections.allowTo(ec2.Peer.prefixList("pl-63a5400a"), ec2.Port.tcp(443));
    fn.connections.allowTo(endpointSecurityGroup, ec2.Port.tcp(443));
    fn.connections.allowTo(props.database, ec2.Port.tcp(props.database.clusterEndpoint.port));
    if (props.secretPlaceHolders) {
      this.resolvedSecretPlaceHolders = {};
      for (const k in props.secretPlaceHolders) {
        props.secretPlaceHolders[k].grantRead(fn);
        this.resolvedSecretPlaceHolders[k] = props.secretPlaceHolders[k].secretName;
      }
    }
    const cr = new cdk.CustomResource(this, `${id}DBMigrator`, {
      resourceType: "Custom::DBMigrator",
      serviceToken: fn.functionArn,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      properties: {
        masterSecret: props.masterPassword.secretName,
        locations: props.locations.s3ObjectUrl,
        mixed: true,
        placeHolders: props.placeholders,
        secretPlaceHolders: this.resolvedSecretPlaceHolders
      }
    });
    cr.node.addDependency(props.database);
    this.response = cr.getAtt("Response").toString();
  }
}
