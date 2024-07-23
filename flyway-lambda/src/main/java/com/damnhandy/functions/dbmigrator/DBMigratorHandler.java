package com.damnhandy.functions.dbmigrator;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.CloudFormationCustomResourceEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.module.paramnames.ParameterNamesModule;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.flywaydb.core.api.output.MigrateResult;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Uri;
import software.amazon.awssdk.services.s3.S3Utilities;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.lambda.powertools.cloudformation.AbstractCustomResourceHandler;
import software.amazon.lambda.powertools.cloudformation.Response;
import software.amazon.lambda.powertools.logging.LoggingUtils;
import software.amazon.lambda.powertools.parameters.ParamManager;
import software.amazon.lambda.powertools.parameters.SecretsProvider;
import software.amazon.lambda.powertools.parameters.transform.JsonTransformer;

import java.io.IOException;
import java.net.URI;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

import static software.amazon.lambda.powertools.utilities.EventDeserializer.extractDataFrom;

/**
 * This is lambda function that backs a CDK custom resource that performs database migrations using
 * Flyway Community.
 */
public class DBMigratorHandler extends AbstractCustomResourceHandler {
    private static final Logger logger = LogManager.getLogger(DBMigratorHandler.class);

    /**
     * Customizing the object mapper so that it can use Java 8+ features
     */
    private static final ObjectMapper objectMapper = new ObjectMapper();

    static {
        objectMapper.registerModule(new ParameterNamesModule())
                .registerModule(new Jdk8Module())
                .registerModule(new JavaTimeModule());
        LoggingUtils.defaultObjectMapper(objectMapper);
    }

    private SecretsProvider secretsProvider;


    private S3Client s3Client;

    public DBMigratorHandler() {
        super();
        this.secretsProvider = ParamManager.getSecretsProvider();
        this.s3Client = S3Client.builder()
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }

    /**
     * Constructor mainly used for unit testing so that we can provide Mock implementations.
     * @param secretsProvider
     * @param s3Client
     */
    public DBMigratorHandler(SecretsProvider secretsProvider,
                             S3Client s3Client) {
        super();
        this.secretsProvider = secretsProvider;
        this.s3Client = s3Client;
    }

    private DBSecret getSecret(CloudFormationCustomResourceEvent event) {
        var secretName = (String) event.getResourceProperties().get("masterSecret");
        logger.debug(String.format("Getting secret %s",secretName));
        DBSecret dbSecret = this.secretsProvider
                .withTransformation(JsonTransformer.class)
                .get(secretName,DBSecret.class);
        return dbSecret;
    }

    @Override
    protected Response create(CloudFormationCustomResourceEvent event, Context context) {
        String physicalResourceId = "DBMigrator-" + UUID.randomUUID();
        logger.info("Pre-execute....");
        return this.execute(event,context, physicalResourceId);
    }

    @Override
    protected Response update(CloudFormationCustomResourceEvent event, Context context) {
        return this.execute(event,context, event.getPhysicalResourceId());
    }

    /**
     * As both update and create events are very similar, this method encapsulates the core functionality of the
     * two events.
     * @param event the CloudFormationCustomResourceEvent
     * @param context the lambda execution context
     * @param physicalResourceId The create method will always define a new physicalResourceId while the update method
     *                           will obtain it from the event.
     * @return
     */
    protected Response execute(CloudFormationCustomResourceEvent event, Context context, String physicalResourceId) {
        ResourceConfiguration configuration = extractDataFrom(event).as(ResourceConfiguration.class);
        DBSecret dbSecret = getSecret(event);
        logger.debug(String.format("configuring flyway with username %s ...",dbSecret.getUsername()));
        Path sqlLocation;
        try {
            S3Utilities s3Utilities = s3Client.utilities();
            S3Uri s3Uri = s3Utilities.parseUri(URI.create(configuration.getLocations()));
            sqlLocation = copySqlFilesFromS3(s3Uri);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        try {

            var flyway = Flyway.configure()
                    .configuration(configuration.buildConfig(dbSecret,sqlLocation,this.secretsProvider))
                    .load();
            logger.info("Checking Flyway info....");
            var info = flyway.info();
            logger.info("Flyway Info: {}",info.getInfoResult().toString());
            logger.info("validating SQL....");
            flyway.validate();
            logger.info("Validation successful");
            MigrateResult result = flyway.migrate();
            var response = new DBDeploymentResponse(result.success,result.migrationsExecuted,result.flywayVersion);
            logger.info("Migration result: {}", result.success);
            return Response.builder()
                    .value(response)
                    .status(Response.Status.SUCCESS)
                    .physicalResourceId(physicalResourceId)
                    .objectMapper(objectMapper)
                    .build();
        }
        catch (Exception e) {
            logger.fatal(e);
            return Response.builder()
                    .value(Map.of("Exception",e.getMessage()))
                    .status(Response.Status.FAILED)
                    .physicalResourceId(physicalResourceId)
                    .objectMapper(objectMapper)
                    .build();
        }
    }

    @Override
    protected Response delete(CloudFormationCustomResourceEvent event, Context context) {
        return Response.success(event.getPhysicalResourceId());
    }

    /**
     * Copies the SQL files defined in the S3 asset into the lambdas tmp directory.
     * @param s3Uri the S3 URI of the CDK Asset that contains the ZIP archive of the migration files
     * @return the path where the SQL files have been unzipped to.
     * @throws IOException
     */
    private Path copySqlFilesFromS3(S3Uri s3Uri) throws IOException {
        // Download the CDK aseet to ephemeral lambda storage in /tmp
        var filename = s3Uri.key().orElseThrow();
        Path downloadLocation = getSqlAsset(s3Uri);
        var dirname = filename.substring(0,filename.length() - 4);
        // Unzip the CDK asset containing the SQL files to ephemeral lambda storage in /tmp
        Path sqlOutput = Files.createTempDirectory(dirname);
        UnzipUtil.unzip(downloadLocation.toAbsolutePath(), sqlOutput.toAbsolutePath());
        logger.info("SQL package extracted to {}", sqlOutput.toAbsolutePath());
        if(isDirEmpty(sqlOutput)) {
            throw new RuntimeException("SQL Output Dir is empty");
        }
        return sqlOutput;
    }

    /**
     * Downloads the CDK asset containing the Flyway migration scripts to /tmp
     * @param s3Uri the location of the S3 asset
     * @return the Path of the local copy of the ZIP archive
     * @throws IOException
     */
    private Path getSqlAsset(S3Uri s3Uri) throws IOException {
        var filename = s3Uri.key().orElseThrow();
        var downloadLocation = Files.createFile(Paths.get("/tmp",filename));
        var objectRequest = GetObjectRequest
                .builder()
                .key(s3Uri.key().orElseThrow())
                .bucket(s3Uri.bucket().orElseThrow())
                .build();

        try {
            var objectBytes = s3Client.getObjectAsBytes(objectRequest);
            byte[] data = objectBytes.asByteArray();
            try(var os = Files.newOutputStream(downloadLocation)) {
                os.write(data);
            };
        } catch (Exception e) {
            logger.fatal("Could not get S3 Asset", e);
            throw new IOException(e);
        }
        return downloadLocation;
    }

    /**
     * Check that a directory contains files or not
     * @param path the path of the directory
     * @return true if the directory contains files.
     * @throws IOException
     */
    public boolean isDirEmpty(Path path) throws IOException {
        if (Files.isDirectory(path)) {
            try (DirectoryStream<Path> directory = Files.newDirectoryStream(path)) {
                return !directory.iterator().hasNext();
            }
        }
        return false;
    }

}


