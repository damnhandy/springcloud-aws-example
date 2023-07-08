
-- Testing 29
CREATE SCHEMA IF NOT EXISTS demoapp;
CREATE USER ${appuser} WITH PASSWORD '${appuserSecret}';
ALTER DEFAULT PRIVILEGES IN SCHEMA demoapp GRANT SELECT, INSERT, UPDATE, DELETE, TRIGGER ON TABLES TO ${appuser};
GRANT USAGE,CREATE ON SCHEMA demoapp TO ${appuser};
GRANT SELECT, INSERT, UPDATE, DELETE, TRIGGER ON ALL TABLES IN SCHEMA "demoapp" TO ${appuser};
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA demoapp TO ${appuser};