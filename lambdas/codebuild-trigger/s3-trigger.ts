import { S3Event } from "aws-lambda";
import {
  CodeBuildClient,
  StartBuildCommand,
  StartBuildCommandOutput
} from "@aws-sdk/client-codebuild";

export const lambdaHandler = async (event: S3Event): Promise<StartBuildCommandOutput> => {
  const request = new StartBuildCommand({
    projectName: "undefined"
  });

  const codeBuild = new CodeBuildClient({ region: "us-east-1" });

  const response = codeBuild.send(request);

  return response;
};
