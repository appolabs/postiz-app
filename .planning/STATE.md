# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** A stable, self-hosted social media scheduling server the team can rely on daily, with the ability to customize features as needs emerge.
**Current focus:** Phase 3 — Media Upload Limit

## Current Position

Phase: 3 of 3 (Media Upload Limit)
Plan: 03-01 complete
Status: Plan 03-01 executed — upload limits raised to 100MB images, 10GB videos across all layers
Last activity: 2026-02-28 — Plan 03-01 (backend, frontend, nginx upload limits) complete

Progress: ████████░░ 83%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 2.75 min
- Total execution time: 11 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-deployment | 1/3 | 2 min | 2 min |
| 02-calendar-platform-filtering | 2/? | 7 min | 3.5 min |
| 03-media-upload-limit | 1/1 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 01-01 (2 min), 02-01 (2 min), 02-02 (5 min), 03-01 (2 min)
- Trend: Consistent

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Single container on DO App Platform (no separate workers)
- **Research: Temporalite deprecated (SQLite-only) → use full Temporal server embedded via multi-stage build from `temporalio/auto-setup:1.29.3`**
- Roadmap: No Redis initially (in-memory MockRedis fallback)
- Roadmap: No Elasticsearch (SQL-based visibility in PostgreSQL)
- Roadmap: DO Managed PostgreSQL $15/mo (dev DB can't create additional databases)
- Roadmap: App Platform builds from GitHub source on push
- 01-01: TEMPORAL_EMBEDDED env var toggles embedded Temporal mode in entrypoint
- 01-01: NEXT_PUBLIC_BACKEND_URL build arg added for DO App Platform (Next.js inlines at build time)
- 02-01: Merged Prisma integration relation filters into single object to avoid spread overwrite bug
- 02-01: Platform filter uses integration.providerIdentifier field (already indexed)
- 02-02: Used identifier field to deduplicate platforms (multiple integrations share same platform)
- 02-02: Filter icon (funnel SVG) distinguishes platform filter from customer filter (user icon)
- 02-02: Platform filter only renders when 2+ unique platforms exist
- **Process: Always check for existing tests before plan execution. If tests exist, update/add tests for changes. Run test suite before committing.**
- Process: No test files exist in project source as of 2026-02-28 (Jest config present but no specs). Re-check each phase.

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-28
Stopped at: Plan 03-01 complete (media upload limits)
Resume file: None
