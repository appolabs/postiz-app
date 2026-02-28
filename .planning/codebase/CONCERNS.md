# Codebase Concerns

**Analysis Date:** 2026-02-28

## Tech Debt

**Inconsistent Error Handling in Controllers:**
- Issue: Controllers use raw `throw new Error()` instead of NestJS exception classes
- Files: `apps/backend/src/api/routes/integrations.controller.ts`, `apps/backend/src/api/routes/no.auth.integrations.controller.ts`, `apps/backend/src/services/auth/auth.service.ts`
- Impact: Clients receive 500 status codes for validation errors instead of 400/422
- Fix approach: Replace with `BadRequestException`, `UnauthorizedException`, etc.

**Debug Console Logs in Production Code:**
- Issue: `console.log()` statements left in controllers
- Files:
  - `apps/backend/src/public-api/routes/v1/public.integrations.controller.ts` - `console.log(JSON.stringify(body, null, 2))`
  - `apps/backend/src/api/routes/media.controller.ts` - `console.log('hello')`
  - `apps/backend/src/api/routes/integrations.controller.ts` - `console.log(err)`
  - `apps/backend/src/api/routes/posts.controller.ts` - `console.log(JSON.stringify(rawBody, null, 2))`
  - `apps/backend/src/api/routes/public.controller.ts` - `console.log('cryptoPost', body, path)`
  - `apps/backend/src/api/routes/no.auth.integrations.controller.ts` - Multiple instances
- Impact: Sensitive data (request bodies, errors) logged to stdout, no structured logging
- Fix approach: Replace with NestJS Logger or structured logging library (Pino/Winston)

**Social Provider Code Duplication:**
- Issue: 28+ social providers share OAuth flow, token refresh, and posting logic with significant duplication
- Files: `libraries/nestjs-libraries/src/integrations/social/*.provider.ts`
- Examples: `linkedin.provider.ts` (816 lines) vs `linkedin.page.provider.ts` (919 lines), `instagram.provider.ts` (872 lines) vs `instagram.standalone.provider.ts`
- Impact: Changes require updates across multiple similar files
- Fix approach: Extract common OAuth/posting logic into base class methods

**Node.js Version Conflict:**
- Issue: `engines` field requires `>=22.12.0 <23.0.0` but Volta pins to `20.17.0`
- File: `package.json`
- Impact: Developers using Volta get wrong Node version
- Fix approach: Align Volta pin with engines requirement

## Known Bugs

No confirmed bugs documented. Several areas of concern noted below.

## Security Considerations

**Unsafe JSON Parsing Without Error Handling:**
- Risk: Malformed data causes unhandled runtime errors
- Files:
  - `apps/backend/src/api/routes/integrations.controller.ts` - `JSON.parse(p.postingTimes)` without try/catch
  - `apps/backend/src/api/routes/no.auth.integrations.controller.ts` - `JSON.parse(Buffer.from(body.code, 'base64').toString())` without error handling
- Current mitigation: None
- Recommendations: Wrap all `JSON.parse()` in try/catch or use safe parsing utility

**dangerouslySetInnerHTML Usage (XSS Risk):**
- Risk: User-generated or external content rendered without explicit sanitization
- Files (10+ instances):
  - `apps/frontend/src/app/(app)/(preview)/p/[id]/page.tsx`
  - `apps/frontend/src/components/launches/general.preview.component.tsx`
  - `apps/frontend/src/components/new-launch/providers/pinterest/pinterest.preview.tsx`
  - `apps/frontend/src/components/new-launch/providers/facebook/facebook.preview.tsx`
  - `apps/frontend/src/components/agents/agent.chat.tsx`
- Current mitigation: Appears to use `stripHtmlValidation` in some places
- Recommendations: Audit and document sanitization flow, use DOMPurify consistently

**Environment Variable Non-null Assertions:**
- Risk: Missing env vars cause silent runtime failures
- Files: `libraries/nestjs-libraries/src/integrations/social/mastodon.provider.ts` - `process.env.MASTODON_CLIENT_ID!`
- Current mitigation: None
- Recommendations: Centralized env validation at startup using Zod or class-validator

**Type Safety Issues:**
- Risk: `as any` casts bypass TypeScript safety
- Files: `apps/backend/src/services/auth/permissions/subscription.exception.ts` - `exception.getResponse() as any`
- Count: 73+ instances of `as any` across codebase
- Recommendations: Reduce `as any` usage, use proper type narrowing

## Performance Bottlenecks

**Potential N+1 Query Pattern:**
- Problem: Custom fields fetched per-integration in a loop
- File: `apps/backend/src/api/routes/integrations.controller.ts`
- Pattern: `Promise.all(integrations.map(async (p) => { ...customFields: await findIntegration.customFields()... }))`
- Improvement path: Batch custom field requests or implement caching

## Fragile Areas

**Large Monolithic Files:**
- Why fragile: Single files with 900+ lines mixing multiple concerns
- Files:
  - `libraries/nestjs-libraries/src/integrations/social/hashnode.tags.ts` - 5,194 lines (massive tag list)
  - `libraries/nestjs-libraries/src/database/prisma/posts/posts.service.ts` - 939 lines
  - `libraries/nestjs-libraries/src/services/stripe.service.ts` - 938 lines
  - `apps/frontend/src/components/launches/calendar.tsx` - 1,232 lines
  - `apps/frontend/src/components/new-launch/editor.tsx` - 1,046 lines
  - `libraries/nestjs-libraries/src/integrations/social/linkedin.page.provider.ts` - 919 lines
  - `libraries/nestjs-libraries/src/integrations/social/instagram.provider.ts` - 872 lines
  - `libraries/nestjs-libraries/src/integrations/social/linkedin.provider.ts` - 816 lines
- Common failures: Merge conflicts, hard to understand side effects
- Safe modification: Break into smaller, focused modules
- Test coverage: None

## Test Coverage Gaps

**Entire Codebase Untested:**
- What's not tested: All application code (0 test files found)
- Risk: Any change can break production without warning
- Priority: Critical
- Highest-risk untested areas:
  - Payment processing (`stripe.service.ts`) - handles money
  - Authentication (`auth.service.ts`, `auth.middleware.ts`) - security boundary
  - Post scheduling (`posts.service.ts`, `post.workflow.v1.0.1.ts`) - core feature
  - Social posting (`*.provider.ts`) - external API reliability

## Positive Findings

- Proper Repository Pattern: NestJS services follow Controller -> Service -> Repository consistently
- Prisma Usage: Proper use of `.select()` and `.include()` (94 instances)
- SWR Integration: Consistent `useFetch` hook usage across frontend (308 instances)
- Rate Limiting: Redis-backed distributed throttling configured
- Error Tracking: Sentry integration on both backend and frontend
- Validation: class-validator on DTOs with global ValidationPipe

---

*Concerns audit: 2026-02-28*
*Update as issues are fixed or new ones discovered*
