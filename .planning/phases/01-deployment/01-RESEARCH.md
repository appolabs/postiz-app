# Phase 1: Deployment - Research

**Researched:** 2026-02-28
**Domain:** DigitalOcean App Platform deployment with Temporal Server and managed PostgreSQL
**Confidence:** HIGH

<research_summary>
## Summary

Researched the deployment architecture for running Postiz on DigitalOcean App Platform with Temporal workflow orchestration and managed PostgreSQL. Single user, minimal architecture.

Key finding: **Temporalite is deprecated and SQLite-only.** It was absorbed into the Temporal CLI (`temporal server start-dev`) which is also SQLite-only and not for production. For PostgreSQL-backed production deployments, the full Temporal server is required.

The recommended architecture is a **single-container App Platform service** with Temporal server embedded alongside the existing Postiz processes. The `Dockerfile.dev` is extended via multi-stage build to copy `temporal-server`, `temporal-sql-tool`, schema files, and `auto-setup.sh` from the official `temporalio/auto-setup:1.29.3` image. The entrypoint runs Temporal schema setup on boot, then starts `temporal-server` as a pm2 process alongside backend, frontend, and orchestrator. Everything connects to a single DO Managed PostgreSQL cluster ($15/mo) hosting 3 databases: `postiz`, `temporal`, and `temporal_visibility`.

Since this is a custom fork, App Platform builds from our GitHub repo using `Dockerfile.dev` directly (auto-build on push).

**Primary recommendation:** Single container (Postiz + Temporal via pm2) on DO App Platform + managed PostgreSQL. ~$20-40/mo total. No Redis (MockRedis fallback). No Elasticsearch (SQL-based visibility).
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Component | Version/Image | Purpose | Why Standard |
|-----------|---------------|---------|--------------|
| DO App Platform | — | PaaS hosting | Managed container deployment, auto-TLS, health checks, builds from source |
| `temporalio/auto-setup` | 1.29.3 | Temporal binaries source | Multi-stage build copies `temporal-server`, `temporal-sql-tool`, schema files, `auto-setup.sh` |
| DO Managed PostgreSQL | 16 | Persistence | Managed backups, supports multiple databases, shared by app + Temporal |
| Custom `Dockerfile.dev` | — | Single container image | Our fork with Temporal embedded, built by App Platform from GitHub source |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| pm2 | Process manager | Already used by Postiz — backend, frontend, orchestrator. Add temporal-server as 4th process. |
| `temporal-sql-tool` | Schema migration | Copied from auto-setup image, runs on container boot to create/update Temporal databases |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single container | Two separate services | Cleaner separation but +$5/mo, more moving parts for 1 user |
| Managed PostgreSQL ($15/mo) | Dev database ($7/mo) | Dev DB can't create additional databases — Temporal needs 3 DBs |
| Multi-stage COPY from auto-setup | Download binary from GitHub releases | Release tarball has `temporal-server` but NOT `temporal-sql-tool` — admin-tools image needed for that |
| pm2 for temporal-server | supervisord | pm2 already in image, adding another process manager is unnecessary |
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Architecture

```
DO App Platform
├── Service: postiz (single container, public HTTP)
│   ├── Built from: Dockerfile.dev (our fork, auto-built by App Platform)
│   ├── HTTP port: 5000 (nginx)
│   ├── pm2 processes:
│   │   ├── backend (NestJS, port 3000)
│   │   ├── frontend (Next.js, port 4200)
│   │   ├── orchestrator (Temporal worker)
│   │   └── temporal-server (gRPC, port 7233, localhost only)
│   ├── Entrypoint: schema setup → nginx + pm2
│   ├── Env: DATABASE_URL, TEMPORAL_ADDRESS=localhost:7233
│   └── Instance: apps-s-1vcpu-2gb ($25/mo) or apps-s-2vcpu-4gb ($50/mo)
│
└── Database: db (DO Managed PostgreSQL)
    ├── Engine: PG, version 16
    ├── Databases: default (postiz), temporal, temporal_visibility
    └── Plan: $15/mo (1 vCPU, 1 GB RAM, 10 GB disk)
```

