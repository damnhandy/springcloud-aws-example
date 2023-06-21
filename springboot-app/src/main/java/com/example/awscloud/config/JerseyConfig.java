package com.example.awscloud.config;

import com.example.awscloud.resources.CarResource;
import org.glassfish.jersey.server.ResourceConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;

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
