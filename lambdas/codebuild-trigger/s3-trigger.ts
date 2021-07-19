import { Context, S3Event } from "aws-lambda";
import { CodeBuildClient, StartBuildCommand } from "@aws-sdk/client-codebuild";

export const handler = async (event: S3Event, context: Context): Promise<any> => {
  const key = event.Records[0].s3.object.key;
  if (key === process.env.TARGET_KEY) {
    const request = new StartBuildCommand({
      projectName: process.env.PROJECT_NAME
    });
    const codeBuild = new CodeBuildClient({ region: process.env.AWS_REGION });
    const response = codeBuild.send(request);
    return response;
  } else {
    console.log("Buckect key did not match, ignoring.");
  }
  return {
    statusCode: "200",
    body: JSON.stringify({
      status: "ok",
      data: `Ignoring path ${key}`
    })
  };
};