**Total cost: ~$40/mo** (1 container $25 + managed PG $15)

### Pattern 1: Multi-Stage Build to Embed Temporal
**What:** Use Docker multi-stage build to COPY Temporal binaries, schema files, and setup scripts from the official `temporalio/auto-setup:1.29.3` image into our Postiz image.
**Why:** Avoids maintaining Temporal binaries ourselves. Official image is the source of truth.

Binary locations inside `temporalio/auto-setup:1.29.3`:
- `/usr/local/bin/temporal-server` — the Temporal server binary
- `/usr/local/bin/temporal-sql-tool` — schema migration tool
- `/etc/temporal/schema/` — SQL schema files for PostgreSQL
- `/etc/temporal/entrypoint.sh` — entrypoint that runs auto-setup then starts server
- `/etc/temporal/auto-setup.sh` — database creation + schema migration script
- `/etc/temporal/start-temporal.sh` — starts temporal-server with config
- `/etc/temporal/config/config_template.yaml` — config template with env var substitution
- `/etc/temporal/config/dynamicconfig/docker.yaml` — dynamic config defaults

```dockerfile
# Add to Dockerfile.dev as first stage
FROM temporalio/auto-setup:1.29.3 AS temporal

# ... existing Postiz build stages ...

# In final stage, copy Temporal binaries
COPY --from=temporal /usr/local/bin/temporal-server /usr/local/bin/
COPY --from=temporal /usr/local/bin/temporal-sql-tool /usr/local/bin/
COPY --from=temporal /etc/temporal/ /etc/temporal/
```

### Pattern 2: Temporal as pm2 Process
**What:** Add `temporal-server` to pm2 process list alongside backend, frontend, orchestrator.
**When to use:** Single-container deployment where Temporal runs on localhost.

The existing pm2 setup in Postiz:
- Root `package.json` → `pm2-run` script: `pm2 delete all || true && pnpm run prisma-db-push && pnpm run --parallel pm2 && pm2 logs`
- Each app has a `pm2` script: `pm2 start pnpm --name <app> -- start`

For Temporal, we add it either via:
- A custom entrypoint script that starts Temporal before pm2
- Or as a pm2 ecosystem config entry

**Recommended:** Custom entrypoint that runs schema setup + starts `temporal-server` in background, then runs the existing Postiz pm2 startup.

### Pattern 3: Temporal Server Config via YAML
**What:** Configure `temporal-server` to use PostgreSQL with a YAML config file.
**When to use:** Single-binary deployment (our case).

```yaml
# /etc/temporal/temporal-server.yaml
log:
  stdout: true
  level: info

persistence:
  defaultStore: postgres-default
  visibilityStore: postgres-visibility
  numHistoryShards: 4
  datastores:
    postgres-default:
      sql:
        pluginName: "postgres12"
        databaseName: "temporal"
        connectAddr: "${POSTGRES_HOST}:${POSTGRES_PORT}"
        connectProtocol: "tcp"
        user: "${POSTGRES_USER}"
        password: "${POSTGRES_PWD}"
        maxConns: 5
        maxIdleConns: 2
        maxConnLifetime: "1h"
        tls:
          enabled: true
          enableHostVerification: false
    postgres-visibility:
      sql:
        pluginName: "postgres12"
        databaseName: "temporal_visibility"
        connectAddr: "${POSTGRES_HOST}:${POSTGRES_PORT}"
        connectProtocol: "tcp"
        user: "${POSTGRES_USER}"
        password: "${POSTGRES_PWD}"
        maxConns: 5
        maxIdleConns: 2
        maxConnLifetime: "1h"
        tls:
          enabled: true
          enableHostVerification: false

global:
  membership:
    maxJoinDuration: 30s
    broadcastAddress: "127.0.0.1"

services:
  frontend:
    rpc:
      grpcPort: 7233
      membershipPort: 6933
      bindOnLocalHost: true
  matching:
    rpc:
      grpcPort: 7235
      membershipPort: 6935
      bindOnLocalHost: true
  history:
    rpc:
      grpcPort: 7234
      membershipPort: 6934
      bindOnLocalHost: true
  worker:
    rpc:
      membershipPort: 6939

clusterMetadata:
  enableGlobalNamespace: false
  failoverVersionIncrement: 10
  masterClusterName: "active"
  currentClusterName: "active"
  clusterInformation:
    active:
      enabled: true
      initialFailoverVersion: 1
      rpcName: "frontend"
      rpcAddress: "localhost:7233"

dcRedirectionPolicy:
  policy: "noop"
```

