#!/usr/bin/env node
import "source-map-support/register";
import * as cp from "child_process";
import { AppStagingSynthesizer } from "@aws-cdk/app-staging-synthesizer-alpha";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { PrototypeStagingStack } from "../lib/app-staging-stack";
import { DatabaseStack } from "../lib/database-stack";
import { FoundationStack } from "../lib/foundation-stack";
import { SqlStack } from "../lib/sql-stack";
import { VpcStack } from "../lib/vpc-stack";
import { ApplicationStack } from "../lib/application-stack";
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
  ipv4Cidr: "10.4.0.0/16"
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
    appuser: "appuser"
  },
  secretPlaceHolders: {
    appuserSecret: dbStack.appUserCreds
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
  appUserSecret: dbStack.appUserCreds
});
appStack.addDependency(sqlStack);

app.synth({
  validateOnSynthesis: true
});
