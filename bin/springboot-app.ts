#!/usr/bin/env node
import "source-map-support/register";
import { AppStagingSynthesizer } from "@aws-cdk/app-staging-synthesizer-alpha";
import * as cdk from "aws-cdk-lib";
import cp from "node:child_process";

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
      autoDeleteStagingAssets: false,
      imageAssetVersionCount: 10,
      maxImageAge: 30
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
  revision: revision,
  serviceName: serviceName
});

const vpcStack = new VpcStack(app, "VpcStack", {
  env: env,
  ipv4Cidr: "10.4.0.0/16",
  serviceNetworkArn: serviceNetworkArn
});
new EC2TesterStack(app, "EC2TesterStack", {
  endpointSecurityGroup: vpcStack.endpointSecurityGroup,
  env: env,
  vpc: vpcStack.vpc
});

const dbStack = new DatabaseStack(app, "DatabasePostgresStack", {
  artifactsBucket: foundationStack.artifactsBucket,
  endpointSecurityGroup: vpcStack.endpointSecurityGroup,
  env: env,
  revision: revision,
  serviceName: serviceName,
  vpc: vpcStack.vpc
});
dbStack.addDependency(foundationStack);

const sqlStack = new SqlStack(app, "SqlStack", {
  dbCluster: dbStack.dbCluster,
  dbMasterCreds: dbStack.dbAdminCreds,
  encryptionKey: foundationStack.kmsKey,
  env: env,
  logGroup: foundationStack.flywayLogGroup,
  placeholders: {
    appuser_username: "appuser"
  },
  secretPlaceHolders: {
    appuser_secret: dbStack.appUserCreds
  },
  vpc: vpcStack.vpc
});
sqlStack.addDependency(dbStack);

const appStack = new ApplicationStack(app, "SpringBootDemoAppStack", {
  appUserSecret: dbStack.appUserCreds,
  dbCluster: dbStack.dbCluster,
  endpointSecurityGroup: vpcStack.endpointSecurityGroup,
  env: env,
  logGroup: foundationStack.appLogGroup,
  privateHostedZone: vpcStack.privateHostedZone,
  revision: revision,
  serviceName: serviceName,
  serviceNetworkArn: serviceNetworkArn,
  vpc: vpcStack.vpc
});
appStack.addDependency(sqlStack);

new ApplicationServiceStack(app, "SpringBootDemoAppServiceStack", {
  env: env,
  kmsKey: foundationStack.kmsKey,
  loadBalancer: appStack.alb,
  privateHostedZone: vpcStack.privateHostedZone,
  serviceName: serviceName,
  serviceNetworkArn: serviceNetworkArn,
  vpc: vpcStack.vpc
});

app.synth({
  validateOnSynthesis: true
});