**Alternative:** Use the `auto-setup.sh` / `start-temporal.sh` scripts from the auto-setup image, which handle config template rendering via env vars (simpler, less to maintain). The auto-setup image uses `config_template.yaml` with `dockerize` for env var substitution.

### Pattern 4: App Platform Source Build
**What:** App Platform builds from our GitHub repo using `Dockerfile.dev`.
**When to use:** Always — we have custom features, simplest CI/CD.

```yaml
services:
  - name: postiz
    github:
      repo: appolabs/postiz-app
      branch: main
      deploy_on_push: true
    dockerfile_path: Dockerfile.dev
    http_port: 5000
```

### Anti-Patterns to Avoid
- **Temporalite/CLI dev server in production:** SQLite-only, data loss on restart
- **Downloading release tarball for temporal-server:** Tarball lacks `temporal-sql-tool` — use multi-stage COPY from auto-setup image instead
- **Separate dev databases:** Can't create additional databases on dev DB clusters — use managed PG
- **Elasticsearch for 1 user:** Overkill — SQL-based visibility is sufficient
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Temporal DB schema | Custom SQL scripts | `temporal-sql-tool` + schema files from auto-setup image | Schema versioning, migration ordering, idempotent updates |
| Temporal server config | Config from scratch | `auto-setup.sh` / `config_template.yaml` from auto-setup image | Handles env var substitution, dynamic config, all services in one process |
| TLS termination | Nginx TLS config | DO App Platform | Automatic TLS certificates and HTTPS termination |
| Health checks | Custom health endpoints | App Platform health checks | Built-in HTTP health checks with configurable thresholds |
| Process management | Custom supervisor scripts | pm2 (already in image) | Already manages 3 processes, adding a 4th is trivial |
| Database backups | Custom backup scripts | DO Managed PostgreSQL | Automatic daily backups with 7-day retention |

**Key insight:** The multi-stage build from `temporalio/auto-setup` gives us production-quality Temporal binaries, schema files, AND the auto-setup scripts — all maintained by the Temporal team. We just COPY them in and wire up the entrypoint.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: DO Managed PostgreSQL TLS Requirement
**What goes wrong:** Temporal or Postiz can't connect to the database.
**Why it happens:** DO Managed PostgreSQL requires TLS connections by default.
**How to avoid:** For Postiz, `DATABASE_URL` from bindable variables includes `sslmode=require`. For Temporal, set `tls.enabled: true` in the config YAML or `POSTGRES_TLS_ENABLED=true` env var.
**Warning signs:** Connection refused errors, TLS handshake failures.

### Pitfall 2: Database Port 25060
**What goes wrong:** Temporal can't connect to PostgreSQL.
**Why it happens:** DO Managed PostgreSQL uses port 25060, not default 5432.
**How to avoid:** Use `${db.PORT}` bindable variable or hardcode 25060 in Temporal config.
**Warning signs:** Connection refused on port 5432.

