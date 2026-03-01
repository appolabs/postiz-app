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

  # Connection limits — DO Managed PG (1GB) has max_connections=25.
  # Temporal opens pools per service (frontend, matching, history, worker),
  # so total = 4 services × (max_conns + vis_max_conns). Keep very low.
  export SQL_MAX_CONNS=${SQL_MAX_CONNS:-2}
  export SQL_MAX_IDLE_CONNS=${SQL_MAX_IDLE_CONNS:-2}
  export SQL_VIS_MAX_CONNS=${SQL_VIS_MAX_CONNS:-1}
  export SQL_VIS_MAX_IDLE_CONNS=${SQL_VIS_MAX_IDLE_CONNS:-1}

  # Network binding
  export BIND_ON_IP=${BIND_ON_IP:-127.0.0.1}
  export TEMPORAL_ADDRESS=${TEMPORAL_ADDRESS:-127.0.0.1:7233}
  export TEMPORAL_CLI_ADDRESS=${TEMPORAL_CLI_ADDRESS:-${TEMPORAL_ADDRESS}}

  # 0. Terminate ALL stale PG connections from previous container (rolling deploy)
  #    DO Managed PG has only 25 slots; old container holds connections until killed.
  #    Must kill connections across ALL databases (app + temporal + temporal_visibility).
  if [ -n "${DATABASE_URL}" ]; then
    echo "[entrypoint] Terminating stale PG connections..."
    node -e "
      const { Client } = require('pg');
      const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      c.connect()
        .then(() => c.query(
          'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid()'
        ))
        .then(r => { console.log('[entrypoint] Terminated', r.rowCount, 'connections across all databases'); return c.end(); })
        .catch(e => { console.warn('[entrypoint] WARN: could not clear connections:', e.message); process.exit(0); });
    " || true
  fi

  # 1. Run Prisma schema push BEFORE Temporal starts (needs free PG slots)
  echo "[entrypoint] Running Prisma schema push..."
  pnpm run prisma-db-push || echo "[entrypoint] WARN: prisma-db-push failed (non-fatal)"

  # 2. Generate config from template
  echo "[entrypoint] Generating Temporal config..."
  dockerize -template /etc/temporal/config/config_template.yaml:/etc/temporal/config/docker.yaml

  # 3. Run schema migration (foreground — must finish before server starts)
  echo "[entrypoint] Running Temporal schema setup..."
  /etc/temporal/auto-setup.sh

  # 4. Start temporal-server in background
  echo "[entrypoint] Starting Temporal server..."
  temporal-server --root /etc/temporal --env docker start &

  # 5. Wait for Temporal gRPC port (7233) — up to 120s
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

# Limit Prisma connection pool per process (3 processes × 2 = 6 connections).
# Temporal uses 12, so total = 18 out of 25 available.
if [ -n "${DATABASE_URL}" ] && ! echo "${DATABASE_URL}" | grep -q "connection_limit"; then
  export DATABASE_URL="${DATABASE_URL}$(echo "${DATABASE_URL}" | grep -q '?' && echo '&' || echo '?')connection_limit=2"
fi

echo "[entrypoint] Starting nginx and Postiz..."
nginx && pnpm run pm2
