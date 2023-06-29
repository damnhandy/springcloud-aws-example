package com.damnhandy.functions.dbmigrator;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.CloudFormationCustomResourceEvent;
import com.amazonaws.services.lambda.runtime.tests.annotations.Event;
import me.madhead.aws_junit5.common.AWSClient;
import me.madhead.aws_junit5.s3.v2.S3;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.zapodot.junit.db.annotations.ConfigurationProperty;
import org.zapodot.junit.db.annotations.EmbeddedDatabase;
import org.zapodot.junit.db.annotations.EmbeddedDatabaseTest;
import org.zapodot.junit.db.common.CompatibilityMode;
import org.zapodot.junit.db.common.Engine;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.lambda.powertools.cloudformation.Response;
import software.amazon.lambda.powertools.parameters.SecretsProvider;

import javax.sql.DataSource;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@Disabled
@EmbeddedDatabaseTest(
        engine = Engine.H2,
        compatibilityMode = CompatibilityMode.PostgreSQL,
        name = "unitests",
        properties = {
                @ConfigurationProperty(name = "username", value = "testuser"),
                @ConfigurationProperty(name = "password", value = "dummypassword")
        })
@ExtendWith(S3.class)
@ExtendWith(MockitoExtension.class)
public class DBMigraorHandlerTests {

    @Mock
    Context mockContext;
    @AWSClient(endpoint = Endpoint.class)
    private S3Client s3Client;

    SecretsProvider secretsProvider = mock(SecretsProvider.class);

    @BeforeAll
    static void setUp() {
        System.setProperty("aws.region","us-east-1");
    }

    @ParameterizedTest
    @Event(value = "tests/migration-create.json",
           type = CloudFormationCustomResourceEvent.class)
    public void testOnCreate(CloudFormationCustomResourceEvent event,
                             final @EmbeddedDatabase Connection connection) throws Exception {
        when(secretsProvider.get(anyString(),any())).thenReturn(
                new DBSecret("postgres",
                        "localhost",
                        "postgres",
                        "dummypassword",
                        "unitests",
                        "5436", connection.getMetaData().getURL()));

        DBSecret secret = secretsProvider.get("/foo",DBSecret.class);
        Assertions.assertNotNull(s3Client);
        DBMigratorHandler handler = new DBMigratorHandler(secretsProvider);
        Response response = handler.handleRequest(event,mockContext);
        assertTrue(response.getStatus() == Response.Status.SUCCESS);
        try(final Statement statement = connection.createStatement();
            final ResultSet resultSet = statement.executeQuery("SELECT count(*) FROM cars")) {
            assertTrue(resultSet.next());
        }
    }

    @ParameterizedTest
    @Event(value = "tests/migration-update.json",
            type = CloudFormationCustomResourceEvent.class)
    public void testOnUpdate(CloudFormationCustomResourceEvent event) throws Exception {
        Assertions.assertNotNull(s3Client);
        DBMigratorHandler handler = new DBMigratorHandler();
        Response response = handler.handleRequest(event,mockContext);
        assertTrue(response.getStatus() == Response.Status.SUCCESS);
    }
}
