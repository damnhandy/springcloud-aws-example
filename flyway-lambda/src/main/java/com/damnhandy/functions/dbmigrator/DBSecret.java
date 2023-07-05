package com.damnhandy.functions.dbmigrator;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Optional;

@JsonIgnoreProperties(ignoreUnknown = true)
public class DBSecret {

    private String engine;

    private String host;

    private String username;

    private String password;

    private String dbname;

    private String port;

    private Optional<String> jdbcUrl;

    @JsonCreator
    public DBSecret(@JsonProperty("engine") String engine,
                    @JsonProperty("host") String host,
                    @JsonProperty("username") String username,
                    @JsonProperty("password") String password,
                    @JsonProperty("dbname") String dbname,
                    @JsonProperty("port") String port) {
        this.engine = engine;
        this.host = host;
        this.username = username;
        this.password = password;
        this.dbname = dbname;
        this.port = port;
    }

    public DBSecret(String engine, String host, String username, String password, String dbname, String port,String jdbcUrl) {
        this(engine,host,username,password,dbname,port);
        this.jdbcUrl = Optional.of(jdbcUrl);
    }

    public String getEngine() {
        return engine;
    }

    public String getHost() {
        return host;
    }

    public String getUsername() {
        return username;
    }

    public String getPassword() {
        return password;
    }

    public String getDbname() {
        return dbname;
    }

    public String getPort() {
        return port;
    }

    public Optional<String> getJdbcUrl() {
        return jdbcUrl;
    }
}
