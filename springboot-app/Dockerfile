FROM registry.access.redhat.com/ubi8/ubi:8.4 as builder
# We don't use the RedHat JDK distribution as it's not structured as a
# modular JDK like OpenJDK or OracleJDK
RUN curl -LO https://github.com/AdoptOpenJDK/openjdk11-binaries/releases/download/jdk-11.0.11%2B9/OpenJDK11U-jdk_x64_linux_hotspot_11.0.11_9.tar.gz
RUN tar xzf OpenJDK11U-jdk_x64_linux_hotspot_11.0.11_9.tar.gz
RUN mv jdk-11.0.11+9 /usr/local
ENV JAVA_HOME /usr/local/jdk-11.0.11+9
ENV PATH ${JAVA_HOME}/bin:${PATH}

ENV TMP_ROOT=/chroot/app
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
RUN dnf --installroot=${TMP_ROOT} -y install coreutils glibc-locale-source glibc-langpack-en \
  --releasever 8 \
  --setopt=install_weak_deps=False \
  --setopt=tsflags=nodocs \
  --setopt=override_install_langs=en_US.utf8

RUN echo "LANG=C.utf8" > ${TMP_ROOT}/etc/locale.conf

# Build the Java project
COPY ./ /opt/project
WORKDIR /opt/project
RUN ./gradlew build --no-daemon

# Add the RDS root certs so we can make connections to RDS over TLS when running in AWS
RUN curl -L https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem -o us-east-1-bundle.pem
RUN /opt/project/build/image/bin/keytool -importcert -alias AWS-RDS -file us-east-1-bundle.pem -keystore \
  /opt/project/build/image/lib/security/cacerts -storetype pkcs12 -noprompt -storepass changeit

COPY truststores/jdbc_truststore_aws.p12 /opt/project/build/image/jdbc_truststore_aws.p12

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
COPY --from=builder --chown=appuser:appuser /opt/project/build/image/ /opt/app/
ENV LANG=en_US.UTF-8 \
  LANGUAGE=en_US:en \
  LC_ALL=en_US.UTF-8 \
  JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8"
USER appuser:appuser
ENTRYPOINT [ "/opt/app/bin/springboot-app" ]
