# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** A stable, self-hosted social media scheduling server the team can rely on daily, with the ability to customize features as needs emerge.
**Current focus:** v1.1 Runtime Optimization — Phases 4-8

## Current Position

Phase: 4 of 8 (PM2 Memory Guardrails)
Plan: Not started
Status: Ready to plan
Last activity: 2026-02-28 — Milestone v1.1 created

Progress: ███░░░░░░░ 33%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 2.6 min
- Total execution time: 13 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-deployment | 1/3 | 2 min | 2 min |
| 02-calendar-platform-filtering | 2/2 | 7 min | 3.5 min |
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

### Roadmap Evolution

- Milestone v1.1 created: Runtime memory/CPU optimization, 5 phases (Phase 4-8)

## Session Continuity

Last session: 2026-02-28
Stopped at: Milestone v1.1 initialization
Resume file: None
