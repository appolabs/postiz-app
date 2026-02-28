# Roadmap: Appo Postiz

## Overview

Deploy a self-hosted Postiz fork on DigitalOcean App Platform as a single container (app + embedded Temporal server via multi-stage build), add calendar platform filtering and increased media upload limits, then harden for daily production use.

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Deployment** - Single-container deploy to DO App Platform with embedded Temporal server and managed PostgreSQL
- [x] **Phase 2: Calendar Platform Filtering** - Add platform-based post filtering to calendar view
- [ ] **Phase 3: Media Upload Limit** - Increase media file upload size limit in the backend
- [ ] **Phase 4: Production Readiness** - Monitoring, backups, team access, and smoke testing

## Phase Details

### Phase 1: Deployment
**Goal**: Our Postiz fork running on DO App Platform — single container with backend, frontend, orchestrator, and embedded Temporal server (via multi-stage Docker build from `temporalio/auto-setup:1.29.3`), backed by DO Managed PostgreSQL. No Redis (in-memory MockRedis fallback). No Elasticsearch (SQL-based visibility). App Platform builds from our GitHub repo on push to `main`.
**Depends on**: Nothing (first phase)
**Research**: Done — see `.planning/phases/01-deployment/01-RESEARCH.md`
**Key findings**: Temporalite is deprecated (SQLite-only). Full Temporal server required for PostgreSQL. Multi-stage build copies `temporal-server`, `temporal-sql-tool`, schema files from official image. Custom entrypoint runs schema setup then starts all processes via pm2.
**Plans**: TBD

Plans:
- [x] 01-01: Modify Dockerfile.dev — multi-stage build to embed Temporal server binaries and custom entrypoint
- [ ] 01-02: Create DO App Platform app spec and deploy with managed PostgreSQL
- [ ] 01-03: Verify end-to-end functionality (app ↔ DB ↔ Temporal, post scheduling works)

### Phase 2: Calendar Platform Filtering
**Goal**: Users can filter calendar posts by social platform (e.g., show only X posts, only LinkedIn posts)
**Depends on**: Phase 1
**Research**: Unlikely (internal codebase modification, existing patterns)
**Plans**: TBD

Plans:
- [x] 02-01: Add platform filter parameter to posts API endpoint
- [x] 02-02: Add platform filter UI controls to calendar view

### Phase 3: Media Upload Limit
**Goal**: Increased media file upload size limit in the backend
**Depends on**: Phase 1
**Research**: Unlikely (internal backend change)
**Plans**: TBD

Plans:
- [ ] 03-01: Find and increase media upload size limits

### Phase 4: Production Readiness
**Goal**: Production environment hardened for daily team use — monitoring, backups, access configured
**Depends on**: Phases 2, 3
**Research**: Unlikely (standard operational setup)
**Plans**: TBD

Plans:
- [ ] 04-01: Configure backups, monitoring, and team access

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4
(Phases 2 and 3 can run in parallel after Phase 1)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Deployment | 1/3 | In progress | - |
| 2. Calendar Platform Filtering | 2/2 | Complete | 2026-02-28 |
| 3. Media Upload Limit | 0/1 | Not started | - |
| 4. Production Readiness | 0/1 | Not started | - |
