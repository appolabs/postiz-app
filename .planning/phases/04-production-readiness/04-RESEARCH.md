# Phase 4: Production Readiness - Research

**Researched:** 2026-02-28
**Domain:** DO App Platform production ops + embedded Temporal monitoring
**Confidence:** HIGH

<research_summary>
## Summary

Researched DigitalOcean App Platform production capabilities and embedded Temporal server monitoring for the Postiz single-container deployment. The platform provides basic infrastructure monitoring (CPU, memory, restarts) but lacks application-level observability. Two critical gaps were discovered: runtime logs are ephemeral (lost on deploy/restart) and the Temporal server process is not managed by pm2 (no auto-restart on crash).

The standard approach for production readiness on DO App Platform is: configure log forwarding to an external service, set up DO built-in alerts for infrastructure metrics, add a proper health check endpoint, and ensure all processes are managed for automatic recovery.

**Primary recommendation:** Configure log forwarding (Logtail free tier), put Temporal under pm2, add a `/health` endpoint that checks all services, and enable DO alerts for CPU/memory/restarts. No custom monitoring infrastructure needed.
</research_summary>

<standard_stack>
## Standard Stack

### Core (DO Platform - Already Available)
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| DO App Platform Insights | N/A | CPU, memory, restart monitoring | Built-in, no setup required |
| DO App Platform Alerts | N/A | Threshold-based alerting (email/Slack) | Built-in, covers infra basics |
| DO Managed PostgreSQL Backups | N/A | Daily automatic backups, 7-day PITR | Included in $15/mo plan |
| DO Team Roles | N/A | 6 predefined + custom roles (2025) | Built-in IAM |

### Supporting (Needs Configuration)
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Logtail (Better Stack) | SaaS | Log forwarding and search | Free tier (1 GB/day) - sufficient for single instance |
| Temporal Prometheus endpoint | Built-in | Workflow/persistence metrics | Enable via `PROMETHEUS_ENDPOINT` env var |
| pm2 | Already installed | Process management for all services | Already used for Node apps, extend to Temporal |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Logtail | Datadog | Datadog more powerful but paid; Logtail free tier sufficient for small team |
| Logtail | Papertrail | Similar capability; Logtail has better free tier |
| DO built-in alerts | External alerting (PagerDuty) | Overkill for small team; DO email/Slack is adequate |
| Skip Temporal Web UI | Add Temporal Web UI | Nice for debugging but adds container complexity; CLI works for small scale |
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Current Architecture (As-Is)
```
Container (DO App Platform, port 5000)
├── nginx (reverse proxy, port 5000)
│   ├── /api/* → backend:3000
│   ├── /uploads/* → filesystem
│   └── /* → frontend:4200
├── pm2-managed:
│   ├── backend (NestJS, port 3000)
│   ├── frontend (Next.js, port 4200)
│   └── orchestrator (Temporal worker)
└── NOT pm2-managed:
    └── temporal-server (Go, port 7233) ← backgrounded with &
```

### Target Architecture (To-Be)
```
Container (DO App Platform, port 5000)
├── nginx (reverse proxy, port 5000)
│   ├── /api/* → backend:3000
│   ├── /uploads/* → filesystem
│   └── /* → frontend:4200
├── pm2-managed:
│   ├── backend (NestJS, port 3000)
│   ├── frontend (Next.js, port 4200)
│   ├── orchestrator (Temporal worker)
│   └── temporal-server (Go, port 7233) ← NEW: under pm2
├── Temporal Prometheus metrics (port 8000) ← NEW
└── Log forwarding → Logtail ← NEW
```

### Pattern 1: Health Check Endpoint
**What:** Single `/health` endpoint that validates all internal services
**When to use:** DO App Platform readiness probe + liveness probe
**Approach:**
```typescript
// Backend health endpoint checks:
// 1. Database connectivity (Prisma query)
// 2. Temporal server reachability (TCP check port 7233)
// 3. Returns 200 only if all services healthy
```

