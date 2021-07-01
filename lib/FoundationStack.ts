import * as cdk from "@aws-cdk/core";
import { Construct, StackProps } from "@aws-cdk/core";
import * as kms from "@aws-cdk/aws-kms";
import * as s3 from "@aws-cdk/aws-s3";
import { ObjectOwnership } from "@aws-cdk/aws-s3";
import * as s3deploy from "@aws-cdk/aws-s3-deployment";

export class FoundationStack extends cdk.Stack {
  public kmsKey: kms.IKey;
  public artifactsBucket: s3.IBucket;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.kmsKey = new kms.Key(this, "DemoAppKey", {
      enableKeyRotation: true,
      alias: "alias/default"
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
      versioned: false,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30)
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90)
            }
          ]
        }
      ]
    });

    new s3deploy.BucketDeployment(this, "CopyTrustStore", {
      sources: [s3deploy.Source.asset("./credentials/jdbc_truststore_aws.p12.zip")],
      destinationBucket: this.artifactsBucket,
      destinationKeyPrefix: "jdbc/truststores"
    });
  }
}
