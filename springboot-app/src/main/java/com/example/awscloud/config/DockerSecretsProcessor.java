package com.example.awscloud.config;

import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLConnection;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Properties;
import org.overviewproject.mime_types.GetBytesException;
import org.overviewproject.mime_types.MimeTypeDetector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertiesPropertySource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.util.FileCopyUtils;

/**
 * <p>
 * A rudementary {@link EnvironmentPostProcessor} that reads
 * <a href="https://docs.docker.com/engine/swarm/secrets/">Docker Secrets</a> into the Spring environment. The
 * implementation looks for the existance of a root path of <code>/run/secrets/</code> and iterates over the directory,
 * reading each secret into the environment. Each secret is exposed under the prefix docker.secrets. Thus, given a
 * file path of /run/secrets/dbpassword, the property would be: docker.secrets.dbpassword.
 * </p>
 * <p>
 * If the mime type of the file contents is text based, it reads the contents of the file into value of the
 * property. If the contents are binary, such as JKS or PKCS12 file, we use the full path to the secret as it
 * is likely that this is being read as a file or URI, as is the case of the MySQL JDBC connection using TLS.
 * </p>
 */
@Profile("docker")
public class DockerSecretsProcessor implements EnvironmentPostProcessor {

  private static final Logger LOGGER = LoggerFactory.getLogger(DockerSecretsProcessor.class);

  @Override
  public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
    MimeTypeDetector mimeTypeDetector = new MimeTypeDetector();
    Path secretsRoot = Paths.get("/run/secrets/");
    if (Files.exists(secretsRoot)) {
      Properties properties = new Properties();
      try {
        Files
          .list(secretsRoot)
          .forEach(
            path -> {
              String absPath = path.toAbsolutePath().toString();
              FileSystemResource resource = new FileSystemResource(absPath);
              if (resource.exists()) {
                try {
                  // Sets the property name from /run/secrets/secret_name to docker.secrets.secret_name
                  String propertyName = absPath.replace("/", ".").replace(".run.", "docker.");
                  String mimeType = mimeTypeDetector.detectMimeType(path);
                  String value;
                  // if the contents of the secret is text-based, we read the contents and store it in the
                  // property graph. Otherwise, we use the path value as may be us
                  if ("text/plain".equals(mimeType) || "application/x-pem-file".equals(mimeType)) {
                    byte[] content = FileCopyUtils.copyToByteArray(resource.getFile());
                    value = new String(content, "UTF8");
                  } else {
                    value = resource.getFile().getAbsolutePath();
                  }
                  System.out.println(String.format("Adding property %s", propertyName));
                  properties.put(propertyName, value.trim());
                } catch (IOException | GetBytesException e) {
                  throw new RuntimeException(e);
                }
              }
            }
          );
      } catch (IOException e) {
        throw new RuntimeException(e);
      }
      environment.getPropertySources().addLast(new PropertiesPropertySource("docker_secrets", properties));
    }
  }
}
