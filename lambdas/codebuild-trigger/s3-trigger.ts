import { S3Event } from "aws-lambda";
import {
  CodeBuildClient,
  StartBuildCommand,
  StartBuildCommandOutput
} from "@aws-sdk/client-codebuild";

export const handler = async (event: S3Event): Promise<StartBuildCommandOutput> => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;

  const request = new StartBuildCommand({
    projectName: process.env.PROJECT_NAME
  });
  const codeBuild = new CodeBuildClient({ region: "us-east-1" });
  const response = codeBuild.send(request);
  return response;
};
