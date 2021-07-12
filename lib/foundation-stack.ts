import * as cdk from "@aws-cdk/core";
import * as kms from "@aws-cdk/aws-kms";
import * as s3 from "@aws-cdk/aws-s3";

export class FoundationStack extends cdk.Stack {
  public kmsKey: kms.IKey;
  public artifactsBucket: s3.IBucket;

  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

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
  }
}
