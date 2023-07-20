FROM registry.access.redhat.com/ubi8/ubi:8.8 as builder
# We don't use the RedHat JDK distribution as it's not structured as a
# modular JDK like OpenJDK or OracleJDK
ENV JVM_VERSION=jdk-17.0.7+7
RUN curl -LO https://github.com/adoptium/temurin17-binaries/releases/download/${JVM_VERSION}/OpenJDK17U-jdk_x64_linux_hotspot_17.0.7_7.tar.gz
RUN tar xzf OpenJDK17U-jdk_x64_linux_hotspot_17.0.7_7.tar.gz
RUN mv ${JVM_VERSION} /usr/local
ENV JAVA_HOME /usr/local/${JVM_VERSION}
ENV PATH ${JAVA_HOME}/bin:${PATH}

RUN curl -LO https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.7%2B7/OpenJDK17U-jre_x64_linux_hotspot_17.0.7_7.tar.gz

ENV TMP_ROOT=/chroot/app
RUN mkdir -p ${TMP_ROOT}/var/lib/rpm
RUN mkdir -p ${TMP_ROOT}/usr/local
RUN tar -xf OpenJDK17U-jre_x64_linux_hotspot_17.0.7_7.tar.gz -C ${TMP_ROOT}/usr/local

# Install the DNF plugins so we can run dnf download
RUN dnf install -y dnf-plugins-core
# Create the chroot directory

# Initialize the RPM DB in the chroot
RUN rpm --root ${TMP_ROOT} --initdb

# Download the RedHat release RPM
RUN dnf download --destdir=/var/tmp redhat-release

# Set the working directory
WORKDIR /var/tmp
# Install the RHEL Release RPM
RUN rpm --root ${TMP_ROOT} -ivh --nodeps redhat-release*rpm
# DNF or YUM doesn't seem to work unless there is not a repo file in the
# chroot directory. Curiously, this isn't needed on CentOS 8 or Fedora 34
# where it seems to use the configuration on the host OS.
RUN mkdir -p "${TMP_ROOT}/etc/yum.repos.d/"
RUN cp -r "/etc/yum.repos.d/ubi.repo" "${TMP_ROOT}/etc/yum.repos.d/ubi.repo"
RUN dnf --installroot=${TMP_ROOT} -y install coreutils glibc-locale-source glibc-langpack-en \
  --releasever 8 \
  --setopt=install_weak_deps=False \
  --setopt=tsflags=nodocs \
  --setopt=override_install_langs=en_US.utf8

RUN echo "LANG=C.utf8" > ${TMP_ROOT}/etc/locale.conf

# Build the Java project
COPY ./ /opt/project
WORKDIR /opt/project
RUN ./gradlew clean build -x test --no-daemon --stacktrace

# Add the RDS root certs so we can make connections to RDS over TLS when running in AWS
RUN curl -L https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem -o us-east-1-bundle.pem
RUN keytool -importcert -alias AWS-RDS -file us-east-1-bundle.pem -keystore \
  ${TMP_ROOT}/usr/local/${JVM_VERSION}-jre/lib/security/cacerts -storetype pkcs12 -noprompt -storepass changeit

RUN groupadd -r appuser --root ${TMP_ROOT}
RUN useradd -r appuser -G appuser --root ${TMP_ROOT}
# Clean up the caches.
RUN dnf clean all --installroot=${TMP_ROOT}
RUN find "${TMP_ROOT}/var/cache/dnf" -mindepth 1 -delete
RUN find "${TMP_ROOT}/tmp" -mindepth 1 -delete

# Build our final container by copying the contents to /chroot/app to
# a scratch contaner and then layering on the SpringBoot application.
FROM scratch
COPY --from=builder /chroot/app /
COPY --from=builder --chown=appuser:appuser /opt/project/build/libs/springboot-app-1.0.0.jar /opt/app/springboot-app.jar
# Creating symlinks to /dev/stdout so that all logs are sent to the containers logstream.
RUN mkdir -p /var/log/demoapp \
  && ln -s /dev/stdout /var/log/demoapp/access_log \
  && ln -s /dev/stdout /var/log/demoapp/access_log_management \
  && ln -s /usr/local/jdk-17.0.7+7-jre /usr/local/jre \
  && chown -R appuser:appuser /var/log/demoapp
ENV LANG=en_US.UTF-8 \
  LANGUAGE=en_US:en \
  LC_ALL=en_US.UTF-8 \
  JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8" \
  PATH=/usr/local/jre/bin:${PATH}
USER appuser:appuser
ENTRYPOINT [ "java","-jar","/opt/app/springboot-app.jar"]
