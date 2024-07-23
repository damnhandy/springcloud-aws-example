import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as vpclattice from "aws-cdk-lib/aws-vpclattice";
import { Construct } from "constructs";
import { ParamNames } from "./names";

export interface VpcStackProps extends cdk.StackProps {
  readonly ipv4Cidr: string;
}

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly endpointSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: VpcStackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, "DemoAppVpc", {
      vpcName: "DemoAppVpc",
      availabilityZones: this.availabilityZones,
      natGateways: 0,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      createInternetGateway: false,
      restrictDefaultSecurityGroup: true,
      ipProtocol: ec2.IpProtocol.DUAL_STACK,
      ipAddresses: ec2.IpAddresses.cidr(props.ipv4Cidr),
      ipv6Addresses: ec2.Ipv6Addresses.amazonProvided(),
      defaultInstanceTenancy: ec2.DefaultInstanceTenancy.DEFAULT,
      gatewayEndpoints: {
        S3: {
          service: ec2.GatewayVpcEndpointAwsService.S3
        }
      },
      subnetConfiguration: [
        {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          name: "default"
        }
      ]
    });

    this.endpointSecurityGroup = new ec2.SecurityGroup(this, "EndpointSecurityGroup", {
      vpc: this.vpc,
      allowAllIpv6Outbound: false,
      allowAllOutbound: false,
      disableInlineRules: true,
      description: "Security group for VPC endpoints"
    });
    this.endpointSecurityGroup.addIngressRule(
      this.endpointSecurityGroup,
      ec2.Port.HTTPS,
      "Allow HTTPS ingress for VPC endpoints"
    );
    cdk.Tags.of(this.endpointSecurityGroup).add("Name", "EndpointSecurityGroup");

    new ssm.StringParameter(this, "EndpointSecurityGroupParam", {
      stringValue: this.endpointSecurityGroup.securityGroupId,
      parameterName: ParamNames.ENDPOINT_SG_ID,
      description: "Security group ID for VPC endpoints"
    });

    this.vpc.addInterfaceEndpoint("kms", {
      service: ec2.InterfaceVpcEndpointAwsService.KMS,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("ec2", {
      service: ec2.InterfaceVpcEndpointAwsService.EC2,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("ec2messages", {
      service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("ecr", {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("secretsmanager", {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("ssm", {
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("logs", {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("cloudwatch", {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_MONITORING,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("cloudformation", {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDFORMATION,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("ecs", {
      service: ec2.InterfaceVpcEndpointAwsService.ECS,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("ecr-docker", {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("ecs-telemetry", {
      service: ec2.InterfaceVpcEndpointAwsService.ECS_TELEMETRY,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("lambda", {
      service: ec2.InterfaceVpcEndpointAwsService.LAMBDA,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("elb", {
      service: ec2.InterfaceVpcEndpointAwsService.ELASTIC_LOAD_BALANCING,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("rds", {
      service: ec2.InterfaceVpcEndpointAwsService.RDS,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("rds-data", {
      service: ec2.InterfaceVpcEndpointAwsService.RDS_DATA,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("sts", {
      service: ec2.InterfaceVpcEndpointAwsService.STS,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("autoscaling", {
      service: ec2.InterfaceVpcEndpointAwsService.AUTOSCALING,
      securityGroups: [this.endpointSecurityGroup]
    });

    this.vpc.addInterfaceEndpoint("vpc-lattice", {
      service: ec2.InterfaceVpcEndpointAwsService.VPC_LATTICE
    });

    const latticeSecurityGroup = new ec2.SecurityGroup(this, "LatticeSecurityGroup", {
      vpc: this.vpc,
      allowAllIpv6Outbound: false,
      allowAllOutbound: false,
      disableInlineRules: true,
      description: "Access to VPC Lattice Services"
    });
    cdk.Tags.of(latticeSecurityGroup).add("Name", "LatticeSecurityGroup");
    latticeSecurityGroup.addIngressRule(
      ec2.Peer.prefixList("pl-07cbd8b5e26960eac"),
      ec2.Port.HTTPS,
      "Allow HTTPS ingress for VPC endpoints"
    );
    latticeSecurityGroup.addIngressRule(
      ec2.Peer.prefixList("pl-073555187c4e6ccf2"),
      ec2.Port.HTTPS,
      "Allow HTTPS ingress for VPC endpoints"
    );

    const serviceNetworkArn = this.node.tryGetContext("serviceNetworkArn");

    new vpclattice.CfnServiceNetworkVpcAssociation(this, "ServiceNetworkAssociation", {
      serviceNetworkIdentifier: serviceNetworkArn,
      vpcIdentifier: this.vpc.vpcId,
      securityGroupIds: [latticeSecurityGroup.securityGroupId]
    });
  }
}
