import * as cdk from "@aws-cdk/core";
import * as kms from "@aws-cdk/aws-kms";
import * as s3 from "@aws-cdk/aws-s3";
import { BasicNetworking, IBasicNetworking } from "./vpc";
import { IRepository } from "@aws-cdk/aws-ecr";
import { EcrRepo } from "./ecr-construct";

/**
 * Base stack that sets up foundational resources that maintains resources that should not be
 * deleted.
 */
export class FoundationStack extends cdk.Stack {
  public kmsKey: kms.IKey;
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
      versioned: true
    });

    const appRepo = new EcrRepo(this, "DemoAppImageRepo", {
      repositoryName: "apps/demoapp",
      withCodeBuildPolicy: false
    });
    this.appRepo = appRepo.repository;

    const flywayRepo = new EcrRepo(this, "FlywayImageRepo", {
      repositoryName: "ci/flyway",
      withCodeBuildPolicy: true
    });
    this.flywayRepo = flywayRepo.repository;
  }
}