### Pattern 2: Structured Log Forwarding
**What:** Configure `log_destinations` in DO app spec to forward runtime logs
**When to use:** Always in production - runtime logs are ephemeral without this
**Approach:**
```yaml
# In .do/app.yaml
services:
  - name: postiz
    log_destinations:
      - name: logtail
        logtail:
          token: ${LOGTAIL_SOURCE_TOKEN}
```

### Pattern 3: Temporal Under pm2
**What:** Run schema setup separately, then manage temporal-server as a pm2 process
**When to use:** Always - current backgrounding has no crash recovery
**Approach:**
- Entrypoint runs `auto-setup.sh` for schema migration (blocking, one-time)
- Then starts `temporal-server` via pm2 (managed, auto-restart on crash)
- pm2 provides unified logging for all processes

### Anti-Patterns to Avoid
- **Running Temporal with `&` (backgrounding):** No crash recovery, no log management, silent failures
- **Custom monitoring dashboards:** DO built-in + Logtail covers everything for a small-team deployment
- **Polling external uptime services:** DO health checks already handle this; don't add UptimeRobot/Pingdom
- **Custom backup scripts for PostgreSQL:** DO Managed PG already provides daily backups with 7-day PITR
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Infrastructure monitoring | Custom CPU/memory tracking | DO App Platform Insights | Built-in, no code needed |
| Alerting | Custom alert system | DO Alerts (email/Slack) | Configurable thresholds, built-in channels |
| Log retention | Custom log rotation/storage | Logtail log forwarding | Runtime logs are ephemeral on DO; forwarding is the only way |
| Database backups | pg_dump cron scripts | DO Managed PostgreSQL backups | Daily automatic, 7-day PITR, zero maintenance |
| Process management | Custom watchdog scripts | pm2 | Already installed, proven, handles restart/logging |
| Temporal metrics | Custom metric collection | `PROMETHEUS_ENDPOINT` env var | Built-in to Temporal server, zero code |
| Team access control | Custom auth/roles | DO Team Roles | 6 predefined roles + custom roles since 2025 |

**Key insight:** For a small-team self-hosted deployment, the platform provides all the operational primitives. The work is configuration, not coding. The only code change needed is a health check endpoint.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Temporal Server Crash Goes Undetected
**What goes wrong:** Temporal server crashes, posts stop publishing, no alert fires
**Why it happens:** `auto-setup.sh` is backgrounded with `&`, not managed by pm2. If temporal-server (subprocess) dies, the shell process may or may not exit. pm2 doesn't know about it.
**How to avoid:** Run temporal-server under pm2 with auto-restart. Add health check that probes port 7233.
**Warning signs:** Posts not publishing, orchestrator throwing connection errors in logs

### Pitfall 2: Runtime Logs Lost on Deploy
**What goes wrong:** App deploys, previous runtime logs vanish completely
**Why it happens:** DO App Platform has zero runtime log retention. Logs are only available in real-time via control panel or `doctl apps logs`.
**How to avoid:** Configure log forwarding BEFORE going to production. Logtail free tier (1 GB/day) is sufficient.
**Warning signs:** Unable to debug issues after a deploy, no historical logs to search

### Pitfall 3: NUM_HISTORY_SHARDS Lock-In
**What goes wrong:** Temporal performance degrades as workflow volume grows, can't fix without recreating databases
**Why it happens:** `NUM_HISTORY_SHARDS` is immutable after initial Temporal database creation. Default may be 4 (development value). Production recommendation is 512.
**How to avoid:** Verify shard count before first production deploy. Set `NUM_HISTORY_SHARDS=512` in entrypoint if deploying fresh.
**Warning signs:** `persistence_latency` increasing, lock contention in Temporal tables

### Pitfall 4: Health Check Only Validates Frontend
**What goes wrong:** DO health check passes (root `/` returns 200) but backend or Temporal is down
**Why it happens:** Current health check hits root controller which only confirms the nginx→frontend path. Backend or Temporal failures are invisible.
**How to avoid:** Add `/health` endpoint that checks database + Temporal connectivity. Point DO health check at it.
**Warning signs:** App appears "up" but posts don't publish, API returns 500s

