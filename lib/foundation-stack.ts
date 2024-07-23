import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { ParamNames } from "./names";

/**
 * Test
 */
export interface FoundationStackProps extends cdk.StackProps {
  /**
   * The name of the service and its associated database.
   */
  readonly serviceName: string;
  /**
   * The revision identifier
   */
  readonly revision: string;
}

/**
 * Base stack that sets up foundational resources that maintains resources that should not be
 * deleted.
 */
export class FoundationStack extends cdk.Stack {
  public readonly kmsKey: kms.Key;
  public readonly artifactsBucket: s3.IBucket;
  public readonly appLogGroup: logs.ILogGroup;
  public readonly flywayLogGroup: logs.ILogGroup;

  constructor(scope: Construct, id: string, props: FoundationStackProps) {
    super(scope, id, props);
    if (props.env === undefined) {
      throw new Error("props.env is undefined");
    }

    this.kmsKey = new kms.Key(this, "DemoAppKey", {
      enableKeyRotation: true,
      alias: "alias/DemoAppKey",
      enabled: true,
      pendingWindow: cdk.Duration.days(7),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      rotationPeriod: cdk.Duration.days(90)
    });
    this.kmsKey.grantEncryptDecrypt(
      new iam.ServicePrincipal(`logs.${props.env?.region}.amazonaws.com`)
    );

    this.appLogGroup = new logs.LogGroup(this, "DemoAppLogGroup", {
      encryptionKey: this.kmsKey,
      logGroupName: `/app/logs/${props.serviceName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    this.flywayLogGroup = new logs.LogGroup(this, "FlywayAppLogGroup", {
      encryptionKey: this.kmsKey,
      logGroupName: `/app/logs/flyway-custom-resource`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    new ssm.StringParameter(this, "AppLogGroup", {
      description: "Application Log Group ARN ",
      parameterName: ParamNames.APP_LOG_GROUP,
      stringValue: this.appLogGroup.logGroupArn
    });

    new ssm.StringParameter(this, "FlywayLogGroupParam", {
      description: "Flyway Custom Log Group ARN ",
      parameterName: ParamNames.FLYWAY_LOG_GROUP,
      stringValue: this.flywayLogGroup.logGroupArn
    });

    new ssm.StringParameter(this, "KmsKeyArnParam", {
      description: "DemoApp KMS Key ARN",
      parameterName: ParamNames.KMS_ARN,
      stringValue: this.kmsKey.keyArn
    });

    new ssm.StringParameter(this, "KmsKeyIdParam", {
      description: "DemoApp KMS Key ID",
      parameterName: ParamNames.KMS_ID,
      stringValue: this.kmsKey.keyId
    });
  }
}
