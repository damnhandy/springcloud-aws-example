package com.damnhandy.functions.dbmigrator;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DBDeploymentResponse(@JsonProperty("migrationSuccessful") Boolean migrationSuccessful,
                                   @JsonProperty("migrationsPerformed") Integer migrationsPerformed,
                                   @JsonProperty("flywayVersion") String flywayVersion) {
}
