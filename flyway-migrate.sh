#!/bin/bash -xe

export FLYWAY_PASSWORD=$(< ${FLYWAY_PASSWORD})
export FLYWAY_PLACEHOLDERS_APPUSER_SECRET=$(< ${FLYWAY_PLACEHOLDERS_APPUSERPW})
export FLYWAY_LOCATIONS=filesystem:/sql
flyway validate -ignoreMigrationPatterns="*:pending"
flyway migrate
flyway info
