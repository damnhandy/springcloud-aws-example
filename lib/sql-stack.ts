import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as kms from "aws-cdk-lib/aws-kms";
import * as logs from "aws-cdk-lib/aws-logs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3assets from "aws-cdk-lib/aws-s3-assets";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import path from "node:path";

import { DBMigrationConstruct } from "./flyway-dbmigrator.js";

export interface sqlStackProps extends cdk.StackProps {
  readonly dbCluster: rds.DatabaseCluster;
  readonly dbMasterCreds: secretsmanager.ISecret;
  readonly encryptionKey: kms.IKey;
  readonly ephemeralStorageSize?: cdk.Size;
  readonly logGroup: logs.ILogGroup;
  readonly placeholders?: Record<string, string>;
  readonly secretPlaceHolders?: Record<string, secretsmanager.ISecret>;
  readonly vpc: ec2.IVpc;
}

export class SqlStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: sqlStackProps) {
    super(scope, id, props);

    const availabilityZones = this.availabilityZones.slice(0, 2);

    const vpcSubnets = props.vpc.selectSubnets({
      availabilityZones: availabilityZones,
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED
    });
    new DBMigrationConstruct(this, "DBMigrate2", {
      database: props.dbCluster,
      encryptionKey: props.encryptionKey,
      locations: new s3assets.Asset(this, `DataMigrationAssets2`, {
        deployTime: false,
        path: path.resolve(import.meta.dirname, "../data-migration/sql")
      }),
      logGroup: props.logGroup,
      masterPassword: props.dbMasterCreds,
      placeholders: props.placeholders,
      secretPlaceHolders: props.secretPlaceHolders,
      vpc: props.vpc,
      vpcSubnets: vpcSubnets
    });
  }
}
