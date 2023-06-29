package com.damnhandy.functions.dbmigrator;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.flywaydb.core.api.configuration.Configuration;
import org.flywaydb.core.api.configuration.FluentConfiguration;

import java.util.Map;

@JsonIgnoreProperties({ "masterSecret" })
public class ResourceConfiguration {

    private String locations;

    private Map<String,String> placeHolders;

    private Boolean mixed = Boolean.FALSE;


    @JsonCreator
    public ResourceConfiguration(@JsonProperty("locations") String locations,
                                 @JsonProperty("placeHolders") Map<String, String> placeHolders,
                                 @JsonProperty("mixed") Boolean mixed) {
        this.locations = locations;
        this.placeHolders = placeHolders;
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

    public Configuration buildConfig(DBSecret masterDBSecret) {
        var jdbcUrl = String.format("jdbc:%s://%s:%s/%s",masterDBSecret.getEngine(),masterDBSecret.getHost(),masterDBSecret.getPort(),masterDBSecret.getDbname());

//        if(masterDBSecret.getJdbcUrl().isPresent()) {
//            jdbcUrl = masterDBSecret.getJdbcUrl().get();
//        }

        FluentConfiguration configuration = new FluentConfiguration();

        configuration.placeholders(this.getPlaceHolders())
                .dataSource(jdbcUrl, masterDBSecret.getUsername(), masterDBSecret.getPassword())
                     .mixed(this.getMixed())
                     .ignoreMigrationPatterns("*:pending")
                     .locations(this.getLocations());
        return configuration;
    }
}
