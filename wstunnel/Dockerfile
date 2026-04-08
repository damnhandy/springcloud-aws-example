FROM docker.io/redhat/ubi9:9.7

COPY ./wstunnel_10.5.2_linux_arm64/wstunnel /usr/local/bin/wstunnel
RUN chmod +x /usr/local/bin/wstunnel

EXPOSE 8586

CMD ["/usr/local/bin/wstunnel", "server", "wss://0.0.0.0:8586", \
     "--restrict-to", "postgres:5432", \
     "--tls-certificate", "/run/secrets/server.crt", \
     "--tls-private-key", "/run/secrets/server.key"]

