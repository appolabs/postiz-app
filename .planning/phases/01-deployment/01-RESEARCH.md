# Phase 1: Deployment - Research

**Researched:** 2026-02-28
**Domain:** DigitalOcean App Platform deployment with Temporal Server and managed PostgreSQL
**Confidence:** HIGH

<research_summary>
## Summary

Researched the deployment architecture for running Postiz on DigitalOcean App Platform with Temporal workflow orchestration and managed PostgreSQL.

Key finding: **Temporalite is deprecated and SQLite-only.** It was absorbed into the Temporal CLI (`temporal server start-dev`) which is also SQLite-only and not for production. For PostgreSQL-backed production deployments, the full Temporal server (`temporalio/auto-setup` or `temporalio/server`) is required.

Since this is a custom fork with our own features, we **build our own image** from `Dockerfile.dev` and push to GHCR under our org (or DO Container Registry). `NEXT_PUBLIC_*` vars get baked in at build time, so we control them in CI or the Dockerfile build args.

The recommended architecture is a **two-service App Platform app**: one service for our custom Postiz image (backend + frontend + orchestrator via pm2/nginx, built from our fork's `Dockerfile.dev`), and a second internal service for Temporal server (using `temporalio/auto-setup` image). Both connect to a shared DO Managed PostgreSQL cluster hosting separate databases (`postiz` and `temporal` + `temporal_visibility`). App Platform's internal networking supports TCP/gRPC on `internal_ports`, so the Postiz orchestrator connects to Temporal at `http://temporal:7233` over the app's LAN.

**Primary recommendation:** Build custom image from fork → push to registry → two-service DO App Platform app + shared managed PostgreSQL. No Redis (existing MockRedis fallback). No Elasticsearch (SQL-based visibility).
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Component | Version/Image | Purpose | Why Standard |
|-----------|---------------|---------|--------------|
| DO App Platform | — | PaaS hosting | Managed container deployment, auto-TLS, health checks |
| `temporalio/auto-setup` | 1.29.3 | Temporal server | Auto-provisions DB schema on first boot, runs all 4 services in one process |
| DO Managed PostgreSQL | 16 | Persistence | Managed backups, maintenance, shared by app + Temporal |
| Custom image from fork | built from `Dockerfile.dev` | Postiz app | Our fork with custom features, built and pushed to GHCR or DOCR |

### Supporting
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `temporalio/server` | Temporal without auto-setup | After initial deployment, if auto-setup causes issues on restarts |
| DO App Platform dev database | $7/mo PostgreSQL | If managed DB ($15/mo) is overkill for initial testing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Two-service app | Single container with Temporal sidecar | Simpler billing but complex Dockerfile, harder to debug, resource contention |
| Managed PostgreSQL | Dev database ($7/mo) | Dev DB can't create additional databases — need 3 DBs (postiz, temporal, temporal_visibility) |
| `auto-setup` | `server` + manual schema | More control but requires running `temporal-sql-tool` separately |
| No Elasticsearch | Elasticsearch on separate service | Full advanced visibility, but adds $50+/mo and complexity |
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Architecture

```
DO App Platform App
├── Service: postiz (web service, public HTTP)
│   ├── Image: ghcr.io/appolabs/postiz-app:latest (built from our fork)
│   ├── HTTP port: 5000 (nginx → backend:3000 + frontend:4200)
│   ├── Internal: pm2 runs backend, frontend, orchestrator
│   ├── Env: DATABASE_URL, TEMPORAL_ADDRESS=temporal:7233
│   └── Instance: apps-s-2vcpu-4gb ($50/mo) or apps-s-1vcpu-2gb ($25/mo)
│
├── Service: temporal (internal service, no public HTTP)
│   ├── Image: temporalio/auto-setup:1.29.3
│   ├── Internal ports: [7233]
│   ├── Env: DB=postgres12, POSTGRES_SEEDS, POSTGRES_USER, etc.
│   └── Instance: apps-s-1vcpu-1gb ($12/mo)
│
└── Database: db (managed PostgreSQL)
    ├── Engine: PG, version 16
    ├── Databases: postiz-db, temporal, temporal_visibility
    └── Plan: $15/mo (1 vCPU, 1 GB RAM, 10 GB disk)
```

### Pattern 1: Temporal as Internal Service
**What:** Run Temporal server as a separate App Platform service with `internal_ports` only (no public HTTP endpoint).
**When to use:** Always — Temporal should not be internet-accessible.
**How it works:** App Platform's `internal_ports` field supports any TCP-based traffic including gRPC. Other services in the app reach Temporal at `http://temporal:7233`.

```yaml
# App spec snippet
services:
  - name: temporal
    image:
      registry_type: DOCKER_HUB
      repository: temporalio/auto-setup
      tag: "1.29.3"
    internal_ports:
      - 7233
    instance_size_slug: apps-s-1vcpu-1gb
    instance_count: 1
    envs:
      - key: DB
        value: "postgres12"
      - key: DB_PORT
        value: "25060"
      - key: POSTGRES_SEEDS
        value: "${db.HOSTNAME}"
      - key: POSTGRES_USER
        value: "${db.USERNAME}"
      - key: POSTGRES_PWD
        value: "${db.PASSWORD}"
      - key: POSTGRES_TLS_ENABLED
        value: "true"
      - key: POSTGRES_TLS_DISABLE_HOST_VERIFICATION
        value: "true"
      - key: ENABLE_ES
        value: "false"
      - key: SKIP_ADD_CUSTOM_SEARCH_ATTRIBUTES
        value: "true"
```

### Pattern 2: Custom Fork Image Build & Deploy
**What:** Build from our fork's `Dockerfile.dev`, push to GHCR (or DOCR), deploy to App Platform. Since we control the build, `NEXT_PUBLIC_*` vars are set via `--build-arg` at build time.
**When to use:** Always — we have custom features to deploy.

**Build options:**
- **Option A: GitHub Actions CI** — build on push to `main`, push to `ghcr.io/appolabs/postiz-app`. App Platform pulls from GHCR with `deploy_on_push`.
- **Option B: App Platform builds from source** — point App Platform at the GitHub repo, it builds using `Dockerfile.dev` directly. Simpler but slower builds (1hr timeout, 4 CPU / 10 GiB RAM build resources).
- **Option C: Manual build & push** — `docker build` locally, push to DOCR or GHCR, update app spec tag.

**Recommended: Option B (App Platform source build)** for initial simplicity. Switch to Option A when CI/CD is desired.

```yaml
# Option B: Build from source (App Platform builds the image)
services:
  - name: postiz
    github:
      repo: appolabs/postiz-app
      branch: main
      deploy_on_push: true
    dockerfile_path: Dockerfile.dev
    build_command: ""  # Dockerfile handles everything
    http_port: 5000
    instance_size_slug: apps-s-1vcpu-2gb
    instance_count: 1
    envs:
      - key: DATABASE_URL
        value: "${db.DATABASE_URL}"
      - key: TEMPORAL_ADDRESS
        value: "temporal:7233"
      - key: IS_GENERAL
        value: "true"
      # NEXT_PUBLIC_* vars set as build-time env vars
      - key: NEXT_PUBLIC_BACKEND_URL
        value: "${APP_URL}/api"
        scope: BUILD_TIME
      # ... social API keys, JWT_SECRET, etc.

# Option A: Pre-built image from GHCR
services:
  - name: postiz
    image:
      registry_type: GHCR
      registry: appolabs
      repository: postiz-app
      tag: latest
      deploy_on_push:
        enabled: true
    http_port: 5000
    instance_size_slug: apps-s-1vcpu-2gb
    instance_count: 1
    envs:
      - key: DATABASE_URL
        value: "${db.DATABASE_URL}"
      - key: TEMPORAL_ADDRESS
        value: "temporal:7233"
      - key: IS_GENERAL
        value: "true"
```

### Pattern 3: Shared PostgreSQL Cluster
**What:** Single DO Managed PostgreSQL cluster hosts both Postiz and Temporal databases.
**When to use:** Always for cost efficiency.
**Important:** Temporal `auto-setup` creates its own databases (`temporal` and `temporal_visibility`) automatically when `SKIP_DB_CREATE` is not set. The Postiz app uses a separate database configured via `DATABASE_URL`.

### Anti-Patterns to Avoid
- **Temporalite/CLI dev server in production:** SQLite-only, data loss on restart, not designed for production
- **Single container with Temporal sidecar:** Complex entrypoint, resource contention, hard to debug, harder to scale independently
- **Separate PostgreSQL clusters:** Unnecessary cost — one cluster handles both workloads
- **Elasticsearch for small team:** Overkill — SQL-based visibility works fine without it
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Temporal DB schema | Custom migration scripts | `temporalio/auto-setup` image | Auto-setup handles schema creation and upgrades for both `temporal` and `temporal_visibility` databases |
| TLS termination | Nginx TLS config | DO App Platform | App Platform provides automatic TLS certificates and HTTPS termination |
| Health checks | Custom health endpoints | App Platform health checks | Built-in HTTP health checks with configurable thresholds |
| Process management | Custom supervisor scripts | pm2 (already in image) | Postiz image already uses pm2 for multi-process management |
| Temporal config YAML | Hand-written config files | `auto-setup` env vars | Environment variables are simpler and sufficient for single-node deployment |
| Database backups | Custom backup scripts | DO Managed PostgreSQL | Managed DB includes automatic daily backups with 7-day retention |

**Key insight:** The existing `Dockerfile.dev` and `temporalio/auto-setup` images already solve the hard problems. The deployment task is primarily app spec configuration and ensuring the build works on App Platform — not custom Docker work.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Temporal Auto-Setup on Every Restart
**What goes wrong:** `auto-setup` runs schema migration on every container start, which can cause issues if the DB is already set up.
**Why it happens:** The auto-setup image always attempts schema setup unless `SKIP_SCHEMA_SETUP=true`.
**How to avoid:** This is actually safe — `auto-setup` uses `update-schema` which is idempotent. It checks existing schema version and only applies missing migrations. For ongoing deployments, you could switch to `temporalio/server` and set `SKIP_SCHEMA_SETUP=true` if startup time matters.
**Warning signs:** Slow container startup, schema-related errors in Temporal logs.

### Pitfall 2: DO Managed PostgreSQL TLS Requirement
**What goes wrong:** Temporal or Postiz can't connect to the database.
**Why it happens:** DO Managed PostgreSQL requires TLS connections by default. The connection string must include `sslmode=require` or the Temporal env var `POSTGRES_TLS_ENABLED=true`.
**How to avoid:** For Postiz, `DATABASE_URL` from bindable variables includes TLS params. For Temporal, set `POSTGRES_TLS_ENABLED=true` and `POSTGRES_TLS_DISABLE_HOST_VERIFICATION=true`.
**Warning signs:** Connection refused errors, TLS handshake failures.

### Pitfall 3: Temporal Needs Separate Databases
**What goes wrong:** Temporal fails to start or loses visibility data.
**Why it happens:** Temporal requires two databases: `temporal` (main) and `temporal_visibility` (search/list queries). These can't share a single database.
**How to avoid:** `auto-setup` creates both databases automatically. On DO Managed PostgreSQL, the default user has `CREATEDB` privileges. Just ensure `SKIP_DB_CREATE` is not set.
**Warning signs:** "database does not exist" errors in Temporal logs.

### Pitfall 4: DO App Platform 4 GiB Filesystem Limit
**What goes wrong:** Container becomes unhealthy and restarts.
**Why it happens:** App Platform limits local filesystem to 4 GiB. If uploads use local storage (`STORAGE_PROVIDER=local`), the filesystem fills up.
**How to avoid:** Use DO Spaces or Cloudflare R2 for file storage (`STORAGE_PROVIDER=cloudflare` or equivalent). The 4 GiB limit applies to all ephemeral disk usage.
**Warning signs:** Disk full errors, unhealthy container warnings.

### Pitfall 5: Worker Components Can't Receive Connections
**What goes wrong:** Temporal service is unreachable from the Postiz app.
**Why it happens:** If Temporal is deployed as a "worker" component type instead of a "service" component type, it can't receive inbound connections.
**How to avoid:** Always deploy Temporal as a "service" with `internal_ports: [7233]` and no `http_port` (making it internal-only). Never use the "worker" component type for Temporal.
**Warning signs:** Connection timeout when orchestrator tries to reach Temporal.

### Pitfall 6: Database Port on DO Managed PostgreSQL
**What goes wrong:** Temporal can't connect to PostgreSQL.
**Why it happens:** DO Managed PostgreSQL uses port 25060, not the default 5432. The `DB_PORT` env var for Temporal must be set correctly.
**How to avoid:** Use `${db.PORT}` bindable variable for the port, or hardcode 25060.
**Warning signs:** Connection refused on port 5432.
</common_pitfalls>

<code_examples>
## Code Examples

### Complete App Spec (Primary Deliverable)
```yaml
# .do/app.yaml
name: postiz
region: nyc
databases:
  - engine: PG
    name: db
    version: "16"
    production: false  # Use dev DB ($7/mo) initially, upgrade to production ($15/mo) when ready

services:
  # Option B: Build from source (recommended for initial deploy)
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
      initial_delay_seconds: 30
      period_seconds: 10
      timeout_seconds: 5
      failure_threshold: 6
    envs:
      - key: MAIN_URL
        value: "${APP_URL}"
      - key: FRONTEND_URL
        value: "${APP_URL}"
      - key: NEXT_PUBLIC_BACKEND_URL
        value: "${APP_URL}/api"
        scope: BUILD_TIME
      - key: JWT_SECRET
        value: "CHANGE_ME_RANDOM_STRING"
        type: SECRET
      - key: DATABASE_URL
        value: "${db.DATABASE_URL}"
      - key: BACKEND_INTERNAL_URL
        value: "http://localhost:3000"
      - key: TEMPORAL_ADDRESS
        value: "temporal:7233"
      - key: IS_GENERAL
        value: "true"
      - key: STORAGE_PROVIDER
        value: "local"
      - key: UPLOAD_DIRECTORY
        value: "/uploads"
      - key: NEXT_PUBLIC_UPLOAD_DIRECTORY
        value: "/uploads"
      - key: NX_ADD_PLUGINS
        value: "false"

  - name: temporal
    image:
      registry_type: DOCKER_HUB
      repository: temporalio/auto-setup
      tag: "1.29.3"
    internal_ports:
      - 7233
    instance_size_slug: apps-s-1vcpu-0.5gb
    instance_count: 1
    envs:
      - key: DB
        value: "postgres12"
      - key: DB_PORT
        value: "${db.PORT}"
      - key: POSTGRES_SEEDS
        value: "${db.HOSTNAME}"
      - key: POSTGRES_USER
        value: "${db.USERNAME}"
      - key: POSTGRES_PWD
        value: "${db.PASSWORD}"
        type: SECRET
      - key: POSTGRES_TLS_ENABLED
        value: "true"
      - key: POSTGRES_TLS_DISABLE_HOST_VERIFICATION
        value: "true"
      - key: ENABLE_ES
        value: "false"
      - key: TEMPORAL_ADDRESS
        value: "0.0.0.0:7233"
      - key: SKIP_ADD_CUSTOM_SEARCH_ATTRIBUTES
        value: "true"
```

### Database Bindable Variables Reference
```yaml
# Available bindable variables for a database component named "db":
# ${db.HOSTNAME}     - Private hostname (within VPC)
# ${db.PORT}         - Port (25060 for managed PostgreSQL)
# ${db.USERNAME}     - Database user
# ${db.PASSWORD}     - Database password
# ${db.DATABASE}     - Default database name
# ${db.DATABASE_URL} - Full connection string with TLS
# ${db.CA_CERT}      - CA certificate for TLS verification
```

### Temporal Environment Variables Reference
```bash
# Database selection
DB=postgres12                    # Database driver (postgres12, mysql8, cassandra)
DB_PORT=25060                    # PostgreSQL port (DO managed uses 25060)
POSTGRES_SEEDS=hostname          # PostgreSQL host
POSTGRES_USER=user               # PostgreSQL user
POSTGRES_PWD=password            # PostgreSQL password

# TLS (required for DO Managed PostgreSQL)
POSTGRES_TLS_ENABLED=true
POSTGRES_TLS_DISABLE_HOST_VERIFICATION=true

# Elasticsearch (disabled)
ENABLE_ES=false

# Schema (auto-setup handles these)
SKIP_SCHEMA_SETUP=false          # Set true after first successful boot if desired
SKIP_DB_CREATE=false             # Let auto-setup create temporal + temporal_visibility DBs
SKIP_DEFAULT_NAMESPACE_CREATION=false
SKIP_ADD_CUSTOM_SEARCH_ATTRIBUTES=true  # App registers its own search attributes

# Server binding
TEMPORAL_ADDRESS=0.0.0.0:7233   # Listen on all interfaces for internal_ports
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Temporalite standalone binary | Temporal CLI `server start-dev` | 2023 | Temporalite repo archived, functionality merged into CLI. Neither supports PostgreSQL — development only (SQLite). |
| `temporalio/auto-setup` with bundled CLI tools | Slimmed images (v1.30+) | 2025 | Docker images removing bundled tctl/CLI. Pin to 1.29.3 for now. |
| Elasticsearch required for visibility | SQL-based visibility (PostgreSQL) | Temporal 1.20+ | No Elasticsearch needed — PostgreSQL handles visibility queries natively |
| Separate Temporal PostgreSQL cluster | Shared cluster with app | — | Cost optimization — single managed cluster hosts all databases |

**New patterns:**
- **DO App Platform internal_ports:** Supports TCP/gRPC, enabling Temporal as an internal service without public exposure
- **DO bindable env vars:** `${db.DATABASE_URL}` etc. auto-inject connection details at runtime

**Deprecated/outdated:**
- **Temporalite:** Archived, absorbed into Temporal CLI, SQLite-only
- **`temporal server start-dev` for production:** Development-only, no PostgreSQL support
- **BullMQ for Postiz:** Project migrated to Temporal (the docker-compose.yaml confirms this)
</sota_updates>

<open_questions>
## Open Questions

1. **Dev database vs managed database for Temporal**
   - What we know: DO dev databases ($7/mo) are single-database PostgreSQL instances. Temporal needs 3 databases (temporal, temporal_visibility, plus postiz).
   - What's unclear: Whether `auto-setup` can create additional databases on a dev DB cluster (dev clusters may restrict `CREATEDB`).
   - Recommendation: Start with managed PostgreSQL ($15/mo) which allows multiple databases. If budget is tight, test dev DB first.

2. **Build time vs build resources**
   - What we know: App Platform provides 4 CPU, 10 GiB RAM, 24 GiB disk for builds with 1hr timeout. The Postiz build needs `NODE_OPTIONS="--max-old-space-size=4096"` (already set in Dockerfile.dev).
   - What's unclear: Whether the build completes within the 1hr timeout on App Platform's build infrastructure.
   - Recommendation: Use App Platform source build (Option B) first. If builds timeout, switch to GitHub Actions CI (Option A) which has more generous limits.

3. **Search attribute registration**
   - What we know: Postiz registers custom search attributes (`organizationId`, `postId`) on startup via `TemporalRegister`. Auto-setup can also register attributes.
   - What's unclear: Whether `SKIP_ADD_CUSTOM_SEARCH_ATTRIBUTES=true` conflicts with the app's own attribute registration.
   - Recommendation: Set `SKIP_ADD_CUSTOM_SEARCH_ATTRIBUTES=true` on Temporal service, let the Postiz backend register its own attributes. The app code already handles this.

4. **`NEXT_PUBLIC_BACKEND_URL` and `${APP_URL}` at build time**
   - What we know: Next.js `NEXT_PUBLIC_*` vars are baked in at build time. Since we build from source on App Platform, we can set them with `scope: BUILD_TIME`. App spec supports `${APP_URL}` for the app's public URL.
   - What's unclear: Whether `${APP_URL}` resolves during the build phase (before the app has a URL assigned). First deploy may not have a URL yet.
   - Recommendation: For first deploy, hardcode the URL or use a placeholder, then rebuild after the URL is assigned. Subsequent builds will have `${APP_URL}` available.

5. **GitHub repo access for App Platform source builds**
   - What we know: App Platform can build from GitHub repos. Requires GitHub app installation for the repo.
   - What's unclear: Whether the `appolabs/postiz-app` repo has the DO GitHub app installed.
   - Recommendation: Install the DigitalOcean GitHub app on the repo before creating the app. Alternatively, use GHCR image deployment if GitHub integration is problematic.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- [Temporal Documentation - Configuration Reference](https://docs.temporal.io/references/configuration) — server config YAML structure, PostgreSQL persistence options
- [Temporal Documentation - Deployment](https://docs.temporal.io/self-hosted-guide/deployment) — Docker deployment options, auto-setup vs server images
- [Temporal auto-setup.sh source](https://github.com/temporalio/docker-builds/blob/main/docker/auto-setup.sh) — complete env var reference, DB setup logic
- [Temporal docker-compose PostgreSQL](https://github.com/temporalio/docker-compose/blob/main/docker-compose-postgres.yml) — reference config for PostgreSQL deployment
- [DO App Platform - App Spec Reference](https://docs.digitalocean.com/products/app-platform/reference/app-spec/) — service, database, env var configuration
- [DO App Platform - Environment Variables](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/) — bindable variables syntax and database connection vars
- [DO App Platform - Internal Routing](https://docs.digitalocean.com/products/app-platform/how-to/manage-internal-routing/) — internal_ports support TCP/gRPC
- [DO App Platform - Limits](https://docs.digitalocean.com/products/app-platform/details/limits/) — 4 GiB filesystem, gVisor runtime, AMD64 only
- [DO App Platform - Pricing](https://docs.digitalocean.com/products/app-platform/details/pricing/) — instance sizes and costs

### Secondary (MEDIUM confidence)
- [Temporal Blog - Auto-Setup](https://temporal.io/blog/auto-setup) — auto-setup behavior, schema idempotency
- [Temporal Blog - Temporalite](https://temporal.io/blog/temporalite-the-foundation-of-the-new-temporal-cli-experience) — confirmed Temporalite → CLI merge, SQLite-only
- [Temporal Community - Custom Postgres DB](https://community.temporal.io/t/temporal-with-custom-postgres-db/4787) — community-verified PostgreSQL config patterns

### Tertiary (LOW confidence - needs validation)
- Dev database `CREATEDB` privileges — needs testing during deployment
- App Platform build time for Postiz monorepo — needs testing (1hr timeout)
- `${APP_URL}` availability during build phase — needs testing on first deploy
- GitHub app installation for source builds — needs verification
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: DO App Platform container deployment, Temporal Server self-hosting
- Ecosystem: `temporalio/auto-setup`, DO Managed PostgreSQL, DO bindable env vars
- Patterns: Two-service app architecture, internal gRPC routing, shared database cluster
- Pitfalls: TLS requirements, filesystem limits, worker vs service component types, port configuration

**Confidence breakdown:**
- Standard stack: HIGH — verified with official docs and Docker Hub
- Architecture: HIGH — DO internal_ports TCP support confirmed in official docs
- Pitfalls: HIGH — derived from official documentation limits and community reports
- Code examples: MEDIUM — app spec syntax verified, but bindable variable behavior with Temporal needs testing
- Temporalite finding: HIGH — confirmed deprecated via official Temporal blog

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (30 days — both ecosystems stable)
</metadata>

---

*Phase: 01-deployment*
*Research completed: 2026-02-28*
*Ready for planning: yes*
