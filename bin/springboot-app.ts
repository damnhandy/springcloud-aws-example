#!/usr/bin/env node
import "source-map-support/register";
import cp from "node:child_process";
import { AppStagingSynthesizer } from "@aws-cdk/app-staging-synthesizer-alpha";
import * as cdk from "aws-cdk-lib";
import { PrototypeStagingStack } from "../lib/app-staging-stack.js";
import { ApplicationServiceStack } from "../lib/application-service-stack.js";
import { ApplicationStack } from "../lib/application-stack.js";
import { DatabaseStack } from "../lib/database-stack.js";
import { EC2TesterStack } from "../lib/ec2-host.js";
import { FoundationStack } from "../lib/foundation-stack.js";
import { SqlStack } from "../lib/sql-stack.js";
import { VpcStack } from "../lib/vpc-stack.js";
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

const serviceNetworkArn = app.node.tryGetContext("serviceNetworkArn") as string;

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
    appuser_username: "appuser"
  },
  secretPlaceHolders: {
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
