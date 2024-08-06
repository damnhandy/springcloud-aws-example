#!/usr/bin/env node
import "source-map-support/register";
import * as cp from "child_process";
import { AppStagingSynthesizer } from "@aws-cdk/app-staging-synthesizer-alpha";
import * as cdk from "aws-cdk-lib";
import { PrototypeStagingStack } from "../lib/app-staging-stack";
import { ApplicationServiceStack } from "../lib/application-service-stack";
import { ApplicationStack } from "../lib/application-stack";
import { DatabaseStack } from "../lib/database-stack";
import { EC2TesterStack } from "../lib/ec2-host";
import { FoundationStack } from "../lib/foundation-stack";
import { SqlStack } from "../lib/sql-stack";
import { VpcStack } from "../lib/vpc-stack";
// Note that this value Should be the same as the value defined in spring.application.name
const serviceName = "demoapp";

/**
 *
 */
const revision = `git-${cp.execSync("git rev-parse HEAD").toString().trim()}`;

const app = new cdk.App({
  defaultStackSynthesizer: AppStagingSynthesizer.customFactory({
    factory: PrototypeStagingStack.factory({
      appId: "demoapp",
      imageAssetVersionCount: 10,
      maxImageAge: 30,
      autoDeleteStagingAssets: false
    }),
    oncePerEnv: true
  })
});

const serviceNetworkArn = app.node.tryGetContext("serviceNetworkArn");

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

const foundationStack = new FoundationStack(app, "FoundationStack", {
  env: env,
  serviceName: serviceName,
  revision: revision
});

const vpcStack = new VpcStack(app, "VpcStack", {
  env: env,
  ipv4Cidr: "10.4.0.0/16",
  serviceNetworkArn: serviceNetworkArn
});
new EC2TesterStack(app, "EC2TesterStack", {
  env: env,
  vpc: vpcStack.vpc,
  endpointSecurityGroup: vpcStack.endpointSecurityGroup
});

const dbStack = new DatabaseStack(app, "DatabasePostgresStack", {
  env: env,
  artifactsBucket: foundationStack.artifactsBucket,
  revision: revision,
  serviceName: serviceName,
  vpc: vpcStack.vpc,
  endpointSecurityGroup: vpcStack.endpointSecurityGroup
});
dbStack.addDependency(foundationStack);

const sqlStack = new SqlStack(app, "SqlStack", {
  env: env,
  logGroup: foundationStack.flywayLogGroup,
  dbCluster: dbStack.dbCluster,
  vpc: vpcStack.vpc,
  encryptionKey: foundationStack.kmsKey,
  dbMasterCreds: dbStack.dbAdminCreds,
  placeholders: {
    // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
    appuser_username: "appuser"
  },
  secretPlaceHolders: {
    // eslint-disable-next-line @typescript-eslint/naming-convention, camelcase
    appuser_secret: dbStack.appUserCreds
  }
});
sqlStack.addDependency(dbStack);

const appStack = new ApplicationStack(app, "SpringBootDemoAppStack", {
  env: env,
  serviceName: serviceName,
  logGroup: foundationStack.appLogGroup,
  revision: revision,
  dbCluster: dbStack.dbCluster,
  endpointSecurityGroup: vpcStack.endpointSecurityGroup,
  vpc: vpcStack.vpc,
  appUserSecret: dbStack.appUserCreds,
  serviceNetworkArn: serviceNetworkArn,
  privateHostedZone: vpcStack.privateHostedZone
});
appStack.addDependency(sqlStack);

new ApplicationServiceStack(app, "SpringBootDemoAppServiceStack", {
  env: env,
  serviceName: serviceName,
  vpc: vpcStack.vpc,
  kmsKey: foundationStack.kmsKey,
  serviceNetworkArn: serviceNetworkArn,
  privateHostedZone: vpcStack.privateHostedZone,
  loadBalancer: appStack.alb
});

app.synth({
  validateOnSynthesis: true
});
