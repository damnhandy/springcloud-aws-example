if [[ ! -d "./credentials" ]]; then
  mkdir ./credentials
fi
openssl rand -base64 32 > ./credentials/root_password
openssl rand -base64 32 > ./credentials/appuser_password
openssl rand -base64 32 > ./credentials/jdbc_truststore_password

docker run -it --rm -v $(pwd)/credentials:/workspace mysql:8.0.25 mysql_ssl_rsa_setup --datadir /workspace

truststore_passwd=$(< ./credentials/jdbc_truststore_password)

if [[ -f "./credentials/jdbc_truststore_local.p12" ]]; then
  rm ./credentials/jdbc_truststore_local.p12
fi

keytool -importcert -alias MySQLCACert -file ./credentials/ca.pem -keystore \
  ./credentials/jdbc_truststore_local.p12 -storetype pkcs12 -noprompt -storepass ${truststore_passwd}

if [[ -f "./credentials/jdbc_truststore_aws.p12" ]]; then
  rm ./credentials/jdbc_truststore_aws.p12
fi

# https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.SSL.html
curl -L https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem -o ./credentials/us-east-1-bundle.pem

keytool -importcert -alias rds-root -file ./credentials/us-east-1-bundle.pem -keystore \
  ./credentials/jdbc_truststore_aws.p12 -storetype pkcs12 -noprompt -storepass "changeit"

if [[ ! -d "./springboot-app/truststores" ]]; then
  mkdir "./springboot-app/truststores"
fi

cp ./credentials/jdbc_truststore_aws.p12 "./springboot-app/truststores/jdbc_truststore_aws.p12"
