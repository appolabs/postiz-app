# Roadmap: Appo Postiz

## Overview

Deploy a self-hosted Postiz instance on DigitalOcean for the Appo team, add calendar platform filtering and increased media upload limits, then harden for daily production use.

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Infrastructure Provisioning** - Set up DigitalOcean managed services and networking
- [ ] **Phase 2: Application Deployment** - Containerize and deploy all apps on DigitalOcean
- [ ] **Phase 3: Calendar Platform Filtering** - Add platform-based post filtering to calendar view
- [ ] **Phase 4: Media Upload Limit** - Increase media file upload size limit in the backend
- [ ] **Phase 5: Production Readiness** - Monitoring, backups, team access, and smoke testing

## Phase Details

### Phase 1: Infrastructure Provisioning
**Goal**: DigitalOcean resources running and accessible — managed PostgreSQL, Redis, Temporal server, networking/firewall
**Depends on**: Nothing (first phase)
**Research**: Likely (external infrastructure setup)
**Research topics**: DO managed PostgreSQL/Redis configuration, Temporal server deployment options on DO, VPC networking and firewall rules
**Plans**: TBD

Plans:
- [ ] 01-01: Provision managed PostgreSQL and Redis on DigitalOcean
- [ ] 01-02: Deploy Temporal server on DigitalOcean
- [ ] 01-03: Configure VPC, firewall rules, and DNS

### Phase 2: Application Deployment
**Goal**: Backend, frontend, and orchestrator running in production on DigitalOcean
**Depends on**: Phase 1
**Research**: Likely (containerization and deployment strategy)
**Research topics**: Docker production builds for NestJS/Next.js monorepo, DO App Platform vs Droplets, container orchestration approach, environment configuration
**Plans**: TBD

Plans:
- [ ] 02-01: Create production Dockerfiles and docker-compose
- [ ] 02-02: Deploy apps to DigitalOcean and configure environment
- [ ] 02-03: Verify end-to-end connectivity (app ↔ DB ↔ Redis ↔ Temporal)

### Phase 3: Calendar Platform Filtering
**Goal**: Users can filter calendar posts by social platform (e.g., show only X posts, only LinkedIn posts)
**Depends on**: Phase 2
**Research**: Unlikely (internal codebase modification, existing patterns)
**Plans**: TBD

Plans:
- [ ] 03-01: Add platform filter parameter to posts API endpoint
- [ ] 03-02: Add platform filter UI controls to calendar view

### Phase 4: Media Upload Limit
**Goal**: Increased media file upload size limit in the backend
**Depends on**: Phase 2
**Research**: Unlikely (internal backend change)
**Plans**: TBD

Plans:
- [ ] 04-01: Find and increase media upload size limits

### Phase 5: Production Readiness
**Goal**: Production environment hardened for daily team use — monitoring, backups, access configured
**Depends on**: Phases 3, 4
**Research**: Unlikely (standard operational setup)
**Plans**: TBD

Plans:
- [ ] 05-01: Configure backups, monitoring, and team access

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5
(Phases 3 and 4 can run in parallel after Phase 2)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure Provisioning | 0/3 | Not started | - |
| 2. Application Deployment | 0/3 | Not started | - |
| 3. Calendar Platform Filtering | 0/2 | Not started | - |
| 4. Media Upload Limit | 0/1 | Not started | - |
| 5. Production Readiness | 0/1 | Not started | - |
