#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import * as cp from "child_process";
import { DatabaseStack } from "../lib/database-stack";
import { FoundationStack } from "../lib/foundation-stack";
import { ApplicationStack } from "../lib/application-stack";

// Note that this value Should be the same as the value defined in spring.application.name
const serviceName = "demoapp";

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
  env
});

const databaseStack = new DatabaseStack(app, "SpringBootDemoAppDBStack", {
  env: env,
  vpc: foundationStack.networking.vpc,
  serviceName: serviceName,
  databaseName: serviceName,
  artifactsBucket: foundationStack.artifactsBucket,
  revision: revision
});
databaseStack.addDependency(foundationStack);

const appStack = new ApplicationStack(app, "SpringBootDemoAppStack", {
  env: env,
  vpc: foundationStack.networking.vpc,
  serviceName: serviceName,
  revision: revision
});
appStack.addDependency(databaseStack);

app.synth({
  validateOnSynthesis: true
});
