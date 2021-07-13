# Flyway

This container uses the [Flyway CLI](https://flywaydb.org) to manage database migrations in order to
bootstrap the database and apply future changes in the future. We use our own container here in
order to ensure that the keystore for Flyway uses the
[RDS root certificates](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html)
as the MySQL database is configured to force the use of TLS when establishing a JDBC connection.
