import * as cdk from "@aws-cdk/core";
import { Construct, Duration, RemovalPolicy } from "@aws-cdk/core";
import * as ecr from "@aws-cdk/aws-ecr";
import { TagStatus } from "@aws-cdk/aws-ecr";
import * as iam from "@aws-cdk/aws-iam";
import { Effect } from "@aws-cdk/aws-iam";

/**
 *
 */
export interface EcrRepoProps extends cdk.StackProps {
  /**
   * The name of the repo
   */
  readonly repositoryName: string;
  readonly withCodeBuildPolicy: boolean;
  readonly maxImageCount?: number;
  readonly maxImageAge?: number;
}

/**
 * Simple
 */
export class EcrRepo extends Construct {
  public repository: ecr.IRepository;
  props: EcrRepoProps;
  constructor(scope: Construct, id: string, props: EcrRepoProps) {
    super(scope, id);
    this.props = props;

    this.repository = new ecr.Repository(this, "ECRRepo", {
      repositoryName: this.props.repositoryName,
      imageScanOnPush: true,
      removalPolicy: RemovalPolicy.SNAPSHOT,
      lifecycleRules: [
        {
          description:
            "Limits the number of days that a tagged container image can reside in the repo. " +
            "The default is 120 days",
          maxImageAge: this.getMaxAge(),
          rulePriority: 100,
          tagStatus: TagStatus.ANY
        },
        {
          description:
            "Limits the number of untagged images that sit in the repo. The default is 20." +
            "Typically, untagged images are not referenced.",
          maxImageCount: this.getMaxImageCount(),
          rulePriority: 50,
          tagStatus: TagStatus.UNTAGGED
        }
      ]
    });

    // Required for ECR repos that will be used by CodeBuild
    if (this.props.withCodeBuildPolicy) {
      this.repository.addToResourcePolicy(
        new iam.PolicyStatement({
          principals: [new iam.ServicePrincipal("codebuild.amazonaws.com")],
          effect: Effect.ALLOW,
          actions: [
            "ecr:GetDownloadUrlForLayer",
            "ecr:BatchGetImage",
            "ecr:BatchCheckLayerAvailability"
          ]
        })
      );
    }
  }

  getMaxAge(): Duration {
    if (this.props.maxImageAge == undefined) {
      return Duration.days(120);
    }
    return Duration.days(this.props.maxImageAge);
  }

  getMaxImageCount(): number {
    if (this.props.maxImageCount == undefined) {
      return 20;
    }
    return this.props.maxImageCount;
  }
}
