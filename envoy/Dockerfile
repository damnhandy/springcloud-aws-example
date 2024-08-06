FROM envoyproxy/envoy:contrib-v1.31-latest
COPY ./envoy.yaml /etc/envoy/envoy.yaml
RUN apt-get update && apt-get install -y curl
RUN chmod go+r /etc/envoy/envoy.yaml
ENTRYPOINT [ "envoy","-c","/etc/envoy/envoy.yaml","--log-format '%L%m%d %T.%e %t envoy/%@] [%t][%n]%v'", "--log-level debug" ]