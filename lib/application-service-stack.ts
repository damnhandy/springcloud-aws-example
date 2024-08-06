import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";

import * as lb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as vpclattice from "aws-cdk-lib/aws-vpclattice";
import { Construct } from "constructs";

export interface ApplicationServiceStackProps extends cdk.StackProps {
  readonly serviceName: string;
  readonly vpc: ec2.IVpc;
  readonly kmsKey: kms.IKey;
  readonly serviceNetworkArn: string;
  readonly privateHostedZone: route53.IPrivateHostedZone;
  readonly loadBalancer: lb.IApplicationLoadBalancer;
}

export class ApplicationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApplicationServiceStackProps) {
    super(scope, id, props);

    const internalName = `${props.serviceName}.apps.gs.internal`;

    const demoAppService = new vpclattice.CfnService(this, "DemoAppServiceInterface", {
      name: `${props.serviceName}-service-interface`,
      authType: "AWS_IAM",
      customDomainName: `${props.serviceName}.apps.gs.internal`
    });

    new route53.RecordSet(this, "DemoAppCNameRecord", {
      zone: props.privateHostedZone,
      recordName: internalName,
      recordType: route53.RecordType.CNAME,
      target: route53.RecordTarget.fromValues(demoAppService.attrDnsEntryDomainName)
    });

    new vpclattice.CfnAuthPolicy(this, "DemoAppServiceInterfaceAuthPolicy", {
      resourceIdentifier: demoAppService.attrArn,
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: ["vpc-lattice-svcs:Invoke", "vpc-lattice-svcs:Connect"],
            resources: [`${demoAppService.attrArn}/*`],
            principals: [new iam.AnyPrincipal()],
            effect: iam.Effect.ALLOW
          })
        ]
      })
    });

    const serviceLogGroup = new logs.LogGroup(this, "DemoAppServiceInterfaceLogGroup", {
      encryptionKey: props.kmsKey,
      logGroupName: `/app/lattice/service/${demoAppService.name}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    new vpclattice.CfnAccessLogSubscription(this, "DemoAppServiceInterfaceAccessLogSubscription", {
      destinationArn: serviceLogGroup.logGroupArn,
      resourceIdentifier: demoAppService.attrArn
    });

    const demoAppServiceTargetGroup = new vpclattice.CfnTargetGroup(
      this,
      "DemoAppServiceInterfaceTargetGroup",
      {
        type: "ALB",
        targets: [
          {
            id: props.loadBalancer.loadBalancerArn,
            port: 80
          }
        ],
        config: {
          port: 80,
          protocol: "HTTP",
          protocolVersion: "HTTP1",
          vpcIdentifier: props.vpc!.vpcId
        }
      }
    );

    new vpclattice.CfnListener(this, `DemoAppServiceInterfaceListener`, {
      defaultAction: {
        forward: {
          targetGroups: [
            {
              targetGroupIdentifier: demoAppServiceTargetGroup.attrId
            }
          ]
        }
      },
      protocol: "HTTP",
      port: 80,
      serviceIdentifier: demoAppService.attrArn
    });

    const serviceNetworkArn = this.node.tryGetContext("serviceNetworkArn");

    new vpclattice.CfnServiceNetworkServiceAssociation(this, `DemoAppServiceInterfaceAssociation`, {
      serviceIdentifier: demoAppService.attrArn,
      serviceNetworkIdentifier: serviceNetworkArn
    });
  }
}
