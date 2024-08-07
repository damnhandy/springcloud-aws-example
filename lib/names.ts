export interface AppConfigOpts {
  readonly context: string;
  readonly name: string;
}

export class ParamNames {
  public static readonly APP_NAME = "demoapp";

  public static readonly SHARED_CONTEXT = "shared";

  public static readonly APP_ECR_REPO_NAME = ParamNames.envPath({
    context: "ecr",
    name: `apps/${ParamNames.APP_NAME}`
  });

  public static readonly FLYWAY_ECR_REPO_NAME = ParamNames.envPath({
    context: "ecr",
    name: "ci/flyway"
  });

  public static readonly FLYWAY_PROJECT_NAME = ParamNames.envPath({
    context: "codebuild",
    name: "flyway/name"
  });

  public static readonly VPC_ID = ParamNames.envPath({
    context: "vpc",
    name: `${ParamNames.APP_NAME}/id`
  });

  public static readonly KMS_ARN = ParamNames.envPath({
    context: "kms",
    name: `${ParamNames.APP_NAME}/arn`
  });

  public static readonly KMS_ID = ParamNames.envPath({
    context: "kms",
    name: `${ParamNames.APP_NAME}/id`
  });

  public static readonly ARTIFACTS_BUCKET_ARN = ParamNames.envPath({
    context: "s3",
    name: `artifacts/arn`
  });

  public static readonly ARTIFACTS_BUCKET_NAME = ParamNames.envPath({
    context: "s3",
    name: `artifacts/name`
  });

  public static readonly APP_LOG_GROUP = ParamNames.envPath({
    context: "logs",
    name: `application/${ParamNames.APP_NAME}`
  });

  public static readonly FLYWAY_LOG_GROUP = ParamNames.envPath({
    context: "logs",
    name: `application/flyway-custom-resource`
  });

  public static readonly PG_SG_ID = ParamNames.envPath({
    context: "security-groups",
    name: `postgres/${ParamNames.APP_NAME}/id`
  });

  public static readonly ENDPOINT_SG_ID = ParamNames.envPath({
    context: "security-groups",
    name: `postgres/vpc-endpoints/id`
  });

  public static readonly PG_ADMIN_SECRET = ParamNames.appSecretPath({
    context: ParamNames.APP_NAME,
    name: "dbadmin"
  });

  public static readonly DEMO_APP_USER_SECRET = ParamNames.appSecretPath({
    context: ParamNames.APP_NAME,
    name: "appuser2"
  });

  public static readonly JDBC_URL = ParamNames.appConfigPath({
    context: ParamNames.SHARED_CONTEXT,
    name: "jdbc/url"
  });

  public static readonly JDBC_PORT = ParamNames.appConfigPath({
    context: ParamNames.SHARED_CONTEXT,
    name: "jdbc/port"
  });

  public static readonly JDBC_HOSTNAME = ParamNames.appConfigPath({
    context: ParamNames.SHARED_CONTEXT,
    name: "jdbc/hostname"
  });

  public static readonly JDBC_READER_HOSTNAME = ParamNames.appConfigPath({
    context: ParamNames.SHARED_CONTEXT,
    name: "jdbc/reader-hostname"
  });

  static envPath(opts: AppConfigOpts): string {
    return `/env/${opts.context}/${opts.name}`;
  }

  static appConfigPath(opts: AppConfigOpts): string {
    return `/config/${opts.context}/${opts.name}`;
  }

  static appSecretPath(opts: AppConfigOpts): string {
    return `/secret/${opts.context}/${opts.name}`;
  }
}
