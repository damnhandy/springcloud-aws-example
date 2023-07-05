import * as cp from "child_process";
import * as path from "path";
import { BundlingOutput, CustomResource, RemovalPolicy, Size, StageProps } from "aws-cdk-lib";
import { IVpc, Peer, Port, SecurityGroup, SubnetSelection } from "aws-cdk-lib/aws-ec2";
import { IKey } from "aws-cdk-lib/aws-kms";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Code, Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { DatabaseCluster, DatabaseSecret, IDatabaseCluster } from "aws-cdk-lib/aws-rds";
import * as s3assets from "aws-cdk-lib/aws-s3-assets";
import { ISecret, Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Duration } from "aws-cdk-lib/core";
import { Provider } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

/**
 *
 */
export interface DBMigrationConstructProps extends StageProps {
  readonly vpc: IVpc;
  readonly vpcSubnets: SubnetSelection;
  readonly encryptionKey: IKey;
  readonly locations: s3assets.Asset;
  readonly database: DatabaseCluster;
  readonly masterPassword: ISecret;
  readonly ephemeralStorageSize?: Size;
  readonly placeholders: { [key: string]: string };
  readonly secretPlaceHolders?: { [key: string]: ISecret };
}

/**
 *
 */
export class DBMigrationConstruct extends Construct {
  public readonly response: string;
  private resolvedSecretPlaceHolders?: { [key: string]: string };
  constructor(scope: Construct, id: string, props: DBMigrationConstructProps) {
    super(scope, id);

    const functionDir = path.resolve(__dirname, "../flyway-lambda");
    const fn = new lambda.SingletonFunction(this, `${id}DBMigratorFunction`, {
      functionName: "DBMigratorLambda",
      description: "Custom resource function to deploy schema migrations using Flyway",
      code: Code.fromAsset(functionDir, {
        bundling: {
          image: Runtime.JAVA_17.bundlingImage,
          command: [
            "/bin/sh",
            "-c",
            "./gradlew build --no-daemon && cp /asset-input/build/distributions/flyway-lambda.zip /asset-output/"
          ],
          outputType: BundlingOutput.ARCHIVED,
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
      tracing: Tracing.ACTIVE,
      handler: "com.damnhandy.functions.dbmigrator.DBMigratorHandler::handleRequest",
      runtime: Runtime.JAVA_17,
      ephemeralStorageSize: props.ephemeralStorageSize || Size.mebibytes(512),
      uuid: "CC2B87AC-AA48-4B81-B4E3-FE9C4AE28A2F",
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      environmentEncryption: props.encryptionKey,
      memorySize: 512,
      timeout: Duration.minutes(10),
      paramsAndSecrets: lambda.ParamsAndSecretsLayerVersion.fromVersion(
        lambda.ParamsAndSecretsVersions.V1_0_103,
        {
          cacheEnabled: true,
          cacheSize: 500,
          logLevel: lambda.ParamsAndSecretsLogLevel.DEBUG
        }
      ),
      allowAllOutbound: false,
      environment: {
        POWERTOOLS_LOG_LEVEL: "DEBUG",
        POWERTOOLS_SERVICE_NAME: "DBMigrator"
      }
    });
    props.encryptionKey.grantDecrypt(fn);
    props.masterPassword.grantRead(fn);
    props.locations.grantRead(fn);
    props.database.connections.allowDefaultPortFrom(fn);
    if (props.secretPlaceHolders) {
      this.resolvedSecretPlaceHolders = {};
      for (const k in props.secretPlaceHolders) {
        props.secretPlaceHolders[k].grantRead(fn);
        this.resolvedSecretPlaceHolders[k] = props.secretPlaceHolders[k].secretName;
      }
    }
    fn.connections.allowTo(Peer.ipv4("10.105.112.0/21"), Port.tcp(443));
    fn.connections.allowTo(Peer.ipv4("100.64.0.0/19"), Port.tcp(443));
    fn.connections.allowTo(Peer.prefixList("pl-63a5400a"), Port.tcp(443));

    const providerSg = new SecurityGroup(this, "ProviderSG", {
      vpc: props.vpc,
      allowAllOutbound: false,
      disableInlineRules: true
    });

    providerSg.connections.allowTo(Peer.ipv4("10.105.112.0/21"), Port.tcp(443));
    providerSg.connections.allowTo(Peer.ipv4("100.64.0.0/19"), Port.tcp(443));
    providerSg.connections.allowTo(Peer.prefixList("pl-63a5400a"), Port.tcp(443));

    const provider = new Provider(this, `${id}Provider`, {
      onEventHandler: fn,
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      providerFunctionName: "DBMigrationFunctionProvider",
      securityGroups: [providerSg]
    });
    provider.node.addDependency(props.database);

    const cr = new CustomResource(this, `${id}DBMigrator`, {
      resourceType: "Custom::DBMigrator",
      serviceToken: provider.serviceToken,
      removalPolicy: RemovalPolicy.DESTROY,
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
