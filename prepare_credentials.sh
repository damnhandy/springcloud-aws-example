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

curl -L https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o ./credentials/global-bundle.pem

keytool -importcert -alias AWS-RDS -file ./credentials/global-bundle.pem -keystore \
  ./credentials/jdbc_truststore_aws.p12 -storetype pkcs12 -noprompt -storepass ${truststore_passwd}

zip ./credentials/jdbc_truststore_aws.p12.zip ./credentials/jdbc_truststore_aws.p12
