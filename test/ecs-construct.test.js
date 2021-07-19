"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@aws-cdk/core");
require("@aws-cdk/assert/jest");
const ecr_construct_1 = require("../lib/ecr-construct");
test("create ecr repo without codebuild permissions", () => {
  const stack = new core_1.Stack();
  new ecr_construct_1.EcrRepoWithLifecyle(stack, "DemoAppImageRepo", {
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
  new ecr_construct_1.EcrRepoWithLifecyle(stack, "DemoAppImageRepo", {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWNzLWNvbnN0cnVjdC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWNzLWNvbnN0cnVjdC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsd0NBQXNDO0FBQ3RDLGdDQUE4QjtBQUM5Qix3REFBMkQ7QUFFM0QsSUFBSSxDQUFDLCtDQUErQyxFQUFFLEdBQUcsRUFBRTtJQUN6RCxNQUFNLEtBQUssR0FBRyxJQUFJLFlBQUssRUFBRSxDQUFDO0lBQzFCLElBQUksbUNBQW1CLENBQUMsS0FBSyxFQUFFLGtCQUFrQixFQUFFO1FBQ2pELGNBQWMsRUFBRSxjQUFjO1FBQzlCLG1CQUFtQixFQUFFLEtBQUs7S0FDM0IsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsRUFBRTtRQUNuRCxjQUFjLEVBQUUsY0FBYztRQUM5QiwwQkFBMEIsRUFBRTtZQUMxQixVQUFVLEVBQUUsSUFBSTtTQUNqQjtLQUNGLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtJQUN0RCxNQUFNLEtBQUssR0FBRyxJQUFJLFlBQUssRUFBRSxDQUFDO0lBQzFCLElBQUksbUNBQW1CLENBQUMsS0FBSyxFQUFFLGtCQUFrQixFQUFFO1FBQ2pELGNBQWMsRUFBRSxjQUFjO1FBQzlCLG1CQUFtQixFQUFFLElBQUk7S0FDMUIsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsRUFBRTtRQUNuRCxjQUFjLEVBQUUsY0FBYztRQUM5QiwwQkFBMEIsRUFBRTtZQUMxQixVQUFVLEVBQUUsSUFBSTtTQUNqQjtRQUNELG9CQUFvQixFQUFFO1lBQ3BCLFNBQVMsRUFBRTtnQkFDVDtvQkFDRSxNQUFNLEVBQUU7d0JBQ04sNEJBQTRCO3dCQUM1QixtQkFBbUI7d0JBQ25CLGlDQUFpQztxQkFDbEM7b0JBQ0QsTUFBTSxFQUFFLE9BQU87b0JBQ2YsU0FBUyxFQUFFO3dCQUNULE9BQU8sRUFBRSx5QkFBeUI7cUJBQ25DO2lCQUNGO2FBQ0Y7WUFDRCxPQUFPLEVBQUUsWUFBWTtTQUN0QjtLQUNGLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RhY2sgfSBmcm9tIFwiQGF3cy1jZGsvY29yZVwiO1xuaW1wb3J0IFwiQGF3cy1jZGsvYXNzZXJ0L2plc3RcIjtcbmltcG9ydCB7IEVjclJlcG9XaXRoTGlmZWN5bGUgfSBmcm9tIFwiLi4vbGliL2Vjci1jb25zdHJ1Y3RcIjtcblxudGVzdChcImNyZWF0ZSBlY3IgcmVwbyB3aXRob3V0IGNvZGVidWlsZCBwZXJtaXNzaW9uc1wiLCAoKSA9PiB7XG4gIGNvbnN0IHN0YWNrID0gbmV3IFN0YWNrKCk7XG4gIG5ldyBFY3JSZXBvV2l0aExpZmVjeWxlKHN0YWNrLCBcIkRlbW9BcHBJbWFnZVJlcG9cIiwge1xuICAgIHJlcG9zaXRvcnlOYW1lOiBcImFwcHMvZGVtb2FwcFwiLFxuICAgIHdpdGhDb2RlQnVpbGRQb2xpY3k6IGZhbHNlXG4gIH0pO1xuICBleHBlY3Qoc3RhY2spLnRvSGF2ZVJlc291cmNlKFwiQVdTOjpFQ1I6OlJlcG9zaXRvcnlcIiwge1xuICAgIFJlcG9zaXRvcnlOYW1lOiBcImFwcHMvZGVtb2FwcFwiLFxuICAgIEltYWdlU2Nhbm5pbmdDb25maWd1cmF0aW9uOiB7XG4gICAgICBTY2FuT25QdXNoOiB0cnVlXG4gICAgfVxuICB9KTtcbn0pO1xuXG50ZXN0KFwiY3JlYXRlIGVjciByZXBvIHdpdGggY29kZWJ1aWxkIHBlcm1pc3Npb25zXCIsICgpID0+IHtcbiAgY29uc3Qgc3RhY2sgPSBuZXcgU3RhY2soKTtcbiAgbmV3IEVjclJlcG9XaXRoTGlmZWN5bGUoc3RhY2ssIFwiRGVtb0FwcEltYWdlUmVwb1wiLCB7XG4gICAgcmVwb3NpdG9yeU5hbWU6IFwiYXBwcy9kZW1vYXBwXCIsXG4gICAgd2l0aENvZGVCdWlsZFBvbGljeTogdHJ1ZVxuICB9KTtcbiAgZXhwZWN0KHN0YWNrKS50b0hhdmVSZXNvdXJjZShcIkFXUzo6RUNSOjpSZXBvc2l0b3J5XCIsIHtcbiAgICBSZXBvc2l0b3J5TmFtZTogXCJhcHBzL2RlbW9hcHBcIixcbiAgICBJbWFnZVNjYW5uaW5nQ29uZmlndXJhdGlvbjoge1xuICAgICAgU2Nhbk9uUHVzaDogdHJ1ZVxuICAgIH0sXG4gICAgUmVwb3NpdG9yeVBvbGljeVRleHQ6IHtcbiAgICAgIFN0YXRlbWVudDogW1xuICAgICAgICB7XG4gICAgICAgICAgQWN0aW9uOiBbXG4gICAgICAgICAgICBcImVjcjpHZXREb3dubG9hZFVybEZvckxheWVyXCIsXG4gICAgICAgICAgICBcImVjcjpCYXRjaEdldEltYWdlXCIsXG4gICAgICAgICAgICBcImVjcjpCYXRjaENoZWNrTGF5ZXJBdmFpbGFiaWxpdHlcIlxuICAgICAgICAgIF0sXG4gICAgICAgICAgRWZmZWN0OiBcIkFsbG93XCIsXG4gICAgICAgICAgUHJpbmNpcGFsOiB7XG4gICAgICAgICAgICBTZXJ2aWNlOiBcImNvZGVidWlsZC5hbWF6b25hd3MuY29tXCJcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBWZXJzaW9uOiBcIjIwMTItMTAtMTdcIlxuICAgIH1cbiAgfSk7XG59KTtcbiJdfQ==
