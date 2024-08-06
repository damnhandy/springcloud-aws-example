import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";

import { Construct } from "constructs";

export interface EC2TesterStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
  readonly endpointSecurityGroup: ec2.ISecurityGroup;
}
/**
 * This stack is used to test the shared VPC. It creates an EC2 instance in the infra VPC only in experimental deployments only.
 */
export class EC2TesterStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EC2TesterStackProps) {
    super(scope, id, props);

    const vpc = props.vpc;

    const role = new iam.Role(this, "InstanceRoleWithSsmPolicy", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com")
    });
    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
    );
    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("PowerUserAccess"));

    const sg = new ec2.SecurityGroup(this, "InstanceSecurityGroup", {
      vpc: vpc,
      allowAllOutbound: true,
      disableInlineRules: true
    });
    sg.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(22),
      "Allow all traffic within the security group"
    );

    const instance = new ec2.Instance(this, "TestInstance", {
      vpc: vpc,
      vpcSubnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      role: role,
      securityGroup: sg,
      userDataCausesReplacement: true
    });
    instance.connections.allowFrom(props.endpointSecurityGroup, ec2.Port.tcp(443));
    instance.connections.allowTo(props.endpointSecurityGroup, ec2.Port.tcp(443));
  }
}