### Pitfall 3: Temporal Needs CREATEDB Privilege
**What goes wrong:** Temporal auto-setup fails to create its databases.
**Why it happens:** Temporal needs to create `temporal` and `temporal_visibility` databases. Dev DB clusters restrict `CREATEDB`.
**How to avoid:** Use managed PostgreSQL ($15/mo), not dev DB ($7/mo). The managed DB default user has `CREATEDB` privileges.
**Warning signs:** "permission denied to create database" errors.

### Pitfall 4: DO App Platform 4 GiB Filesystem Limit
**What goes wrong:** Container becomes unhealthy and restarts.
**Why it happens:** Ephemeral filesystem limited to 4 GiB. Local file uploads fill it.
**How to avoid:** Use DO Spaces or Cloudflare R2 for file storage. Acceptable for initial deploy with few uploads.
**Warning signs:** Disk full errors, container health check failures.

### Pitfall 5: temporal-server Must Start Before Orchestrator
**What goes wrong:** Orchestrator crashes on startup because it can't connect to Temporal.
**Why it happens:** pm2 starts all processes in parallel. If orchestrator starts before `temporal-server` is ready, it fails.
**How to avoid:** Start `temporal-server` first in entrypoint, wait for port 7233 to be ready, then start pm2 for the app processes. Or configure orchestrator with retry/backoff on Temporal connection.
**Warning signs:** Orchestrator crash loops, "connection refused" to localhost:7233.

### Pitfall 6: Schema Setup on Every Container Restart
**What goes wrong:** Slow startup as auto-setup re-runs schema migrations.
**Why it happens:** Container restarts trigger the full entrypoint including schema setup.
**How to avoid:** Schema updates are idempotent (checks version, only applies missing migrations). For faster restarts, set `SKIP_SCHEMA_SETUP=true` after first successful boot.
**Warning signs:** 30-60 second startup delay.

### Pitfall 7: Memory Pressure in Single Container
**What goes wrong:** OOM kills, container restarts.
**Why it happens:** Running 4 Node.js processes + 1 Go binary + nginx in a single container.
**How to avoid:** Use `apps-s-1vcpu-2gb` ($25/mo) minimum. Monitor memory usage. If tight, upgrade to `apps-s-2vcpu-4gb` ($50/mo).
**Warning signs:** Process crashes without clear error, pm2 restart counts increasing.

### Pitfall 8: `NEXT_PUBLIC_*` Build-Time Variables
**What goes wrong:** Frontend shows wrong API URL or broken links.
**Why it happens:** Next.js inlines `NEXT_PUBLIC_*` vars at build time. App Platform's `${APP_URL}` may not be available on first build.
**How to avoid:** Hardcode the URL for first deploy, or do two deploys (first to get URL, second with correct env). The existing `Dockerfile.dev` accepts `NEXT_PUBLIC_VERSION` as build arg — same pattern for `NEXT_PUBLIC_BACKEND_URL`.
**Warning signs:** API calls going to wrong URL in browser network tab.
</common_pitfalls>

<code_examples>
## Code Examples

### Dockerfile.dev Changes (Multi-Stage Build)
```dockerfile
# NEW: First stage — copy Temporal binaries from official image
FROM temporalio/auto-setup:1.29.3 AS temporal

# Existing Postiz build
FROM node:22.20-bookworm-slim
ARG NEXT_PUBLIC_VERSION
ENV NEXT_PUBLIC_VERSION=$NEXT_PUBLIC_VERSION
RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ \
    make \
    python3-pip \
    bash \
    nginx \
&& rm -rf /var/lib/apt/lists/*

RUN addgroup --system www \
 && adduser --system --ingroup www --home /www --shell /usr/sbin/nologin www \
 && mkdir -p /www \
 && chown -R www:www /www /var/lib/nginx

RUN npm --no-update-notifier --no-fund --global install pnpm@10.6.1 pm2

WORKDIR /app

COPY . /app
COPY var/docker/nginx.conf /etc/nginx/nginx.conf

RUN pnpm install
RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm run build

# NEW: Copy Temporal binaries and config
COPY --from=temporal /usr/local/bin/temporal-server /usr/local/bin/
COPY --from=temporal /usr/local/bin/temporal-sql-tool /usr/local/bin/
COPY --from=temporal /etc/temporal/ /etc/temporal/

# NEW: Copy custom entrypoint
COPY var/docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

CMD ["sh", "-c", "/app/entrypoint.sh"]
```

