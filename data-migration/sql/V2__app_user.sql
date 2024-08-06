-- test 5
CREATE USER ${appuser_username} WITH PASSWORD '${appuser_secret}';
ALTER DEFAULT PRIVILEGES IN SCHEMA demoapp GRANT SELECT, INSERT, UPDATE, DELETE, TRIGGER ON TABLES TO ${appuser_username};
GRANT USAGE,CREATE ON SCHEMA demoapp TO ${appuser_username};
GRANT SELECT, INSERT, UPDATE, DELETE, TRIGGER ON ALL TABLES IN SCHEMA "demoapp" TO ${appuser_username};
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA demoapp TO ${appuser_username};