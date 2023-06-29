import * as path from "path";
import { Stack, StackProps } from "aws-cdk-lib";
import { SubnetFilter } from "aws-cdk-lib/aws-ec2";
import { Key } from "aws-cdk-lib/aws-kms";
import { IDatabaseCluster } from "aws-cdk-lib/aws-rds";
import * as s3assets from "aws-cdk-lib/aws-s3-assets";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { DBMigrationConstruct } from "./flyway-dbmigrator";
import { LookupUtils } from "./lookup-utils";
import { ParamNames } from "./names";

export interface FlywayResourceStackProps extends StackProps {
  readonly dbCluster: IDatabaseCluster;
  readonly masterPassword: ISecret;
}

export class FlywayResourceStack extends Stack {
  constructor(scope: Construct, id: string, props: FlywayResourceStackProps) {
    super(scope, id, props);

    const vpc = LookupUtils.vpcLookup(this, "VpcLookup");
    const kmsKey = Key.fromKeyArn(
      this,
      "KmsKeyRef",
      StringParameter.valueForStringParameter(this, ParamNames.KMS_ARN)
    );

    const dbMigrator = new DBMigrationConstruct(this, "DBMigrate", {
      vpc: vpc,
      vpcSubnets: vpc.selectSubnets({
        subnetFilters: [SubnetFilter.containsIpAddresses(["100.64.12.1"])]
      }),
      database: props.dbCluster,
      masterPassword: props.masterPassword,
      encryptionKey: kmsKey,
      locations: new s3assets.Asset(this, "SqlFilesAsset", {
        path: path.resolve(__dirname, "../data-migration/sql")
      })
    });
  }
}
