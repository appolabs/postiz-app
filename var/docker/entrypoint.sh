#!/bin/bash
set -e

# --- Temporal Embedded Mode ---
if [ "${TEMPORAL_EMBEDDED}" = "true" ]; then
  echo "[entrypoint] Temporal embedded mode enabled"

  # Defaults for auto-setup.sh (schema migration tool)
  export TEMPORAL_HOME=${TEMPORAL_HOME:-/etc/temporal}
  export DB=${DB:-postgres12}
  export POSTGRES_TLS_ENABLED=${POSTGRES_TLS_ENABLED:-true}
  export POSTGRES_TLS_DISABLE_HOST_VERIFICATION=${POSTGRES_TLS_DISABLE_HOST_VERIFICATION:-true}
  export ENABLE_ES=${ENABLE_ES:-false}
  export SKIP_ADD_CUSTOM_SEARCH_ATTRIBUTES=${SKIP_ADD_CUSTOM_SEARCH_ATTRIBUTES:-true}

  # Defaults for temporal-server runtime config template (uses SQL_TLS_*, not POSTGRES_TLS_*)
  export SQL_TLS_ENABLED=${SQL_TLS_ENABLED:-true}
  export SQL_HOST_VERIFICATION=${SQL_HOST_VERIFICATION:-false}

  # Connection limits (embedded shares PG with Postiz, keep pool small)
  export SQL_MAX_CONNS=${SQL_MAX_CONNS:-5}
  export SQL_MAX_IDLE_CONNS=${SQL_MAX_IDLE_CONNS:-5}
  export SQL_VIS_MAX_CONNS=${SQL_VIS_MAX_CONNS:-2}
  export SQL_VIS_MAX_IDLE_CONNS=${SQL_VIS_MAX_IDLE_CONNS:-2}

  # Network binding
  export BIND_ON_IP=${BIND_ON_IP:-127.0.0.1}
  export TEMPORAL_ADDRESS=${TEMPORAL_ADDRESS:-127.0.0.1:7233}
  export TEMPORAL_CLI_ADDRESS=${TEMPORAL_CLI_ADDRESS:-${TEMPORAL_ADDRESS}}

  # 1. Generate config from template
  echo "[entrypoint] Generating Temporal config..."
  dockerize -template /etc/temporal/config/config_template.yaml:/etc/temporal/config/docker.yaml

  # 2. Run schema migration
  echo "[entrypoint] Running Temporal schema setup..."
  /etc/temporal/auto-setup.sh &

  # 3. Start temporal-server in background
  echo "[entrypoint] Starting Temporal server..."
  temporal-server --root /etc/temporal --env docker start &

  # 4. Wait for Temporal gRPC port (7233) — up to 120s
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
# Cap Node heap per process (3 Node processes share RAM with Temporal)
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=384}"

echo "[entrypoint] Starting nginx and Postiz..."
nginx && pnpm run pm2
