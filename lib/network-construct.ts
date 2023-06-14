import * as ec2 from "aws-cdk-lib/aws-ec2";
import { ISecurityGroup } from "aws-cdk-lib/aws-ec2";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { ParamNames } from "./names";
/**
 *
 */
export interface IBasicNetworking extends Construct {
  readonly vpc: ec2.IVpc;

  readonly gatewayEndpoints: ec2.IGatewayVpcEndpoint[];
  readonly interfaceEndpoints: ec2.IInterfaceVpcEndpoint[];

  /**
   *
   * @param securityGroup
   */
  addEgressToVpcServiceEndpoint(securityGroup: ISecurityGroup): void;
}

/**
 *
 */
export class BasicNetworking extends Construct implements IBasicNetworking {
  public vpc: ec2.IVpc;
  public gatewayEndpoints: ec2.IGatewayVpcEndpoint[];
  public interfaceEndpoints: ec2.IInterfaceVpcEndpoint[];

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, "Vpc", {});

    new StringParameter(this, "VpcIdParam", {
      description: "DemoApp VPC",
      parameterName: ParamNames.VPC_ID,
      stringValue: this.vpc.vpcId
    });

    this.gatewayEndpoints = [];
    this.interfaceEndpoints = [];

    this.gatewayEndpoints.push(
      this.vpc.addGatewayEndpoint(this.getGatewayServiceName(ec2.GatewayVpcEndpointAwsService.S3), {
        service: ec2.GatewayVpcEndpointAwsService.S3
      })
    );

    this.addInterfaceEndpoints(
      ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH,
      ec2.InterfaceVpcEndpointAwsService.SSM,
      ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      ec2.InterfaceVpcEndpointAwsService.ECS,
      ec2.InterfaceVpcEndpointAwsService.ECR,
      ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      ec2.InterfaceVpcEndpointAwsService.CODEBUILD
    );
  }

  addInterfaceEndpoints(...services: ec2.InterfaceVpcEndpointAwsService[]): void {
    for (const service of services) {
      const serviceId = service.name.split(".").pop() as string;
      const endpoint = this.vpc.addInterfaceEndpoint(serviceId, {
        service
      });
      this.interfaceEndpoints.push(endpoint);
    }
  }

  getGatewayServiceName(service: ec2.GatewayVpcEndpointAwsService): string {
    return service.name.split(".").pop() as string;
  }

  addEgressToVpcServiceEndpoint(securityGroup: ISecurityGroup): void {
    for (const service of this.interfaceEndpoints) {
      securityGroup.connections.allowTo(service, ec2.Port.tcp(443));
    }
  }
}
