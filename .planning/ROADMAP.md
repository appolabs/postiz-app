# Roadmap: Appo Postiz

## Overview

Deploy a self-hosted Postiz instance on DigitalOcean App Platform as a single container (app + Temporalite), add calendar platform filtering and increased media upload limits, then harden for daily production use.

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Deployment** - Single-container deploy to DO App Platform with Temporalite and managed PostgreSQL
- [ ] **Phase 2: Calendar Platform Filtering** - Add platform-based post filtering to calendar view
- [ ] **Phase 3: Media Upload Limit** - Increase media file upload size limit in the backend
- [ ] **Phase 4: Production Readiness** - Monitoring, backups, team access, and smoke testing

## Phase Details

### Phase 1: Deployment
**Goal**: Postiz running on DO App Platform — single container with backend, frontend, orchestrator, and Temporalite, backed by DO Managed PostgreSQL. No Redis (in-memory fallback). No Elasticsearch.
**Depends on**: Nothing (first phase)
**Research**: Likely (Temporalite integration, DO App Platform configuration)
**Research topics**: Temporalite binary integration into existing Docker image, Temporalite PostgreSQL backend config, DO App Platform container deployment, app spec configuration
**Plans**: TBD

Plans:
- [ ] 01-01: Add Temporalite to Docker image and entrypoint (pm2 process alongside existing apps)
- [ ] 01-02: Configure DO App Platform spec and managed PostgreSQL, deploy
- [ ] 01-03: Verify end-to-end functionality (app ↔ DB ↔ Temporalite, post scheduling works)

### Phase 2: Calendar Platform Filtering
**Goal**: Users can filter calendar posts by social platform (e.g., show only X posts, only LinkedIn posts)
**Depends on**: Phase 1
**Research**: Unlikely (internal codebase modification, existing patterns)
**Plans**: TBD

Plans:
- [ ] 02-01: Add platform filter parameter to posts API endpoint
- [ ] 02-02: Add platform filter UI controls to calendar view

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
| 1. Deployment | 0/3 | Not started | - |
| 2. Calendar Platform Filtering | 0/2 | Not started | - |
| 3. Media Upload Limit | 0/1 | Not started | - |
| 4. Production Readiness | 0/1 | Not started | - |
