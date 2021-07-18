import * as cdk from "@aws-cdk/core";
import { RemovalPolicy } from "@aws-cdk/core";
import * as kms from "@aws-cdk/aws-kms";
import * as s3 from "@aws-cdk/aws-s3";
import { IRepository } from "@aws-cdk/aws-ecr";
import * as iam from "@aws-cdk/aws-iam";
import { ParameterType, StringParameter } from "@aws-cdk/aws-ssm";
import { EcrRepo } from "./ecr-construct";
import { BasicNetworking, IBasicNetworking } from "./network-construct";
import { ParamNames } from "./names";

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

  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
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
      description: "",
      parameterName: ParamNames.KMS_ARN,
      stringValue: this.kmsKey.keyArn,
      type: ParameterType.STRING
    });

    new StringParameter(this, "KmsKeyIdParam", {
      description: "",
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
      removalPolicy: RemovalPolicy.DESTROY
    });

    new StringParameter(this, "ArtifactsBucketArnParam", {
      description: "",
      parameterName: ParamNames.ARTIFACTS_BUCKET_ARN,
      stringValue: this.artifactsBucket.bucketArn,
      type: ParameterType.STRING
    });

    new StringParameter(this, "ArtifactsBucketNameParam", {
      description: "",
      parameterName: ParamNames.ARTIFACTS_BUCKET_NAME,
      stringValue: this.artifactsBucket.bucketName,
      type: ParameterType.STRING
    });

    const appRepo = new EcrRepo(this, "DemoAppImageRepo", {
      repositoryName: "apps/demoapp",
      withCodeBuildPolicy: false
    });
    this.appRepo = appRepo.repository;

    new StringParameter(this, "AppRepoParam", {
      parameterName: ParamNames.APP_ECR_REPO_NAME,
      stringValue: this.appRepo.repositoryName
    });

    const flywayRepo = new EcrRepo(this, "FlywayImageRepo", {
      repositoryName: "ci/flyway",
      withCodeBuildPolicy: true
    });
    this.flywayRepo = flywayRepo.repository;

    new StringParameter(this, "FlywayRepoParam", {
      parameterName: ParamNames.FLYWAY_ECR_REPO_NAME,
      stringValue: this.flywayRepo.repositoryName
    });
  }
}
