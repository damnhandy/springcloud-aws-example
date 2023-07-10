package com.example.awscloud;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;

@SpringBootApplication
public class AwscloudApplication {

  private static final Logger log = LogManager.getLogger(AwscloudApplication.class);

  public static void main(String[] args) {
    SpringApplication.run(AwscloudApplication.class, args);
  }

  @Bean
  ApplicationRunner applicationRunner(Environment environment) {
    return args -> {
      log.info("JDBC URL: {}",environment.getProperty("spring.datasource.url"));
    };
  }
}
