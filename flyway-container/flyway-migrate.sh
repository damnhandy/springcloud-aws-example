#!/bin/bash -xe

export FLYWAY_PASSWORD=$(< ${FLYWAY_PASSWORD})
export FLYWAY_PLACEHOLDERS_APPUSERPW=$(< ${FLYWAY_PLACEHOLDERS_APPUSERPW})

flyway validate -ignoreMigrationPatterns="*:pending"
flyway migrate
flyway info