### Entrypoint Script
```bash
#!/bin/bash
# var/docker/entrypoint.sh
# Starts Temporal schema setup, then temporal-server, then Postiz via pm2

set -e

# --- Temporal Schema Setup ---
# Only runs if TEMPORAL_EMBEDDED=true (skip for dev environments)
if [ "${TEMPORAL_EMBEDDED}" = "true" ]; then
  echo "Setting up Temporal schema..."

  # Parse PostgreSQL connection from env vars
  export DB=postgres12
  export POSTGRES_TLS_ENABLED=${POSTGRES_TLS_ENABLED:-true}
  export POSTGRES_TLS_DISABLE_HOST_VERIFICATION=${POSTGRES_TLS_DISABLE_HOST_VERIFICATION:-true}
  export ENABLE_ES=false
  export SKIP_ADD_CUSTOM_SEARCH_ATTRIBUTES=true

  # Run auto-setup (creates DBs + applies schema migrations — idempotent)
  /etc/temporal/auto-setup.sh &
  TEMPORAL_PID=$!

  # Wait for Temporal to be ready (port 7233)
  echo "Waiting for Temporal to be ready..."
  for i in $(seq 1 60); do
    if temporal-server --help > /dev/null 2>&1 && \
       bash -c "echo > /dev/tcp/localhost/7233" 2>/dev/null; then
      echo "Temporal is ready."
      break
    fi
    sleep 2
  done
fi

# --- Start Postiz ---
nginx && pnpm run pm2
```

### App Spec (Complete)
```yaml
# .do/app.yaml
name: postiz
region: nyc

databases:
  - engine: PG
    name: db
    version: "16"
    production: false  # $7/mo dev initially — upgrade if CREATEDB fails

services:
  - name: postiz
    github:
      repo: appolabs/postiz-app
      branch: main
      deploy_on_push: true
    dockerfile_path: Dockerfile.dev
    http_port: 5000
    instance_size_slug: apps-s-1vcpu-2gb
    instance_count: 1
    health_check:
      http_path: /
      initial_delay_seconds: 60
      period_seconds: 10
      timeout_seconds: 5
      failure_threshold: 6
    envs:
      # App URLs
      - key: MAIN_URL
        value: "${APP_URL}"
      - key: FRONTEND_URL
        value: "${APP_URL}"
      - key: NEXT_PUBLIC_BACKEND_URL
        value: "${APP_URL}/api"
        scope: BUILD_TIME
      # Database
      - key: DATABASE_URL
        value: "${db.DATABASE_URL}"
      # Temporal (embedded, localhost)
      - key: TEMPORAL_ADDRESS
        value: "localhost:7233"
      - key: TEMPORAL_EMBEDDED
        value: "true"
      # Temporal PostgreSQL config (parsed by auto-setup.sh)
      - key: DB_PORT
        value: "${db.PORT}"
      - key: POSTGRES_SEEDS
        value: "${db.HOSTNAME}"
      - key: POSTGRES_USER
        value: "${db.USERNAME}"
      - key: POSTGRES_PWD
        value: "${db.PASSWORD}"
        type: SECRET
      # Auth
      - key: JWT_SECRET
        value: "CHANGE_ME_RANDOM_STRING"
        type: SECRET
      # App config
      - key: IS_GENERAL
        value: "true"
      - key: BACKEND_INTERNAL_URL
        value: "http://localhost:3000"
      - key: STORAGE_PROVIDER
        value: "local"
      - key: UPLOAD_DIRECTORY
        value: "/uploads"
      - key: NEXT_PUBLIC_UPLOAD_DIRECTORY
        value: "/uploads"
      - key: NX_ADD_PLUGINS
        value: "false"
```

