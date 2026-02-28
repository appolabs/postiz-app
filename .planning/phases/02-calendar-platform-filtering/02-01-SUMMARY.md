---
phase: 02-calendar-platform-filtering
plan: 01
subsystem: api
tags: [nestjs, prisma, dto, class-validator, posts]

# Dependency graph
requires: []
provides:
  - Optional `platform` query parameter on /posts and /posts/list API endpoints
  - Posts filtered by integration.providerIdentifier when platform is set
affects: [02-calendar-platform-filtering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Merged Prisma relation filters into single object to avoid spread overwrite

key-files:
  created: []
  modified:
    - libraries/nestjs-libraries/src/dtos/posts/get.posts.dto.ts
    - libraries/nestjs-libraries/src/dtos/posts/get.posts.list.dto.ts
    - libraries/nestjs-libraries/src/database/prisma/posts/posts.repository.ts

key-decisions:
  - "Merged integration filter into single object in getPosts() to fix existing bug where customer spread overwrote deletedAt condition"

patterns-established:
  - "Prisma relation filters: combine all conditions in a single object rather than using spread to override"

# Metrics
duration: 2min
completed: 2026-02-28
---

# Phase 02 Plan 01: Backend Platform Filter Summary

**Posts API accepts optional `platform` query parameter to filter by integration providerIdentifier, with fix for existing customer filter overwrite bug**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-28T03:54:22Z
- **Completed:** 2026-02-28T03:55:48Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added optional `platform` field to GetPostsDto and GetPostsListDto with class-validator decorators
- getPosts() and getPostsList() repository methods filter by integration.providerIdentifier when platform is provided
- Fixed existing bug in getPosts() where the customer filter spread was overwriting the `integration: { deletedAt: null }` condition

## Task Commits

Each task was committed atomically:

1. **Task 1: Add platform field to post DTOs** - `0157ef9e` (feat)
2. **Task 2: Add providerIdentifier filter to posts repository** - `32168561` (feat)

## Files Created/Modified
- `libraries/nestjs-libraries/src/dtos/posts/get.posts.dto.ts` - Added optional platform string field
- `libraries/nestjs-libraries/src/dtos/posts/get.posts.list.dto.ts` - Added optional platform string field
- `libraries/nestjs-libraries/src/database/prisma/posts/posts.repository.ts` - Platform filter in getPosts() and getPostsList()

## Decisions Made
- Merged all integration conditions into a single Prisma relation filter object instead of using spread override pattern. This fixes the pre-existing bug where `customer` spread overwrote `deletedAt: null` and establishes the correct pattern for combining relation filters.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Existing Bug] Fixed customer filter overwriting deletedAt in getPosts()**
- **Found during:** Task 2 (repository filter implementation)
- **Issue:** Existing code used `...(query.customer ? { integration: { customerId } } : {})` which overwrote the earlier `integration: { deletedAt: null }` — effectively removing the soft-delete filter when a customer was selected
- **Fix:** Merged all integration conditions into one object: `integration: { deletedAt: null, ...(customer), ...(platform) }`
- **Files modified:** posts.repository.ts
- **Verification:** Code review confirms single integration object contains all conditions
- **Committed in:** 32168561 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 existing bug)
**Impact on plan:** Bug fix was planned in the task description. No scope creep.

## Issues Encountered
- TypeScript compiler not available (dependencies not installed). Verified correctness through code review instead.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend API now supports `?platform=x` query parameter on calendar and list endpoints
- Frontend can now implement platform filter selector using this parameter
- Ready for plan 02 (frontend filter UI)

---
*Phase: 02-calendar-platform-filtering*
*Completed: 2026-02-28*
