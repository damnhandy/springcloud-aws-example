"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@aws-cdk/core");
require("@aws-cdk/assert/jest");
const ecr_construct_1 = require("../lib/ecr-construct");
test("create ecr repo without codebuild permissions", () => {
  const stack = new core_1.Stack();
  new ecr_construct_1.EcrRepo(stack, "DemoAppImageRepo", {
    repositoryName: "apps/demoapp",
    withCodeBuildPolicy: false
  });
  expect(stack).toHaveResource("AWS::ECR::Repository", {
    RepositoryName: "apps/demoapp",
    ImageScanningConfiguration: {
      ScanOnPush: true
    }
  });
});
test("create ecr repo with codebuild permissions", () => {
  const stack = new core_1.Stack();
  new ecr_construct_1.EcrRepo(stack, "DemoAppImageRepo", {
    repositoryName: "apps/demoapp",
    withCodeBuildPolicy: true
  });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWNzLWNvbnN0cnVjdC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWNzLWNvbnN0cnVjdC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsd0NBQXNDO0FBQ3RDLGdDQUE4QjtBQUM5Qix3REFBK0M7QUFFL0MsSUFBSSxDQUFDLCtDQUErQyxFQUFFLEdBQUcsRUFBRTtJQUN6RCxNQUFNLEtBQUssR0FBRyxJQUFJLFlBQUssRUFBRSxDQUFDO0lBQzFCLElBQUksdUJBQU8sQ0FBQyxLQUFLLEVBQUUsa0JBQWtCLEVBQUU7UUFDckMsY0FBYyxFQUFFLGNBQWM7UUFDOUIsbUJBQW1CLEVBQUUsS0FBSztLQUMzQixDQUFDLENBQUM7SUFDSCxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsY0FBYyxDQUFDLHNCQUFzQixFQUFFO1FBQ25ELGNBQWMsRUFBRSxjQUFjO1FBQzlCLDBCQUEwQixFQUFFO1lBQzFCLFVBQVUsRUFBRSxJQUFJO1NBQ2pCO0tBQ0YsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO0lBQ3RELE1BQU0sS0FBSyxHQUFHLElBQUksWUFBSyxFQUFFLENBQUM7SUFDMUIsSUFBSSx1QkFBTyxDQUFDLEtBQUssRUFBRSxrQkFBa0IsRUFBRTtRQUNyQyxjQUFjLEVBQUUsY0FBYztRQUM5QixtQkFBbUIsRUFBRSxJQUFJO0tBQzFCLENBQUMsQ0FBQztJQUNILE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLEVBQUU7UUFDbkQsY0FBYyxFQUFFLGNBQWM7UUFDOUIsMEJBQTBCLEVBQUU7WUFDMUIsVUFBVSxFQUFFLElBQUk7U0FDakI7UUFDRCxvQkFBb0IsRUFBRTtZQUNwQixTQUFTLEVBQUU7Z0JBQ1Q7b0JBQ0UsTUFBTSxFQUFFO3dCQUNOLDRCQUE0Qjt3QkFDNUIsbUJBQW1CO3dCQUNuQixpQ0FBaUM7cUJBQ2xDO29CQUNELE1BQU0sRUFBRSxPQUFPO29CQUNmLFNBQVMsRUFBRTt3QkFDVCxPQUFPLEVBQUUseUJBQXlCO3FCQUNuQztpQkFDRjthQUNGO1lBQ0QsT0FBTyxFQUFFLFlBQVk7U0FDdEI7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN0YWNrIH0gZnJvbSBcIkBhd3MtY2RrL2NvcmVcIjtcbmltcG9ydCBcIkBhd3MtY2RrL2Fzc2VydC9qZXN0XCI7XG5pbXBvcnQgeyBFY3JSZXBvIH0gZnJvbSBcIi4uL2xpYi9lY3ItY29uc3RydWN0XCI7XG5cbnRlc3QoXCJjcmVhdGUgZWNyIHJlcG8gd2l0aG91dCBjb2RlYnVpbGQgcGVybWlzc2lvbnNcIiwgKCkgPT4ge1xuICBjb25zdCBzdGFjayA9IG5ldyBTdGFjaygpO1xuICBuZXcgRWNyUmVwbyhzdGFjaywgXCJEZW1vQXBwSW1hZ2VSZXBvXCIsIHtcbiAgICByZXBvc2l0b3J5TmFtZTogXCJhcHBzL2RlbW9hcHBcIixcbiAgICB3aXRoQ29kZUJ1aWxkUG9saWN5OiBmYWxzZVxuICB9KTtcbiAgZXhwZWN0KHN0YWNrKS50b0hhdmVSZXNvdXJjZShcIkFXUzo6RUNSOjpSZXBvc2l0b3J5XCIsIHtcbiAgICBSZXBvc2l0b3J5TmFtZTogXCJhcHBzL2RlbW9hcHBcIixcbiAgICBJbWFnZVNjYW5uaW5nQ29uZmlndXJhdGlvbjoge1xuICAgICAgU2Nhbk9uUHVzaDogdHJ1ZVxuICAgIH1cbiAgfSk7XG59KTtcblxudGVzdChcImNyZWF0ZSBlY3IgcmVwbyB3aXRoIGNvZGVidWlsZCBwZXJtaXNzaW9uc1wiLCAoKSA9PiB7XG4gIGNvbnN0IHN0YWNrID0gbmV3IFN0YWNrKCk7XG4gIG5ldyBFY3JSZXBvKHN0YWNrLCBcIkRlbW9BcHBJbWFnZVJlcG9cIiwge1xuICAgIHJlcG9zaXRvcnlOYW1lOiBcImFwcHMvZGVtb2FwcFwiLFxuICAgIHdpdGhDb2RlQnVpbGRQb2xpY3k6IHRydWVcbiAgfSk7XG4gIGV4cGVjdChzdGFjaykudG9IYXZlUmVzb3VyY2UoXCJBV1M6OkVDUjo6UmVwb3NpdG9yeVwiLCB7XG4gICAgUmVwb3NpdG9yeU5hbWU6IFwiYXBwcy9kZW1vYXBwXCIsXG4gICAgSW1hZ2VTY2FubmluZ0NvbmZpZ3VyYXRpb246IHtcbiAgICAgIFNjYW5PblB1c2g6IHRydWVcbiAgICB9LFxuICAgIFJlcG9zaXRvcnlQb2xpY3lUZXh0OiB7XG4gICAgICBTdGF0ZW1lbnQ6IFtcbiAgICAgICAge1xuICAgICAgICAgIEFjdGlvbjogW1xuICAgICAgICAgICAgXCJlY3I6R2V0RG93bmxvYWRVcmxGb3JMYXllclwiLFxuICAgICAgICAgICAgXCJlY3I6QmF0Y2hHZXRJbWFnZVwiLFxuICAgICAgICAgICAgXCJlY3I6QmF0Y2hDaGVja0xheWVyQXZhaWxhYmlsaXR5XCJcbiAgICAgICAgICBdLFxuICAgICAgICAgIEVmZmVjdDogXCJBbGxvd1wiLFxuICAgICAgICAgIFByaW5jaXBhbDoge1xuICAgICAgICAgICAgU2VydmljZTogXCJjb2RlYnVpbGQuYW1hem9uYXdzLmNvbVwiXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgVmVyc2lvbjogXCIyMDEyLTEwLTE3XCJcbiAgICB9XG4gIH0pO1xufSk7XG4iXX0=