### Temporal Environment Variables Reference
```bash
# Set by app spec, consumed by auto-setup.sh inside the container
DB=postgres12                    # Database driver
DB_PORT=${db.PORT}               # DO managed PG uses 25060
POSTGRES_SEEDS=${db.HOSTNAME}    # PostgreSQL host
POSTGRES_USER=${db.USERNAME}     # PostgreSQL user
POSTGRES_PWD=${db.PASSWORD}      # PostgreSQL password
POSTGRES_TLS_ENABLED=true        # Required for DO managed PG
POSTGRES_TLS_DISABLE_HOST_VERIFICATION=true
ENABLE_ES=false                  # No Elasticsearch
TEMPORAL_EMBEDDED=true           # Our flag to enable Temporal in entrypoint
```

### Database Bindable Variables Reference
```yaml
# Available for a database component named "db":
# ${db.HOSTNAME}     - Private hostname (within VPC)
# ${db.PORT}         - Port (25060 for managed PostgreSQL)
# ${db.USERNAME}     - Database user
# ${db.PASSWORD}     - Database password
# ${db.DATABASE}     - Default database name
# ${db.DATABASE_URL} - Full connection string with TLS
# ${db.CA_CERT}      - CA certificate
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Temporalite standalone binary | Temporal CLI `server start-dev` | 2023 | Temporalite repo archived, absorbed into CLI. Neither supports PostgreSQL — SQLite only, dev only. |
| `temporalio/auto-setup` with bundled CLI tools | Slimmed images (v1.30+) | 2025 | Docker images removing bundled tctl/CLI. Pin to 1.29.3 for now. |
| Elasticsearch required for visibility | SQL-based visibility (PostgreSQL) | Temporal 1.20+ | No Elasticsearch needed — PostgreSQL handles visibility natively |
| Separate Temporal container | Embedded via multi-stage build | — | For 1-user deploy, single container is simpler and cheaper |

**Deprecated/outdated:**
- **Temporalite:** Archived, absorbed into Temporal CLI, SQLite-only
- **`temporal server start-dev` for production:** Development-only, no PostgreSQL support
- **BullMQ for Postiz:** Project migrated to Temporal
</sota_updates>

<open_questions>
## Open Questions

1. **Dev database vs managed database CREATEDB privilege**
   - What we know: Dev databases ($7/mo) can't create additional databases. Temporal needs 3 DBs.
   - Recommendation: Start with managed PostgreSQL ($15/mo). The $8/mo difference isn't worth the risk.

2. **Build time on App Platform**
   - What we know: 4 CPU, 10 GiB RAM, 24 GiB disk, 1hr timeout. Postiz needs `--max-old-space-size=4096`.
   - What's unclear: Whether the full monorepo build + Temporal multi-stage completes within timeout.
   - Recommendation: Try it. If timeout, switch to GitHub Actions CI pushing to GHCR.

3. **`${APP_URL}` at build time for first deploy**
   - What we know: `NEXT_PUBLIC_BACKEND_URL` needs to be set at build time for Next.js.
   - What's unclear: Whether `${APP_URL}` is available during the first build (before app has a URL).
   - Recommendation: Hardcode URL for first deploy or accept two deploys.

4. **auto-setup.sh compatibility inside Postiz container**
   - What we know: auto-setup.sh expects to run as the Temporal entrypoint. We're running it as a sub-process.
   - What's unclear: Whether auto-setup.sh has dependencies on specific env vars or paths that conflict with the Postiz container.
   - Recommendation: Test auto-setup.sh in isolation first. May need to extract just the schema setup portion and run temporal-server separately.

5. **Memory footprint of all processes**
   - What we know: backend (NestJS) + frontend (Next.js) + orchestrator (NestJS) + nginx + temporal-server (Go) + pm2.
   - What's unclear: Whether 2 GiB RAM is enough for all processes under load.
   - Recommendation: Start with 2 GiB ($25/mo). Monitor. Upgrade to 4 GiB ($50/mo) if needed.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- [Temporal Documentation - Configuration Reference](https://docs.temporal.io/references/configuration) — server config YAML structure, PostgreSQL persistence options
- [Temporal Documentation - Deployment](https://docs.temporal.io/self-hosted-guide/deployment) — Docker deployment options, auto-setup vs server images
- [Temporal auto-setup.sh source](https://github.com/temporalio/docker-builds/blob/main/docker/auto-setup.sh) — complete env var reference, DB setup logic
- [Temporal server.Dockerfile](https://github.com/temporalio/docker-builds/blob/main/server.Dockerfile) — binary locations: `/usr/local/bin/temporal-server`, `/usr/local/bin/temporal-sql-tool`
- [Temporal admin-tools.Dockerfile](https://github.com/temporalio/docker-builds/blob/main/admin-tools.Dockerfile) — confirms tool paths at `/usr/local/bin/`
- [Temporal GitHub Releases v1.29.3](https://github.com/temporalio/temporal/releases/tag/v1.29.3) — release tarball has temporal-server but NOT temporal-sql-tool
- [DO App Platform - App Spec Reference](https://docs.digitalocean.com/products/app-platform/reference/app-spec/) — service, database, env var configuration
- [DO App Platform - Environment Variables](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/) — bindable variables syntax
- [DO App Platform - Limits](https://docs.digitalocean.com/products/app-platform/details/limits/) — 4 GiB filesystem, gVisor runtime, AMD64 only, build resources
- [DO App Platform - Pricing](https://docs.digitalocean.com/products/app-platform/details/pricing/) — instance sizes and costs

### Secondary (MEDIUM confidence)
- [Temporal Blog - Auto-Setup](https://temporal.io/blog/auto-setup) — auto-setup behavior, schema idempotency
- [Temporal Blog - Temporalite](https://temporal.io/blog/temporalite-the-foundation-of-the-new-temporal-cli-experience) — confirmed Temporalite → CLI merge, SQLite-only
- [Temporal learn - Configuring SQLite Binary](https://learn.temporal.io/tutorials/infrastructure/configuring-sqlite-binary/) — full config YAML example structure, adapted for PostgreSQL
- [Temporal Community - Custom Postgres DB](https://community.temporal.io/t/temporal-with-custom-postgres-db/4787) — PostgreSQL config patterns

### Tertiary (LOW confidence - needs validation)
- auto-setup.sh compatibility as sub-process in Postiz container — needs testing
- Memory footprint of combined processes — needs monitoring
- App Platform build time for monorepo — needs testing
- `${APP_URL}` availability during first build — needs testing
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: DO App Platform, Temporal Server 1.29.3, managed PostgreSQL
- Ecosystem: Multi-stage Docker build, pm2 process management, auto-setup schema migration
- Patterns: Embedded Temporal via COPY --from, single-container deployment
- Pitfalls: TLS, ports, CREATEDB, memory, startup ordering, NEXT_PUBLIC vars

**Confidence breakdown:**
- Standard stack: HIGH — official Docker images, documented binary paths
- Architecture: HIGH — multi-stage build pattern is well-established, App Platform source builds documented
- Pitfalls: HIGH — derived from official docs and community reports
- Code examples: MEDIUM — Dockerfile pattern verified, entrypoint needs testing
- Temporal config YAML: MEDIUM — adapted from SQLite example for PostgreSQL, needs validation

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (30 days — both ecosystems stable)
</metadata>

---

*Phase: 01-deployment*
*Research completed: 2026-02-28*
*Ready for planning: yes*
