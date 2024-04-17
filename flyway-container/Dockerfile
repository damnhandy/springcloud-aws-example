FROM registry.access.redhat.com/ubi8/ubi:8.8 as builder
# We don't use the RedHat JDK distribution as it's not structured as a
# modular JDK like OpenJDK or OracleJDK
ENV TMP_ROOT=/chroot/app
ENV FLYWAY_VERSION 9.20.0

# Install the DNF plugins so we can run dnf download
RUN dnf install -y dnf-plugins-core
# Create the chroot directory
RUN mkdir -p ${TMP_ROOT}/var/lib/rpm
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
RUN dnf --installroot=${TMP_ROOT} -y install coreutils glibc-locale-source glibc-langpack-en findutils \
  --releasever 8 \
  --setopt=install_weak_deps=False \
  --setopt=tsflags=nodocs \
  --setopt=override_install_langs=en_US.utf8

ENV JVM_VERSION=jdk-17.0.7+7
RUN curl -LO https://github.com/adoptium/temurin17-binaries/releases/download/${JVM_VERSION}/OpenJDK17U-jdk_x64_linux_hotspot_17.0.7_7.tar.gz
RUN tar xzf OpenJDK17U-jdk_x64_linux_hotspot_17.0.7_7.tar.gz
RUN mv ${JVM_VERSION} ${TMP_ROOT}/usr/local
ENV JAVA_HOME /usr/local/${JVM_VERSION}
ENV PATH ${JAVA_HOME}/bin:${PATH}

#RUN curl -L https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/${FLYWAY_VERSION}/flyway-commandline-${FLYWAY_VERSION}.tar.gz.sha1 -o flyway-commandline-${FLYWAY_VERSION}.tar.gz.sha1
RUN curl -L https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/${FLYWAY_VERSION}/flyway-commandline-${FLYWAY_VERSION}.tar.gz -o flyway-commandline-${FLYWAY_VERSION}.tar.gz
#RUN cat flyway-commandline-${FLYWAY_VERSION}.tar.gz.sha1
#RUN sha1sum -c flyway-commandline-${FLYWAY_VERSION}.tar.gz.sha1
RUN mkdir ${TMP_ROOT}/flyway
RUN tar -xzf flyway-commandline-${FLYWAY_VERSION}.tar.gz --strip-components=1 -C ${TMP_ROOT}/flyway

# Add the RDS root certs so we can make connections to RDS over TLS
RUN curl -L https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem -o us-east-1-bundle.pem
RUN ${TMP_ROOT}/usr/local/${JVM_VERSION}/bin/keytool -importcert -alias AWS-RDS -file us-east-1-bundle.pem -keystore \
  ${TMP_ROOT}/usr/local/${JVM_VERSION}/lib/security/cacerts -storetype pkcs12 -noprompt -storepass changeit

RUN chmod +x ${TMP_ROOT}/flyway/flyway
RUN ln -s ${TMP_ROOT}/flyway/flyway ${TMP_ROOT}/usr/local/bin/flyway

RUN echo "LANG=C.utf8" > ${TMP_ROOT}/etc/locale.conf

RUN groupadd -r flywayuser --root ${TMP_ROOT}
RUN useradd -r flywayuser -G flywayuser --root ${TMP_ROOT}
# Clean up the caches.
RUN dnf clean all --installroot=${TMP_ROOT}
RUN find "${TMP_ROOT}/var/cache/dnf" -mindepth 1 -delete
RUN find "${TMP_ROOT}/tmp" -mindepth 1 -delete

# Build our final container by copying the contents to /chroot/app to
# a scratch contaner and then layering on the SpringBoot application.
FROM scratch
COPY --from=builder /chroot/app /
ENV LANG=en_US.UTF-8 \
  LANGUAGE=en_US:en \
  LC_ALL=en_US.UTF-8 \
  JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8" \
  JAVA_HOME=/usr/local/jdk-17.0.7+7
ENV PATH=${JAVA_HOME}/bin:/flyway:${PATH}
USER flywayuser:flywayuser
