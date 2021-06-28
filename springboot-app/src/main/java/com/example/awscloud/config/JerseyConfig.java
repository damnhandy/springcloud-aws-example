package com.example.awscloud.config;

import com.example.awscloud.resources.CarResource;
import org.glassfish.jersey.server.ResourceConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.AbstractEnvironment;
import org.springframework.core.env.EnumerablePropertySource;
import org.springframework.core.env.Environment;
import org.springframework.core.env.MutablePropertySources;

import java.util.Arrays;
import java.util.stream.StreamSupport;

/**
 * <p>
 *     Spring Configuration for Jersey
 * </p>
 */
@Configuration
public class JerseyConfig extends ResourceConfig {

    private static final Logger LOGGER = LoggerFactory.getLogger(JerseyConfig.class);

    Environment environment;

    public JerseyConfig(Environment environment) {
        this.environment = environment;
        register(CarResource.class);
    }
}
