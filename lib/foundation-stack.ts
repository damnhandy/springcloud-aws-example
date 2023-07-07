import * as cdk from "aws-cdk-lib";
import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { IRepository } from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as s3 from "aws-cdk-lib/aws-s3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

import { EcrRepoWithLifecycle } from "./ecr-construct";
import { ParamNames } from "./names";

/**
 * Test
 */
export interface FoundationStackProps extends StackProps {
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
export class FoundationStack extends Stack {
  public kmsKey: kms.Key;
  public artifactsBucket: s3.IBucket;
  public appRepo: IRepository;

  constructor(scope: Construct, id: string, props: FoundationStackProps) {
    super(scope, id, props);
    if (props.env === undefined) {
      throw new Error("props.env is undefined");
    }

    this.kmsKey = new kms.Key(this, "DemoAppKey", {
      enableKeyRotation: true,
      alias: "alias/DemoAppKey"
    });

    this.kmsKey.grantEncryptDecrypt(
      new iam.ServicePrincipal(`logs.${props.env?.region}.amazonaws.com`)
    );

    new StringParameter(this, "KmsKeyArnParam", {
      description: "DemoApp KMS Key ARN",
      parameterName: ParamNames.KMS_ARN,
      stringValue: this.kmsKey.keyArn
    });

    new StringParameter(this, "KmsKeyIdParam", {
      description: "DemoApp KMS Key ID",
      parameterName: ParamNames.KMS_ID,
      stringValue: this.kmsKey.keyId
    });
  }
}
