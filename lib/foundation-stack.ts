import * as cdk from "@aws-cdk/core";
import { RemovalPolicy } from "@aws-cdk/core";
import * as kms from "@aws-cdk/aws-kms";
import * as s3 from "@aws-cdk/aws-s3";
import { IRepository } from "@aws-cdk/aws-ecr";
import * as iam from "@aws-cdk/aws-iam";
import { ParameterType, StringParameter } from "@aws-cdk/aws-ssm";
import { EcrRepoWithLifecyle } from "./ecr-construct";
import { BasicNetworking, IBasicNetworking } from "./network-construct";
import { ParamNames } from "./names";
import { DatabaseConstruct } from "./database-construct";

export interface FoundationStackProps extends cdk.StackProps {
  /**
   * The name of the service and its assocated database.
   */
  readonly serviceName: string;
  /**
   * The revision identifier
   */
  readonly revision: string;

  readonly destinationKeyPrefix: string;
  readonly destinationFileName: string;
  readonly sourceZipPath: string;
}

/**
 * Base stack that sets up foundational resources that maintains resources that should not be
 * deleted.
 */
export class FoundationStack extends cdk.Stack {
  public kmsKey: kms.Key;
  public artifactsBucket: s3.IBucket;
  public networking: IBasicNetworking;
  public appRepo: IRepository;
  public flywayRepo: IRepository;

  constructor(scope: cdk.Construct, id: string, props: FoundationStackProps) {
    super(scope, id, props);

    this.networking = new BasicNetworking(this, "VPC");

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
      stringValue: this.kmsKey.keyArn,
      type: ParameterType.STRING
    });

    new StringParameter(this, "KmsKeyIdParam", {
      description: "DemoApp KMS Key ID",
      parameterName: ParamNames.KMS_ID,
      stringValue: this.kmsKey.keyId,
      type: ParameterType.STRING
    });

    this.artifactsBucket = new s3.Bucket(this, "ArtifactsBucket", {
      bucketName: `${this.account}-artifacts-${this.region}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.kmsKey,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
      bucketKeyEnabled: true,
      blockPublicAccess: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true
      },
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY // this is an ill-advised policy for production apps
    });

    new DatabaseConstruct(this, "DB", {
      artifactsBucket: this.artifactsBucket,
      revision: props.revision,
      serviceName: props.serviceName,
      vpc: this.networking.vpc,
      destinationKeyPrefix: props.destinationKeyPrefix,
      destinationFileName: props.destinationFileName,
      sourceZipPath: props.sourceZipPath,
      kmsKey: this.kmsKey
    });

    new StringParameter(this, "ArtifactsBucketArnParam", {
      description: "Artifacts Bucket ARN",
      parameterName: ParamNames.ARTIFACTS_BUCKET_ARN,
      stringValue: this.artifactsBucket.bucketArn,
      type: ParameterType.STRING
    });

    new StringParameter(this, "ArtifactsBucketNameParam", {
      description: "Artifacts Bucket Name",
      parameterName: ParamNames.ARTIFACTS_BUCKET_NAME,
      stringValue: this.artifactsBucket.bucketName,
      type: ParameterType.STRING
    });

    const appRepo = new EcrRepoWithLifecyle(this, "DemoAppImageRepo", {
      repositoryName: "apps/demoapp",
      withCodeBuildPolicy: false
    });
    this.appRepo = appRepo.repository;

    new StringParameter(this, "AppRepoParam", {
      parameterName: ParamNames.APP_ECR_REPO_NAME,
      stringValue: this.appRepo.repositoryName
    });
  }
}
