package com.example.awscloud.config;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertiesPropertySource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.util.FileCopyUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Properties;

/**
 * <p>
 * A ridementary {@link EnvironmentPostProcessor} that reads
 * <a href="https://docs.docker.com/engine/swarm/secrets/">Docker Secrets</a> into the Spring environment. The
 * implementation looks for the existance of the path <code>/run/secrets/</code> and iterates over the directory,
 * reading each secret into the environment. Each secret is exposed under the prefix docker.secrets. Thus, given a
 * file path of /run/secrets/dbpassword, the property would be: docker.secrets.dbpassword.
 * </p>
 */
@Profile("docker")
public class DockerSecretsProcessor implements EnvironmentPostProcessor {
    private static final Logger LOGGER = LoggerFactory.getLogger(DockerSecretsProcessor.class);

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Path secretsRoot = Paths.get("/run/secrets/");
        if(Files.exists(secretsRoot)) {
            Properties properties = new Properties();
            try {
                Files.list(secretsRoot).forEach(path -> {
                    String absPath = path.toAbsolutePath().toString();
                    FileSystemResource resource = new FileSystemResource(absPath);
                    if (resource.exists()) {
                        try {
                            // Sets the path name from /run/secrets/secret_name to docker.secrets.secret_name
                            String propertyName = absPath.replace("/",".")
                                                         .replace(".run.","docker.");
                            byte[] content = FileCopyUtils.copyToByteArray(resource.getFile());
                            String value = new String(content,"UTF8");
                            System.out.println(String.format("Adding property %s with value: %s", propertyName, value.trim()));
                            properties.put(propertyName, value);
                        } catch (IOException e) {
                            throw new RuntimeException(e);
                        }
                    }
                });
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
            environment.getPropertySources().addLast(new PropertiesPropertySource("docker_secrets", properties));
        }
        else {
            System.out.println("Skipping docker secrets");
        }

    }
}
