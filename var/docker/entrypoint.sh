#!/bin/bash
set -e

# --- Temporal Embedded Mode ---
if [ "${TEMPORAL_EMBEDDED}" = "true" ]; then
  echo "[entrypoint] Temporal embedded mode enabled"

  # Defaults consumed by auto-setup.sh (can be overridden via env)
  export TEMPORAL_HOME=${TEMPORAL_HOME:-/etc/temporal}
  export DB=${DB:-postgres12}
  export POSTGRES_TLS_ENABLED=${POSTGRES_TLS_ENABLED:-true}
  export POSTGRES_TLS_DISABLE_HOST_VERIFICATION=${POSTGRES_TLS_DISABLE_HOST_VERIFICATION:-true}
  export ENABLE_ES=${ENABLE_ES:-false}
  export SKIP_ADD_CUSTOM_SEARCH_ATTRIBUTES=${SKIP_ADD_CUSTOM_SEARCH_ATTRIBUTES:-true}

  # auto-setup.sh creates temporal + temporal_visibility databases,
  # applies schema migrations, then starts temporal-server (blocking).
  # We background it so we can continue to start Postiz after it's ready.
  echo "[entrypoint] Running Temporal auto-setup..."
  /etc/temporal/auto-setup.sh &

  # Wait for Temporal gRPC port (7233) -- up to 120s
  echo "[entrypoint] Waiting for Temporal server on port 7233..."
  for i in $(seq 1 60); do
    if bash -c "echo > /dev/tcp/localhost/7233" 2>/dev/null; then
      echo "[entrypoint] Temporal server is ready"
      break
    fi
    if [ "$i" -eq 60 ]; then
      echo "[entrypoint] ERROR: Temporal server did not start within 120s"
      exit 1
    fi
    sleep 2
  done
fi

# --- Start Postiz ---
echo "[entrypoint] Starting nginx and Postiz..."
nginx && pnpm run pm2
