package com.damnhandy.functions.dbmigrator;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.flywaydb.core.api.configuration.Configuration;
import org.flywaydb.core.api.configuration.FluentConfiguration;
import software.amazon.lambda.powertools.parameters.SecretsProvider;
import software.amazon.lambda.powertools.parameters.transform.JsonTransformer;

import java.nio.file.Path;
import java.util.Map;

@JsonIgnoreProperties({ "masterSecret","ServiceToken" })
public class ResourceConfiguration {
    private static final Logger logger = LogManager.getLogger(ResourceConfiguration.class);
    private String locations;

    private Map<String,String> placeHolders;

    private Map<String,String> secretPlaceHolders;

    private Boolean mixed;


    @JsonCreator
    public ResourceConfiguration(@JsonProperty("locations") String locations,
                                 @JsonProperty("placeHolders") Map<String, String> placeHolders,
                                 @JsonProperty("secretPlaceHolders") Map<String, String> secretPlaceHolders,
                                 @JsonProperty("mixed") Boolean mixed) {
        this.locations = locations;
        this.placeHolders = placeHolders;
        this.secretPlaceHolders = secretPlaceHolders;
        this.mixed = mixed;
    }

    public String getLocations() {
        return locations;
    }

    public Map<String, String> getPlaceHolders() {
        return placeHolders;
    }

    public Boolean getMixed() {
        return mixed;
    }


    public Map<String, String> getSecretPlaceHolders() {
        return secretPlaceHolders;
    }

    public Configuration buildConfig(DBSecret masterDBSecret, Path localSqlLocation, SecretsProvider secretsProvider) {
        var jdbcUrl = String.format("jdbc:%s://%s:%s/%s?ssl=true?sslmode=verify-ca",
                "postgresql",
                masterDBSecret.getHost(),
                masterDBSecret.getPort(),
                masterDBSecret.getDbname());
        this.resolveSecretValues(secretsProvider);
        FluentConfiguration configuration = new FluentConfiguration();

        configuration.placeholders(this.getPlaceHolders())
                .dataSource(jdbcUrl, masterDBSecret.getUsername(), masterDBSecret.getPassword())
                     .mixed(this.getMixed())
                     .ignoreMigrationPatterns("*:pending")
                     .locations("filesystem:".concat(localSqlLocation.toString()));
        logger.debug("Dumpling place holders:");
        configuration.getPlaceholders().forEach((key, value) -> {
            logger.debug("Key: {} Value: {}",key,value);
        });
        return configuration;
    }

    private void resolveSecretValues(SecretsProvider secretsProvider) {
        this.secretPlaceHolders.forEach((key, value) -> {
            DBSecret dbSecret = secretsProvider
                    .withTransformation(JsonTransformer.class)
                    .get(value,DBSecret.class);
            logger.debug("Adding secret placeholder for: {}",key);
            this.placeHolders.put(key,dbSecret.getPassword());
        });

    }
}
