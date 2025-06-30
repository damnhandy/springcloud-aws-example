import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53profiles from "aws-cdk-lib/aws-route53profiles";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as vpclattice from "aws-cdk-lib/aws-vpclattice";
import { Construct } from "constructs";

import { ParamNames } from "./names.js";

export interface VpcStackProperties extends cdk.StackProps {
  readonly ipv4Cidr: string;
  readonly serviceNetworkArn: string;
}

export class VpcStack extends cdk.Stack {
  public readonly endpointSecurityGroup: ec2.ISecurityGroup;
  public readonly privateHostedZone: route53.IPrivateHostedZone;
  public readonly vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, properties: VpcStackProperties) {
    super(scope, id, properties);

    this.vpc = new ec2.Vpc(this, "DemoAppVpc", {
      availabilityZones: this.availabilityZones,
      createInternetGateway: false,
      defaultInstanceTenancy: ec2.DefaultInstanceTenancy.DEFAULT,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      gatewayEndpoints: {
        S3: {
          service: ec2.GatewayVpcEndpointAwsService.S3
        }
      },
      ipAddresses: ec2.IpAddresses.cidr(properties.ipv4Cidr),
      ipProtocol: ec2.IpProtocol.DUAL_STACK,
      ipv6Addresses: ec2.Ipv6Addresses.amazonProvided(),
      natGateways: 0,
      restrictDefaultSecurityGroup: true,
      subnetConfiguration: [
        {
          name: "default",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED
        }
      ],
      vpcName: "DemoAppVpc"
    });

    this.endpointSecurityGroup = new ec2.SecurityGroup(this, "EndpointSecurityGroup", {
      allowAllIpv6Outbound: false,
      allowAllOutbound: false,
      description: "Security group for VPC endpoints",
      disableInlineRules: true,
      vpc: this.vpc
    });
    this.endpointSecurityGroup.addIngressRule(
      this.endpointSecurityGroup,
      ec2.Port.HTTPS,
      "Allow HTTPS ingress for VPC endpoints"
    );
    cdk.Tags.of(this.endpointSecurityGroup).add("Name", "EndpointSecurityGroup");

    new ssm.StringParameter(this, "EndpointSecurityGroupParam", {
      description: "Security group ID for VPC endpoints",
      parameterName: ParamNames.ENDPOINT_SG_ID,
      stringValue: this.endpointSecurityGroup.securityGroupId
    });

    this.vpc.addInterfaceEndpoint("kms", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.KMS
    });

    this.vpc.addInterfaceEndpoint("ec2", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.EC2
    });

    this.vpc.addInterfaceEndpoint("ec2messages", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES
    });

    this.vpc.addInterfaceEndpoint("ecr", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.ECR
    });

    this.vpc.addInterfaceEndpoint("secretsmanager", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER
    });

    this.vpc.addInterfaceEndpoint("ssm", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.SSM
    });

    this.vpc.addInterfaceEndpoint("ssm-messages", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES
    });

    this.vpc.addInterfaceEndpoint("logs", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS
    });

    this.vpc.addInterfaceEndpoint("cloudwatch", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_MONITORING
    });

    this.vpc.addInterfaceEndpoint("cloudformation", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDFORMATION
    });

    this.vpc.addInterfaceEndpoint("ecs", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.ECS
    });

    this.vpc.addInterfaceEndpoint("ecr-docker", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER
    });

    this.vpc.addInterfaceEndpoint("ecs-telemetry", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.ECS_TELEMETRY
    });

    this.vpc.addInterfaceEndpoint("lambda", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.LAMBDA
    });

    this.vpc.addInterfaceEndpoint("elb", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.ELASTIC_LOAD_BALANCING
    });

    this.vpc.addInterfaceEndpoint("rds", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.RDS
    });

    this.vpc.addInterfaceEndpoint("rds-data", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.RDS_DATA
    });

    this.vpc.addInterfaceEndpoint("sts", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.STS
    });

    this.vpc.addInterfaceEndpoint("autoscaling", {
      securityGroups: [this.endpointSecurityGroup],
      service: ec2.InterfaceVpcEndpointAwsService.AUTOSCALING
    });

    this.vpc.addInterfaceEndpoint("vpc-lattice", {
      service: ec2.InterfaceVpcEndpointAwsService.VPC_LATTICE
    });

    const latticeSecurityGroup = new ec2.SecurityGroup(this, "LatticeSecurityGroup", {
      allowAllIpv6Outbound: false,
      allowAllOutbound: false,
      description: "Access to VPC Lattice Services",
      disableInlineRules: true,
      vpc: this.vpc
    });
    cdk.Tags.of(latticeSecurityGroup).add("Name", "LatticeSecurityGroup");

    latticeSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.HTTPS,
      "Allow HTTPS ingress for VPC endpoints"
    );
    latticeSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.HTTPS,
      "Allow HTTPS ingress for VPC endpoints"
    );

    latticeSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.HTTP,
      "Allow HTTP ingress for VPC endpoints"
    );
    latticeSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.HTTP,
      "Allow HTTP ingress for VPC endpoints"
    );

    new vpclattice.CfnServiceNetworkVpcAssociation(this, "ServiceNetworkAssociation", {
      securityGroupIds: [latticeSecurityGroup.securityGroupId],
      serviceNetworkIdentifier: properties.serviceNetworkArn,
      vpcIdentifier: this.vpc.vpcId
    });

    this.privateHostedZone = new route53.PrivateHostedZone(this, "PrivateHostedZone", {
      comment: "Private hosted zone for internal DNS resolution",
      vpc: this.vpc,
      zoneName: "apps.gs.internal"
    });

    new route53profiles.CfnProfileAssociation(this, "ProfileToVpcAssociation", {
      name: "DefaultProfileAssociation",
      profileId: "rp-ec1a84ce4d804ec9",
      resourceId: this.vpc.vpcId
    });
  }
}
