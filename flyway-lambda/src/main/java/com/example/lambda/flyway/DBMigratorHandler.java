package com.example.lambda.flyway;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.CloudFormationCustomResourceEvent;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;

public class DBMigratorHandler
  implements RequestHandler<CloudFormationCustomResourceEvent, MigrateResult> {

  @Override
  public MigrateResult handleRequest(CloudFormationCustomResourceEvent input, Context context) {
    var flyway = Flyway.configure().dataSource(url, user, password).load();
    flyway.validate();
    return flyway.migrate();
  }
}
