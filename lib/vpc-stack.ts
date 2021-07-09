import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";

export class VpcStack extends cdk.Stack {
  public vpc: ec2.IVpc;
  public gatewayEndpoints: ec2.IGatewayVpcEndpoint[];
  public interfaceEndpoints: ec2.IInterfaceVpcEndpoint[];

  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 1
    });

    this.gatewayEndpoints.push(
      this.vpc.addGatewayEndpoint(getGatewayServiceName(ec2.GatewayVpcEndpointAwsService.S3), {
        service: ec2.GatewayVpcEndpointAwsService.S3
      })
    );

    function getGatewayServiceName(service: ec2.GatewayVpcEndpointAwsService): string {
      return service.name.split(".").pop() as string;
    }
  }
}
