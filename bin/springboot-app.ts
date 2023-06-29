#!/usr/bin/env node
import "source-map-support/register";
import * as cp from "child_process";
import { AppStagingSynthesizer } from "@aws-cdk/app-staging-synthesizer-alpha";
import * as cdk from "aws-cdk-lib";
import { App } from "aws-cdk-lib";
import { ApplicationStack } from "../lib/application-stack";
import { DatabaseStack } from "../lib/database-stack";
import { FlywayResourceStack } from "../lib/flyway-resource";
import { FoundationStack } from "../lib/foundation-stack";
// Note that this value Should be the same as the value defined in spring.application.name
const serviceName = "demoapp";
const destinationKeyPrefix = "data-jobs";
const destinationFileName = "data-migration.zip";
const sourceZipPath = "../data-migration-out";

/**
 *
 */
const revision = `git-${cp.execSync("git rev-parse HEAD").toString().trim()}`;

const defaultStackSynthesizer = AppStagingSynthesizer.defaultResources({
  appId: "demoapp",
  imageAssetVersionCount: 10
});

const app = new App({
  defaultStackSynthesizer: defaultStackSynthesizer
});

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

const foundationStack = new FoundationStack(app, "FoundationStack", {
  env: env,
  serviceName: serviceName,
  destinationKeyPrefix: destinationKeyPrefix,
  destinationFileName: destinationFileName,
  sourceZipPath: sourceZipPath,
  revision: revision
});

const dbStack = new DatabaseStack(app, "DatabaseStack", {
  env: env,
  artifactsBucket: foundationStack.artifactsBucket,
  revision: revision,
  serviceName: serviceName
});
dbStack.addDependency(foundationStack);

const flywayStack = new FlywayResourceStack(app, "FlyWayStack", {
  dbCluster: dbStack.dbCluster,
  masterPassword: dbStack.dbAdminCreds
});
flywayStack.addDependency(dbStack);

// const appStack = new ApplicationStack(app, "SpringBootDemoAppStack", {
//   env: env,
//   serviceName: serviceName,
//   destinationKeyPrefix: destinationKeyPrefix,
//   destinationFileName: destinationFileName,
//   sourceZipPath: sourceZipPath,
//   artifactsBucket: foundationStack.artifactsBucket,
//   revision: revision,
//   vpc: foundationStack.networking.vpc
// });
// appStack.addDependency(foundationStack);
// appStack.addDependency(dbStack);

app.synth({
  validateOnSynthesis: true
});
