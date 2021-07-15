#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { DatabaseStack } from "../lib/database-stack";
import { FoundationStack } from "../lib/foundation-stack";
import { ApplicationStack } from "../lib/application-stack";

// Note that this value Should be the same as the value defined in spring.application.name
const serviceName = "demoapp";

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

const app = new cdk.App();

const foundationStack = new FoundationStack(app, "SpringBootDemoFoundationStack", {
  env: env
});

const databaseStack = new DatabaseStack(app, "SpringBootDemoAppDBStack", {
  env: env,
  foundationStack: foundationStack,
  serviceName: serviceName
});
databaseStack.addDependency(foundationStack);

const appStack = new ApplicationStack(app, "SpringBootDemoAppStack", {
  env: env,
  foundationStack: foundationStack,
  serviceName: serviceName
});
appStack.addDependency(databaseStack);

app.synth({
  validateOnSynthesis: true
});
