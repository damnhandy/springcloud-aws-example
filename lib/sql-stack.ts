import * as path from "path";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as kms from "aws-cdk-lib/aws-kms";
import * as logs from "aws-cdk-lib/aws-logs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3assets from "aws-cdk-lib/aws-s3-assets";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

import { Construct } from "constructs";
import { DBMigrationConstruct } from "./flyway-dbmigrator";

export interface SqlStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
  readonly encryptionKey: kms.IKey;
  readonly dbMasterCreds: secretsmanager.ISecret;
  readonly dbCluster: rds.DatabaseCluster;
  readonly ephemeralStorageSize?: cdk.Size;
  readonly placeholders?: { [key: string]: string };
  readonly secretPlaceHolders?: { [key: string]: secretsmanager.ISecret };
  readonly logGroup: logs.ILogGroup;
}

export class SqlStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SqlStackProps) {
    super(scope, id, props);

    const availabilityZones = this.availabilityZones.slice(0, 2);

    const vpcSubnets = props.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      availabilityZones: availabilityZones
    });
    new DBMigrationConstruct(this, "DBMigrate2", {
      vpc: props.vpc,
      vpcSubnets: vpcSubnets,
      database: props.dbCluster,
      masterPassword: props.dbMasterCreds,
      encryptionKey: props.encryptionKey,
      locations: new s3assets.Asset(this, `DataMigrationAssets2`, {
        deployTime: false,
        path: path.resolve(__dirname, "../data-migration/sql")
      }),
      placeholders: props.placeholders,
      secretPlaceHolders: props.secretPlaceHolders,
      logGroup: props.logGroup
    });
  }
}
