# Roadmap: Appo Postiz

## Overview

Deploy a self-hosted Postiz fork on DigitalOcean App Platform as a single container (app + embedded Temporal server via multi-stage build), add calendar platform filtering and increased media upload limits. Optimize runtime memory/CPU for the constrained 2GB container.

## Domain Expertise

None

## Milestones

- ✅ **v1.0 MVP** - Phases 1-3 (shipped 2026-02-28)
- 🚧 **v1.1 Runtime Optimization** - Phases 4-8 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

<details>
<summary>✅ v1.0 MVP (Phases 1-3) - SHIPPED 2026-02-28</summary>

### Phase 1: Deployment
**Goal**: Our Postiz fork running on DO App Platform — single container with backend, frontend, orchestrator, and embedded Temporal server (via multi-stage Docker build from `temporalio/auto-setup:1.29.3`), backed by DO Managed PostgreSQL. No Redis (in-memory MockRedis fallback). No Elasticsearch (SQL-based visibility). App Platform builds from our GitHub repo on push to `main`.
**Depends on**: Nothing (first phase)
**Research**: Done — see `.planning/phases/01-deployment/01-RESEARCH.md`
**Key findings**: Temporalite is deprecated (SQLite-only). Full Temporal server required for PostgreSQL. Multi-stage build copies `temporal-server`, `temporal-sql-tool`, schema files from official image. Custom entrypoint runs schema setup then starts all processes via pm2.
**Plans**: 3 plans

Plans:
- [x] 01-01: Modify Dockerfile.dev — multi-stage build to embed Temporal server binaries and custom entrypoint
- [ ] 01-02: Create DO App Platform app spec and deploy with managed PostgreSQL
- [ ] 01-03: Verify end-to-end functionality (app ↔ DB ↔ Temporal, post scheduling works)

### Phase 2: Calendar Platform Filtering
**Goal**: Users can filter calendar posts by social platform (e.g., show only X posts, only LinkedIn posts)
**Depends on**: Phase 1
**Research**: Unlikely (internal codebase modification, existing patterns)
**Plans**: 2 plans

Plans:
- [x] 02-01: Add platform filter parameter to posts API endpoint
- [x] 02-02: Add platform filter UI controls to calendar view

### Phase 3: Media Upload Limit
**Goal**: Increased media file upload size limit in the backend
**Depends on**: Phase 1
**Research**: Unlikely (internal backend change)
**Plans**: 1 plan

Plans:
- [x] 03-01: Find and increase media upload size limits

</details>

### 🚧 v1.1 Runtime Optimization (In Progress)

**Milestone Goal:** Reduce memory and CPU usage of the single-container deployment to run comfortably within the 2GB DO App Platform instance.

#### Phase 4: PM2 Memory Guardrails
**Goal**: Add PM2 ecosystem.config.js with max-memory-restart limits, replacing ad-hoc CLI commands. Prevents OOM rollercoaster by auto-restarting processes that leak past threshold.
**Depends on**: Previous milestone complete
**Research**: Unlikely (PM2 ecosystem config)
**Plans**: TBD

Plans:
- [ ] 04-01: TBD (run /gsd:plan-phase 4 to break down)

#### Phase 5: Next.js Standalone Output
**Goal**: Switch to `output: 'standalone'` to ship only traced dependencies instead of full node_modules, saving ~200-300MB runtime memory.
**Depends on**: Phase 4
**Research**: Unlikely (Next.js built-in feature)
**Plans**: TBD

Plans:
- [ ] 05-01: TBD (run /gsd:plan-phase 5 to break down)

#### Phase 6: Lazy-Load Social Providers
**Goal**: Defer instantiation of 32 social providers from startup to on-demand, saving ~50-150MB by only loading providers the user has connected.
**Depends on**: Phase 4
**Research**: Unlikely (internal NestJS patterns)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD (run /gsd:plan-phase 6 to break down)

#### Phase 7: Defer AI/Chat Module
**Goal**: Lazy-load Mastra, LangChain, and OpenAI SDK on first chat/MCP request instead of at boot, saving ~50-100MB for users who don't use the AI copilot.
**Depends on**: Phase 4
**Research**: Unlikely (NestJS lazy module pattern)
**Plans**: TBD

Plans:
- [ ] 07-01: TBD (run /gsd:plan-phase 7 to break down)

#### Phase 8: Multi-Stage Dockerfile
**Goal**: Strip build tools (g++, make, python3-pip) and dev dependencies from final image, reducing image size by ~300-500MB and improving deploy times.
**Depends on**: Phase 5
**Research**: Unlikely (standard Docker patterns)
**Plans**: TBD

Plans:
- [ ] 08-01: TBD (run /gsd:plan-phase 8 to break down)

## Progress

**Execution Order:**
Phases 4 executes first, then 5-7 in parallel, then 8 last (depends on 5).

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Deployment | v1.0 | 1/3 | In progress | - |
| 2. Calendar Platform Filtering | v1.0 | 2/2 | Complete | 2026-02-28 |
| 3. Media Upload Limit | v1.0 | 1/1 | Complete | 2026-02-28 |
| 4. PM2 Memory Guardrails | v1.1 | 0/? | Not started | - |
| 5. Next.js Standalone Output | v1.1 | 0/? | Not started | - |
| 6. Lazy-Load Social Providers | v1.1 | 0/? | Not started | - |
| 7. Defer AI/Chat Module | v1.1 | 0/? | Not started | - |
| 8. Multi-Stage Dockerfile | v1.1 | 0/? | Not started | - |
