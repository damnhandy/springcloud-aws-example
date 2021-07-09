#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { VpcStack } from "../lib/vpc-stack";
import { DatabaseStack } from "../lib/database-stack";
import { FoundationStack } from "../lib/foundation-stack";
import { ApplicationStack } from "../lib/application-stack";

// Note that this value Should be the same as the value defined in spring.application.name
const appName = "demoapp";
const prefix = "DemoApp";

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

const app = new cdk.App();

const foundationStack = new FoundationStack(app, "SpringBootDemoFoundationStack", {
  env: env
});

const vpcStack = new VpcStack(app, "SpringBootDemoAppVpcStack", {
  env: env
});
vpcStack.addDependency(foundationStack);

const databaseStack = new DatabaseStack(app, "SpringBootDemoAppDBStack", {
  env: env,
  foundationStack: foundationStack,
  vpcStack: vpcStack,
  appName: appName
});

const appStack = new ApplicationStack(app, "SpringBootDemoAppStack", {
  env: env,
  foundationStack: foundationStack,
  vpcStack: vpcStack,
  appName: appName
});
databaseStack.addDependency(vpcStack, "Requires network configuration");
appStack.addDependency(vpcStack, "Requires network configuration");
appStack.addDependency(databaseStack, "The ECS service needs access to the database");
