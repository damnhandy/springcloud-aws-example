package com.example.awscloud.config;

import com.example.awscloud.resources.CarResource;
import java.util.Arrays;
import java.util.stream.StreamSupport;
import org.glassfish.jersey.server.ResourceConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.AbstractEnvironment;
import org.springframework.core.env.EnumerablePropertySource;
import org.springframework.core.env.Environment;
import org.springframework.core.env.MutablePropertySources;

/**
 * <p>
 *     Spring Configuration for Jersey
 * </p>
 */
@Configuration
public class JerseyConfig extends ResourceConfig {

  private static final Logger LOGGER = LoggerFactory.getLogger(JerseyConfig.class);

  public JerseyConfig() {
    register(CarResource.class);
  }
}
