---
phase: 01-deployment
plan: 01
subsystem: infra
tags: [docker, temporal, multi-stage-build, entrypoint]

# Dependency graph
requires:
  - phase: none
    provides: n/a
provides:
  - Dockerfile.dev with embedded Temporal server binaries via multi-stage build
  - Custom entrypoint.sh orchestrating Temporal + Postiz startup
affects: [01-deployment (plans 02, 03)]

# Tech tracking
tech-stack:
  added: [temporalio/auto-setup:1.29.3]
  patterns: [multi-stage Docker build for binary extraction, conditional entrypoint with TEMPORAL_EMBEDDED flag]

key-files:
  created: [var/docker/entrypoint.sh]
  modified: [Dockerfile.dev]

key-decisions:
  - "TEMPORAL_EMBEDDED env var controls whether Temporal runs inside the container"
  - "auto-setup.sh backgrounded because it blocks after starting temporal-server"
  - "120s timeout (60 iterations x 2s) for Temporal gRPC readiness check"
  - "NEXT_PUBLIC_BACKEND_URL added as build arg for DO App Platform"

patterns-established:
  - "Conditional service embedding: env flag enables/disables embedded services"
  - "Port readiness check via bash /dev/tcp before starting dependent services"

# Metrics
duration: 2min
completed: 2026-02-28
---

# Plan 01-01: Dockerfile + Entrypoint Summary

**Multi-stage Docker build embedding Temporal server binaries with conditional entrypoint for single-container deployment**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T03:21:03Z
- **Completed:** 2026-02-28T03:22:15Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Dockerfile.dev extended with temporalio/auto-setup:1.29.3 multi-stage build
- Temporal server, sql-tool, and schema files copied into final image
- NEXT_PUBLIC_BACKEND_URL build arg added for DO App Platform deployment
- Entrypoint script handles both embedded Temporal mode and direct startup

## Task Commits

Each task was committed atomically:

1. **Task 1: Modify Dockerfile.dev with multi-stage Temporal build** - `7462ef6b` (feat)
2. **Task 2: Create custom entrypoint script** - `ea8bdf0f` (feat)

## Files Created/Modified
- `Dockerfile.dev` - Added temporal multi-stage build, NEXT_PUBLIC_BACKEND_URL arg, COPY --from=temporal, entrypoint copy, updated CMD
- `var/docker/entrypoint.sh` - Conditional Temporal auto-setup with port readiness check, then nginx + pm2 startup

## Decisions Made
- TEMPORAL_EMBEDDED env var as the toggle: keeps the image backward-compatible with dev setups that use external Temporal
- auto-setup.sh backgrounded: it starts temporal-server as a foreground process at the end, so we must background it to continue startup
- 120s timeout for Temporal readiness: generous for cold-start schema migration on managed PostgreSQL
- NEXT_PUBLIC_BACKEND_URL as build arg: DO App Platform passes build-time env vars as Docker build args, and Next.js inlines NEXT_PUBLIC_* at build time

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dockerfile.dev ready for DO App Platform deployment
- Next plan (01-02) will create the DO app spec and deploy
- Entrypoint requires TEMPORAL_EMBEDDED=true and PostgreSQL connection vars at runtime

---
*Phase: 01-deployment*
*Completed: 2026-02-28*
