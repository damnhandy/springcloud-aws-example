import { Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";

test("create ecr repo without codebuild permissions", () => {
  const stack = new Stack();
  const template = Template.fromStack(stack);
  new EcrRepoWithLifecycle(stack, "DemoAppImageRepo", {
    repositoryName: "apps/demoapp",
    withCodeBuildPolicy: false
  });
  template.hasResourceProperties(
    "AWS::ECR::Repository",
    Match.objectLike({
      RepositoryName: "apps/demoapp",
      ImageScanningConfiguration: {
        ScanOnPush: true
      }
    })
  );
});

test("create ecr repo with codebuild permissions", () => {
  const stack = new Stack();
  const template = Template.fromStack(stack);
  new EcrRepoWithLifecycle(stack, "DemoAppImageRepo", {
    repositoryName: "apps/demoapp",
    withCodeBuildPolicy: true
  });
  template.hasResourceProperties(
    "AWS::ECR::Repository",
    Match.objectLike({
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
    })
  );
});
