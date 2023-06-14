#!/usr/bin/env node
import "source-map-support/register";
import * as cp from "child_process";
import * as cdk from "aws-cdk-lib";
import { ApplicationStack } from "../lib/application-stack";
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

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

const app = new cdk.App();

const foundationStack = new FoundationStack(app, "SpringBootDemoFoundationStack", {
  env: env,
  serviceName: serviceName,
  destinationKeyPrefix: destinationKeyPrefix,
  destinationFileName: destinationFileName,
  sourceZipPath: sourceZipPath,
  revision: revision
});

const appStack = new ApplicationStack(app, "SpringBootDemoAppStack", {
  env: env,
  vpc: foundationStack.networking.vpc,
  serviceName: serviceName,
  destinationKeyPrefix: destinationKeyPrefix,
  destinationFileName: destinationFileName,
  sourceZipPath: sourceZipPath,
  artifactsBucket: foundationStack.artifactsBucket,
  revision: revision
});
appStack.addDependency(foundationStack);

app.synth({
  validateOnSynthesis: true
});
