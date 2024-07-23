if [[ ! -d "./credentials" ]]; then
  mkdir ./credentials
fi
openssl rand -base64 32 > ./credentials/root_password
openssl rand -base64 32 > ./credentials/appuser_password
openssl rand -base64 32 > ./credentials/jdbc_truststore_password

# certstrap init --common-name pgCA
# certstrap request-cert --common-name postgresdb  --domain localhost
# certstrap sign postgresdb --CA pgCA

openssl req -new -x509 -days 365 -nodes -out ./credentials/ca.crt -keyout ./credentials/ca.key -subj "/CN=postgres"
openssl req -new -nodes -out ./credentials/server.csr -keyout ./credentials/server.key -subj "/CN=postgres"
openssl x509 -req -in ./credentials/server.csr -days 365 -CA ./credentials/ca.crt -CAkey ./credentials/ca.key -CAcreateserial -out ./credentials/server.crt
openssl rsa -inform pem -in ./credentials/server.key -outform der -out ./credentials/server.key.der

chmod 0600 ./credentials/server.key
chmod 0600 ./credentials/server.key.der
chmod 0600 ./credentials/server.crt

truststore_passwd=$(< ./credentials/jdbc_truststore_password)

if [[ -f "./credentials/jdbc_truststore_local.p12" ]]; then
  rm ./credentials/jdbc_truststore_local.p12
fi

keytool -importcert -alias PostgresSQLCACert -file ./credentials/ca.crt -keystore \
  ./credentials/jdbc_truststore_local.p12 -storetype pkcs12 -noprompt -storepass ${truststore_passwd}

if [[ -f "./credentials/jdbc_truststore_aws.p12" ]]; then
  rm ./credentials/jdbc_truststore_aws.p12
fi

# https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.SSL.html
curl -L https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem  -o ./credentials/global-bundle.pem

keytool -importcert -alias rds-root -file ./credentials/global-bundle.pem -keystore \
  ./credentials/jdbc_truststore_aws.p12 -storetype pkcs12 -noprompt -storepass "changeit"

if [[ ! -d "./springboot-app/truststores" ]]; then
  mkdir "./springboot-app/truststores"
fi

cp ./credentials/jdbc_truststore_aws.p12 "./springboot-app/truststores/jdbc_truststore_aws.p12"
