import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";

export class VpcStack extends cdk.Stack {
  public vpc: ec2.IVpc;
  public interfaceEndpoints: ec2.IInterfaceVpcEndpoint[];
  public gatewayEndpoints: ec2.IGatewayVpcEndpoint[];

  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2
    });
  }
}
