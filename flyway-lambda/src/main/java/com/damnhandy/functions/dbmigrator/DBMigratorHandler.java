package com.damnhandy.functions.dbmigrator;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.CloudFormationCustomResourceEvent;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import software.amazon.lambda.powertools.cloudformation.AbstractCustomResourceHandler;
import software.amazon.lambda.powertools.cloudformation.Response;
import software.amazon.lambda.powertools.parameters.ParamManager;
import software.amazon.lambda.powertools.parameters.SecretsProvider;


import java.util.UUID;

import static software.amazon.lambda.powertools.utilities.EventDeserializer.extractDataFrom;

public class DBMigratorHandler extends AbstractCustomResourceHandler {
    private SecretsProvider secretsProvider;
    private Logger logger = LogManager.getLogger();


    public DBMigratorHandler() {
        this.secretsProvider = ParamManager.getSecretsProvider();
    }

    public DBMigratorHandler(SecretsProvider secretsProvider) {
        this.secretsProvider = secretsProvider;
    }

    private DBSecret getSecret(CloudFormationCustomResourceEvent event) {
        return this.secretsProvider.get((String) event.getResourceProperties().get("masterSecret"),DBSecret.class);
    }

    @Override
    protected Response create(CloudFormationCustomResourceEvent event, Context context) {
        String physicalResourceId = "DBMigrator-" + UUID.randomUUID();

        try {
            /**
             * Get the CFN custom resource configuration properties.
             */
            ResourceConfiguration configuration = extractDataFrom(event).as(ResourceConfiguration.class);
            DBSecret dbSecret = getSecret(event);
            /**
             * Configure Flyway
             */
            var flyway = Flyway.configure().configuration(configuration.buildConfig(dbSecret)).load();
            flyway.baseline();
            flyway.validate();
            var result = flyway.migrate();
            return Response.builder()
                    .value(result)
                    .status(Response.Status.SUCCESS)
                    .physicalResourceId(physicalResourceId)
                    .build();
        }
        catch (Exception e) {
            return Response.builder()
                    .value(e)
                    .status(Response.Status.FAILED)
                    .physicalResourceId(physicalResourceId)
                    .build();
        }
    }

    @Override
    protected Response update(CloudFormationCustomResourceEvent event, Context context) {
        /**
         * Get the CFN custom resource configuration properties.
         */
        ResourceConfiguration configuration = extractDataFrom(event).as(ResourceConfiguration.class);
        /**
         * Configure Flyway
         */
        var flyway = Flyway.configure().configuration(configuration.buildConfig(getSecret(event))).load();
        flyway.validate();
        try {
            var result = flyway.migrate();
            return Response.builder()
                    .value(result)
                    .status(Response.Status.SUCCESS)
                    .physicalResourceId(event.getPhysicalResourceId())
                    .build();
        }
        catch (FlywayException e) {
            return Response.builder()
                    .value(e)
                    .status(Response.Status.FAILED)
                    .physicalResourceId(event.getPhysicalResourceId())
                    .build();
        }
    }

    @Override
    protected Response delete(CloudFormationCustomResourceEvent event, Context context) {
        return null;
    }


}


