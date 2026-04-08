#!/usr/bin/env bash
set -euo pipefail

# Defaults for tunneling to the compose wstunnel server and postgres target.
SERVER_URL="${WSTUNNEL_SERVER_URL:-wss://localhost:8586}"
LOCAL_BIND="${WSTUNNEL_LOCAL_BIND:-127.0.0.1}"
LOCAL_PORT="${WSTUNNEL_LOCAL_PORT:-15432}"
REMOTE_HOST="${WSTUNNEL_REMOTE_HOST:-postgres}"
REMOTE_PORT="${WSTUNNEL_REMOTE_PORT:-5432}"
VERIFY_TLS="${WSTUNNEL_VERIFY_TLS:-false}"
CA_CERT="${WSTUNNEL_CA_CERT:-./credentials/ca.crt}"

if ! command -v wstunnel >/dev/null 2>&1; then
  echo "wstunnel is not installed or not on PATH." >&2
  echo "Run this script from 'devbox shell' where wstunnel is available." >&2
  exit 1
fi

if ! [[ "$LOCAL_PORT" =~ ^[0-9]+$ ]] || ! [[ "$REMOTE_PORT" =~ ^[0-9]+$ ]]; then
  echo "WSTUNNEL_LOCAL_PORT and WSTUNNEL_REMOTE_PORT must be numeric." >&2
  exit 1
fi

tunnel_spec="tcp://${LOCAL_BIND}:${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT}"
args=(client -L "$tunnel_spec")

if [[ "${VERIFY_TLS,,}" == "true" ]]; then
  if [[ ! -f "$CA_CERT" ]]; then
    echo "CA cert not found at '$CA_CERT'." >&2
    echo "Set WSTUNNEL_CA_CERT to a valid CA certificate path." >&2
    exit 1
  fi

  export SSL_CERT_FILE="$CA_CERT"
  args+=(--tls-verify-certificate)
fi

args+=("$SERVER_URL")

echo "Starting wstunnel client..."
echo "  server: $SERVER_URL"
echo "  forward: ${LOCAL_BIND}:${LOCAL_PORT} -> ${REMOTE_HOST}:${REMOTE_PORT}"
if [[ "${VERIFY_TLS,,}" == "true" ]]; then
  echo "  tls verify: enabled (SSL_CERT_FILE=$SSL_CERT_FILE)"
else
  echo "  tls verify: disabled"
fi

echo
echo "Connect your DB client to ${LOCAL_BIND}:${LOCAL_PORT}."
exec wstunnel "${args[@]}"
