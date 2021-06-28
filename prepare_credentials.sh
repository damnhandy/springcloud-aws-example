

if [[ ! -d "./credentials" ]]; then
  mkdir ./credentials
fi
openssl rand -base64 32 > ./credentials/root_password
openssl rand -base64 32 > ./credentials/appuser_password
openssl rand -base64 32 > ./credentials/jdbc_truststore_password

docker run -it --rm -v $(pwd)/credentials:/workspace mysql:8.0.25 mysql_ssl_rsa_setup --datadir /workspace

truststore_passwd=$(<./credentials/jdbc_truststore_password)

if [[ -f "./credentials/truststore.p12" ]]; then
  rm ./credentials/truststore.p12
fi

keytool -importcert -alias MySQLCACert -file ./credentials/ca.pem -keystore \
  ./credentials/truststore.p12 -storetype pkcs12 -noprompt -storepass ${truststore_passwd}
