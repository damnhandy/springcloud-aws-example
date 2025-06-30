import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as vpclattice from "aws-cdk-lib/aws-vpclattice";
import { Construct } from "constructs";

export interface ApplicationServiceStackProperties extends cdk.StackProps {
  readonly kmsKey: kms.IKey;
  readonly loadBalancer: lb.IApplicationLoadBalancer;
  readonly privateHostedZone: route53.IPrivateHostedZone;
  readonly serviceName: string;
  readonly serviceNetworkArn: string;
  readonly vpc: ec2.IVpc;
}

export class ApplicationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, properties: ApplicationServiceStackProperties) {
    super(scope, id, properties);

    const internalName = `${properties.serviceName}.apps.gs.internal`;

    const demoAppService = new vpclattice.CfnService(this, "DemoAppServiceInterface", {
      authType: "AWS_IAM",
      customDomainName: `${properties.serviceName}.apps.gs.internal`,
      name: `${properties.serviceName}-service-interface`
    });

    new route53.RecordSet(this, "DemoAppCNameRecord", {
      recordName: internalName,
      recordType: route53.RecordType.CNAME,
      target: route53.RecordTarget.fromValues(demoAppService.attrDnsEntryDomainName),
      zone: properties.privateHostedZone
    });

    new vpclattice.CfnAuthPolicy(this, "DemoAppServiceInterfaceAuthPolicy", {
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: ["vpc-lattice-svcs:Invoke", "vpc-lattice-svcs:Connect"],
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            resources: [`${demoAppService.attrArn}/*`]
          })
        ]
      }),
      resourceIdentifier: demoAppService.attrArn
    });

    const serviceLogGroup = new logs.LogGroup(this, "DemoAppServiceInterfaceLogGroup", {
      encryptionKey: properties.kmsKey,
      logGroupName: `/app/lattice/service/${demoAppService.name}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_WEEK
    });

    new vpclattice.CfnAccessLogSubscription(this, "DemoAppServiceInterfaceAccessLogSubscription", {
      destinationArn: serviceLogGroup.logGroupArn,
      resourceIdentifier: demoAppService.attrArn
    });

    const demoAppServiceTargetGroup = new vpclattice.CfnTargetGroup(
      this,
      "DemoAppServiceInterfaceTargetGroup",
      {
        config: {
          port: 80,
          protocol: "HTTP",
          protocolVersion: "HTTP1",
          vpcIdentifier: properties.vpc.vpcId
        },
        targets: [
          {
            id: properties.loadBalancer.loadBalancerArn,
            port: 80
          }
        ],
        type: "ALB"
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
      port: 80,
      protocol: "HTTP",
      serviceIdentifier: demoAppService.attrArn
    });

    const serviceNetworkArn = this.node.tryGetContext("serviceNetworkArn") as string;

    new vpclattice.CfnServiceNetworkServiceAssociation(this, `DemoAppServiceInterfaceAssociation`, {
      serviceIdentifier: demoAppService.attrArn,
      serviceNetworkIdentifier: serviceNetworkArn
    });
  }
}
