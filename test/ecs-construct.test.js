"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@aws-cdk/core");
require("@aws-cdk/assert/jest");
const ecr_construct_1 = require("../lib/ecr-construct");
test("create ecr repo without codebuild permissions", () => {
  const stack = new core_1.Stack();
  const appRepo = new ecr_construct_1.EcrRepo(stack, "DemoAppImageRepo", {
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
  const appRepo = new ecr_construct_1.EcrRepo(stack, "DemoAppImageRepo", {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWNzLWNvbnN0cnVjdC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWNzLWNvbnN0cnVjdC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0Esd0NBQXNDO0FBQ3RDLGdDQUE4QjtBQUM5Qix3REFBK0M7QUFFL0MsSUFBSSxDQUFDLCtDQUErQyxFQUFFLEdBQUcsRUFBRTtJQUN6RCxNQUFNLEtBQUssR0FBRyxJQUFJLFlBQUssRUFBRSxDQUFDO0lBQzFCLE1BQU0sT0FBTyxHQUFHLElBQUksdUJBQU8sQ0FBQyxLQUFLLEVBQUUsa0JBQWtCLEVBQUU7UUFDckQsY0FBYyxFQUFFLGNBQWM7UUFDOUIsbUJBQW1CLEVBQUUsS0FBSztLQUMzQixDQUFDLENBQUM7SUFDSCxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsY0FBYyxDQUFDLHNCQUFzQixFQUFFO1FBQ25ELGNBQWMsRUFBRSxjQUFjO1FBQzlCLDBCQUEwQixFQUFFO1lBQzFCLFVBQVUsRUFBRSxJQUFJO1NBQ2pCO0tBQ0YsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO0lBQ3RELE1BQU0sS0FBSyxHQUFHLElBQUksWUFBSyxFQUFFLENBQUM7SUFDMUIsTUFBTSxPQUFPLEdBQUcsSUFBSSx1QkFBTyxDQUFDLEtBQUssRUFBRSxrQkFBa0IsRUFBRTtRQUNyRCxjQUFjLEVBQUUsY0FBYztRQUM5QixtQkFBbUIsRUFBRSxJQUFJO0tBQzFCLENBQUMsQ0FBQztJQUNILE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLEVBQUU7UUFDbkQsY0FBYyxFQUFFLGNBQWM7UUFDOUIsMEJBQTBCLEVBQUU7WUFDMUIsVUFBVSxFQUFFLElBQUk7U0FDakI7UUFDRCxvQkFBb0IsRUFBRTtZQUNwQixTQUFTLEVBQUU7Z0JBQ1Q7b0JBQ0UsTUFBTSxFQUFFO3dCQUNOLDRCQUE0Qjt3QkFDNUIsbUJBQW1CO3dCQUNuQixpQ0FBaUM7cUJBQ2xDO29CQUNELE1BQU0sRUFBRSxPQUFPO29CQUNmLFNBQVMsRUFBRTt3QkFDVCxPQUFPLEVBQUUseUJBQXlCO3FCQUNuQztpQkFDRjthQUNGO1lBQ0QsT0FBTyxFQUFFLFlBQVk7U0FDdEI7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN5bnRoVXRpbHMgfSBmcm9tIFwiQGF3cy1jZGsvYXNzZXJ0XCI7XG5pbXBvcnQgeyBTdGFjayB9IGZyb20gXCJAYXdzLWNkay9jb3JlXCI7XG5pbXBvcnQgXCJAYXdzLWNkay9hc3NlcnQvamVzdFwiO1xuaW1wb3J0IHsgRWNyUmVwbyB9IGZyb20gXCIuLi9saWIvZWNyLWNvbnN0cnVjdFwiO1xuXG50ZXN0KFwiY3JlYXRlIGVjciByZXBvIHdpdGhvdXQgY29kZWJ1aWxkIHBlcm1pc3Npb25zXCIsICgpID0+IHtcbiAgY29uc3Qgc3RhY2sgPSBuZXcgU3RhY2soKTtcbiAgY29uc3QgYXBwUmVwbyA9IG5ldyBFY3JSZXBvKHN0YWNrLCBcIkRlbW9BcHBJbWFnZVJlcG9cIiwge1xuICAgIHJlcG9zaXRvcnlOYW1lOiBcImFwcHMvZGVtb2FwcFwiLFxuICAgIHdpdGhDb2RlQnVpbGRQb2xpY3k6IGZhbHNlXG4gIH0pO1xuICBleHBlY3Qoc3RhY2spLnRvSGF2ZVJlc291cmNlKFwiQVdTOjpFQ1I6OlJlcG9zaXRvcnlcIiwge1xuICAgIFJlcG9zaXRvcnlOYW1lOiBcImFwcHMvZGVtb2FwcFwiLFxuICAgIEltYWdlU2Nhbm5pbmdDb25maWd1cmF0aW9uOiB7XG4gICAgICBTY2FuT25QdXNoOiB0cnVlXG4gICAgfVxuICB9KTtcbn0pO1xuXG50ZXN0KFwiY3JlYXRlIGVjciByZXBvIHdpdGggY29kZWJ1aWxkIHBlcm1pc3Npb25zXCIsICgpID0+IHtcbiAgY29uc3Qgc3RhY2sgPSBuZXcgU3RhY2soKTtcbiAgY29uc3QgYXBwUmVwbyA9IG5ldyBFY3JSZXBvKHN0YWNrLCBcIkRlbW9BcHBJbWFnZVJlcG9cIiwge1xuICAgIHJlcG9zaXRvcnlOYW1lOiBcImFwcHMvZGVtb2FwcFwiLFxuICAgIHdpdGhDb2RlQnVpbGRQb2xpY3k6IHRydWVcbiAgfSk7XG4gIGV4cGVjdChzdGFjaykudG9IYXZlUmVzb3VyY2UoXCJBV1M6OkVDUjo6UmVwb3NpdG9yeVwiLCB7XG4gICAgUmVwb3NpdG9yeU5hbWU6IFwiYXBwcy9kZW1vYXBwXCIsXG4gICAgSW1hZ2VTY2FubmluZ0NvbmZpZ3VyYXRpb246IHtcbiAgICAgIFNjYW5PblB1c2g6IHRydWVcbiAgICB9LFxuICAgIFJlcG9zaXRvcnlQb2xpY3lUZXh0OiB7XG4gICAgICBTdGF0ZW1lbnQ6IFtcbiAgICAgICAge1xuICAgICAgICAgIEFjdGlvbjogW1xuICAgICAgICAgICAgXCJlY3I6R2V0RG93bmxvYWRVcmxGb3JMYXllclwiLFxuICAgICAgICAgICAgXCJlY3I6QmF0Y2hHZXRJbWFnZVwiLFxuICAgICAgICAgICAgXCJlY3I6QmF0Y2hDaGVja0xheWVyQXZhaWxhYmlsaXR5XCJcbiAgICAgICAgICBdLFxuICAgICAgICAgIEVmZmVjdDogXCJBbGxvd1wiLFxuICAgICAgICAgIFByaW5jaXBhbDoge1xuICAgICAgICAgICAgU2VydmljZTogXCJjb2RlYnVpbGQuYW1hem9uYXdzLmNvbVwiXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdLFxuICAgICAgVmVyc2lvbjogXCIyMDEyLTEwLTE3XCJcbiAgICB9XG4gIH0pO1xufSk7XG4iXX0=
