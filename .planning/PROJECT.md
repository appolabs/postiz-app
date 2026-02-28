# Appo Postiz

## What This Is

A self-hosted Postiz instance for Appo's internal team to schedule and manage social media posts across 28+ channels. Deployed on DigitalOcean, with incremental feature customizations driven by team needs.

## Core Value

A stable, self-hosted social media scheduling server the team can rely on daily, with the ability to customize features as needs emerge.

## Requirements

### Validated

- ✓ Post scheduling across 28+ social channels — existing
- ✓ Calendar view with day/week/month/list modes — existing
- ✓ Analytics dashboard — existing
- ✓ Media library with upload support — existing
- ✓ Team management and collaboration — existing
- ✓ AI copilot for content generation — existing
- ✓ Webhook integrations — existing
- ✓ Temporal-based background job processing — existing

### Active

- [ ] Production deployment on DigitalOcean (PostgreSQL, Redis, Temporal, app containers)
- [ ] Calendar platform filtering (filter posts by specific social platforms)

### Out of Scope

- Multi-tenant / client-facing setup — internal team only for now
- Custom branding / white-labeling — fine with Postiz branding
- CI/CD pipeline — manual deploys initially
- New social platform integrations — use existing 28+ channels first

## Context

- Postiz is a mature open-source monorepo (NestJS backend, Next.js frontend, Temporal orchestrator)
- Codebase mapped in `.planning/codebase/` (7 documents)
- Calendar platform filtering is a feature gap — currently only filters by customer, not by platform
- The project will evolve with additional customizations over time based on team needs
- Backend follows strict Controller → Service → Repository layering
- No test coverage exists in the codebase

## Constraints

- **Hosting**: Must deploy on existing DigitalOcean account
- **Package Manager**: pnpm only (monorepo requirement)
- **Node Version**: >=22.12.0 <23.0.0
- **Architecture**: Maintain existing 3-tier backend pattern (Controller → Service → Repository)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Self-host on DigitalOcean | Existing account, full control over customizations | — Pending |
| Internal team use only | No multi-tenant complexity needed | — Pending |
| Calendar filtering as first feature | Direct team need, well-scoped | — Pending |
| Manual deploys initially | Reduce setup overhead, CI/CD can come later | — Pending |
| DO App Platform, single container | Minimize cost, existing Dockerfile runs all apps via pm2 | Decided |
| ~~Temporalite instead of full Temporal~~ | ~~No Elasticsearch needed, lighter resource usage~~ | **Superseded** — Temporalite deprecated (SQLite-only) |
| Full Temporal server embedded via multi-stage build | Temporalite is deprecated/SQLite-only. COPY binaries from `temporalio/auto-setup:1.29.3` into our image. | Decided |
| No Redis initially | Built-in MockRedis fallback exists, acceptable for internal team | Decided |
| DO Managed PostgreSQL ($15/mo) | Shared by app + Temporal (3 DBs). Dev DB ($7/mo) can't create additional databases. | Decided |
| No Elasticsearch | SQL-based visibility in PostgreSQL sufficient for 1 user | Decided |
| App Platform builds from GitHub source | Auto-build on push to main, uses our Dockerfile.dev | Decided |

---
*Last updated: 2026-02-28 after phase 1 research*
