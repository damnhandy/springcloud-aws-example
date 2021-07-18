import { Construct } from "@aws-cdk/core";
import { IStringParameter, StringParameter } from "@aws-cdk/aws-ssm";
import { IConnectable, ISecurityGroup, Port, SecurityGroup } from "@aws-cdk/aws-ec2";
import { IKey, Key } from "@aws-cdk/aws-kms";
import * as s3 from "@aws-cdk/aws-s3";
import * as ecr from "@aws-cdk/aws-ecr";

/**
 *
 */
export interface SecurityGroupParams {
  /**
   *
   */
  readonly source: IConnectable;
  /**
   * The SSM param that maintains the security group ID
   */
  readonly parameterName: string;
  /**
   * The destination port
   */
  readonly port: Port;
  /**
   * The description
   */
  readonly description?: string;
}

/**
 *
 */
export class ReferenceUtils extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);
  }

  /**
   *
   * @param params
   */
  public addToSecurityGroup(params: SecurityGroupParams): void {
    const securityGroupParam = StringParameter.fromStringParameterName(
      this,
      "SecurityGroupParam",
      params.parameterName
    );
    const destinationSg = this.findSecurityGroupByParam(securityGroupParam);
    params.source.connections.allowTo(destinationSg, params.port, params.description);
  }

  /**
   *
   * @param securityGroupParam
   */
  public findSecurityGroupByParam(securityGroupParam: IStringParameter): ISecurityGroup {
    return SecurityGroup.fromSecurityGroupId(
      this,
      "SecurityGroupRef",
      securityGroupParam.stringValue
    );
  }

  /**
   * Resolves a KMS key by a StringPareter whose value is the ARN of the key
   * @param kmsKeyArnParam the SSM param that has the value of the key's ARN
   */
  public findKmsKeyByParam(kmsKeyArnParam: IStringParameter): IKey {
    return Key.fromKeyArn(this, "KmsKeyLookup", kmsKeyArnParam.stringValue);
  }

  /**
   *
   * @param bucketArnParam
   */
  public findBucketByParam(bucketArnParam: IStringParameter): s3.IBucket {
    return s3.Bucket.fromBucketArn(this, "BucketLookup", bucketArnParam.stringValue);
  }

  /**
   *
   * @param ecrRepoArn
   */
  public findEcrRepoByParam(ecrRepoArn: IStringParameter): ecr.IRepository {
    return ecr.Repository.fromRepositoryName(this, "EcrLookup", ecrRepoArn.stringValue);
  }
}