### Pitfall 5: Database Connection Pool Exhaustion
**What goes wrong:** Random connection errors from both Postiz and Temporal
**Why it happens:** Postiz (Prisma) and Temporal server share the same DO Managed PostgreSQL instance. Combined connection count exceeds the plan's limit (25 connections on $15/mo plan).
**How to avoid:** Monitor connection count. Temporal defaults can consume 10-20 connections. Prisma defaults to ~5. Total must stay under plan limit.
**Warning signs:** Intermittent `ECONNREFUSED` or `too many connections` errors
</common_pitfalls>

<code_examples>
## Code Examples

### Health Check Endpoint (NestJS)
```typescript
// Source: NestJS patterns + current codebase root.controller.ts
@Controller('health')
export class HealthController {
  constructor(private prismaService: PrismaService) {}

  @Get()
  async check() {
    // Check database
    await this.prismaService.$queryRaw`SELECT 1`;

    // Check Temporal (TCP probe)
    await new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(3000);
      socket.connect(7233, 'localhost', () => { socket.destroy(); resolve(true); });
      socket.on('error', reject);
      socket.on('timeout', () => { socket.destroy(); reject(new Error('timeout')); });
    });

    return { status: 'ok' };
  }
}
```

### DO App Spec with Log Forwarding
```yaml
# Source: DO App Platform docs
services:
  - name: postiz
    health_check:
      http_path: /api/health
      initial_delay_seconds: 120
      period_seconds: 10
      timeout_seconds: 5
      failure_threshold: 6
      port: 5000
    log_destinations:
      - name: logtail
        logtail:
          token: ${LOGTAIL_SOURCE_TOKEN}
```

### Temporal Under pm2 (Entrypoint Pattern)
```bash
# Source: Temporal auto-setup docs + pm2 patterns
# 1. Run schema setup (blocking, idempotent)
/etc/temporal/auto-setup.sh &
SETUP_PID=$!

# Wait for setup to complete (port becomes available)
while ! echo > /dev/tcp/localhost/7233 2>/dev/null; do sleep 2; done

# 2. Kill the auto-setup background (which started temporal-server)
kill $SETUP_PID 2>/dev/null || true
wait $SETUP_PID 2>/dev/null || true

# 3. Start temporal-server under pm2 (managed, auto-restart)
pm2 start temporal-server --name temporal -- start \
  --config /etc/temporal/config/config_template.yaml
```

