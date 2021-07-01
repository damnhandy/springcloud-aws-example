#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { VpcStack } from "../lib/VpcStack";
import { DatabaseStack } from "../lib/DatabaseStack";
import { FoundationStack } from "../lib/FoundationStack";

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

const databaseStack = new DatabaseStack(app, "SpringBootDemoAppDBStack", {
  env: env,
  foundationStack: foundationStack,
  vpcStack: vpcStack
});
databaseStack.addDependency(vpcStack);
