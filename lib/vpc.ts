import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import { IConstruct } from "@aws-cdk/core";

/**
 *
 */
export interface IBasicNetworking extends IConstruct {
  readonly vpc: ec2.IVpc;

  readonly gatewayEndpoints: ec2.IGatewayVpcEndpoint[];
}

/**
 *
 */
export class BasicNetworking extends cdk.Construct implements IBasicNetworking{

  public vpc: ec2.IVpc;
  public gatewayEndpoints: ec2.IGatewayVpcEndpoint[];

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2
    });

    this.gatewayEndpoints = [];

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