### DO Alerts Configuration (via doctl)
```bash
# Source: DO API docs
doctl monitoring alert create \
  --type "apps_cpu_percentage" \
  --compare "GreaterThan" \
  --value 80 \
  --window "5m" \
  --emails "team@example.com"

doctl monitoring alert create \
  --type "apps_memory_percentage" \
  --compare "GreaterThan" \
  --value 85 \
  --window "5m" \
  --emails "team@example.com"

doctl monitoring alert create \
  --type "apps_restart_count" \
  --compare "GreaterThan" \
  --value 3 \
  --window "10m" \
  --emails "team@example.com"
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom uptime monitoring | DO health checks + liveness probes | 2025 (liveness probes public preview) | No need for external uptime services |
| tctl CLI for Temporal | temporal CLI | 2024 (tctl EOL Sept 2025) | Use `temporal operator cluster health` instead of `tctl cluster health` |
| Manual DO team roles | Custom RBAC roles | Mid-2025 | Granular per-service permissions now available |
| Basic DO metrics only | DO monitoring API | 2024-2025 | CPU/memory/restart metrics available via API for custom dashboards |

**New tools/patterns to consider:**
- **DO Liveness Probes (Public Preview):** Automatically restart instances when health checks fail. Separate from readiness probes. Worth enabling alongside health checks.
- **Logtail Free Tier:** 1 GB/day log ingestion with 3-day retention. Sufficient for a single-instance Postiz deployment. No credit card required.

**Deprecated/outdated:**
- **tctl:** End of life September 2025. Replace with `temporal` CLI.
- **Prometheus + Grafana self-hosted:** Overkill for small-team single-instance deployment. Logtail or Datadog log-based metrics are more practical.
</sota_updates>

<open_questions>
## Open Questions

1. **NUM_HISTORY_SHARDS value on current setup**
   - What we know: Default for auto-setup may be 4; production recommendation is 512
   - What's unclear: What value was actually set when Temporal databases were first created (Phase 1 hasn't deployed yet, so this is a pre-deployment decision)
   - Recommendation: Set `NUM_HISTORY_SHARDS=512` in entrypoint before first deployment. Verify in auto-setup.sh defaults.

2. **PostgreSQL connection pool limits on $15/mo plan**
   - What we know: Prisma + Temporal + Temporal visibility all connect to same instance. Plan limits are typically 25 connections.
   - What's unclear: Exact connection limit for the $15/mo plan. Combined pool usage of Prisma + Temporal.
   - Recommendation: Check DO docs for exact limits. Monitor connection count after deployment. May need to tune Prisma pool size or Temporal maxConns.

3. **Temporal server direct pm2 management**
   - What we know: auto-setup.sh runs schema setup then starts temporal-server as subprocess
   - What's unclear: Whether temporal-server can be cleanly started under pm2 after auto-setup.sh exits, or if auto-setup needs to keep running
   - Recommendation: Test locally. May need to split auto-setup.sh into schema-only + separate server start.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- DO App Platform docs: [Insights](https://docs.digitalocean.com/products/app-platform/how-to/view-insights/), [Alerts](https://docs.digitalocean.com/products/app-platform/how-to/create-alerts/), [Logs](https://docs.digitalocean.com/products/app-platform/how-to/view-logs/), [Log Forwarding](https://docs.digitalocean.com/products/app-platform/how-to/forward-logs/), [Health Checks](https://docs.digitalocean.com/products/app-platform/how-to/manage-health-checks/), [Scaling](https://docs.digitalocean.com/products/app-platform/how-to/scale-app/)
- DO Managed PostgreSQL docs: [Backups](https://docs.digitalocean.com/products/databases/postgresql/how-to/restore-from-backups/)
- DO Team Roles docs: [Predefined](https://docs.digitalocean.com/platform/teams/roles/predefined/), [Custom](https://docs.digitalocean.com/platform/teams/how-to/use-custom-roles/)
- Temporal docs: [Cluster Metrics](https://docs.temporal.io/references/cluster-metrics), [Self-Hosted Monitoring](https://docs.temporal.io/self-hosted-guide/monitoring), [Configuration](https://docs.temporal.io/references/configuration), [Deployment](https://docs.temporal.io/self-hosted-guide/deployment)

### Secondary (MEDIUM confidence)
- [Temporal auto-setup blog post](https://temporal.io/blog/auto-setup) — verified against Docker Hub image docs
- [Temporal Docker health check issue #109](https://github.com/temporalio/docker-builds/issues/109) — verified behavior against entrypoint.sh
- [Temporal community: baseline resource consumption](https://community.temporal.io/t/baseline-server-resource-consumption/19267) — memory estimates, verified against docs
- [DO Custom Roles announcement (July 2025)](https://www.digitalocean.com/blog/introducing-custom-roles) — verified against current docs

### Tertiary (LOW confidence - needs validation)
- Temporal pm2 management pattern (splitting auto-setup.sh into schema-only + server start) — needs local testing
- Connection pool limits for $15/mo PostgreSQL plan — needs verification against DO plan details
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: DigitalOcean App Platform production features
- Ecosystem: Managed PostgreSQL backups, log forwarding (Logtail), Temporal metrics
- Patterns: Health checks, process management, alerting
- Pitfalls: Log loss, Temporal crash undetected, history shard lock-in, connection pool exhaustion

**Confidence breakdown:**
- Standard stack: HIGH — verified against DO official documentation
- Architecture: HIGH — based on current codebase analysis + platform capabilities
- Pitfalls: HIGH — derived from actual codebase gaps (Temporal not under pm2, no log forwarding)
- Code examples: MEDIUM — health check pattern is standard; Temporal pm2 pattern needs local testing

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (30 days — DO platform and Temporal are stable)
</metadata>

---

*Phase: 04-production-readiness*
*Research completed: 2026-02-28*
*Ready for planning: yes*
