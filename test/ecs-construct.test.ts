import { SynthUtils } from "@aws-cdk/assert";
import { Stack } from "@aws-cdk/core";
import "@aws-cdk/assert/jest";
import { EcrRepo } from "../lib/ecr-construct";

test("create ecr repo without codebuild permissions", () => {
  const stack = new Stack();
  const appRepo = new EcrRepo(stack, "DemoAppImageRepo", {
    repositoryName: "apps/demoapp",
    withCodeBuildPolicy: false
  });
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  expect(stack).toHaveResource("AWS::ECR::Repository", {
    RepositoryName: "apps/demoapp",
    ImageScanningConfiguration: {
      ScanOnPush: true
    }
  });
});

test("create ecr repo with codebuild permissions", () => {
  const stack = new Stack();
  const appRepo = new EcrRepo(stack, "DemoAppImageRepo", {
    repositoryName: "apps/demoapp",
    withCodeBuildPolicy: true
  });
  expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  expect(stack).toHaveResource("AWS::ECR::Repository", {
    RepositoryName: "apps/demoapp",
    ImageScanningConfiguration: {
      ScanOnPush: true
    },
    RepositoryPolicyText: {
      Statement: [
        {
          Action: [
            "ecr:GetDownloadUrlForLayer",
            "ecr:BatchGetImage",
            "ecr:BatchCheckLayerAvailability"
          ],
          Effect: "Allow",
          Principal: {
            Service: "codebuild.amazonaws.com"
          }
        }
      ],
      Version: "2012-10-17"
    }
  });
});
