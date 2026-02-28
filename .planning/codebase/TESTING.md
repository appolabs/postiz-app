# Testing Patterns

**Analysis Date:** 2026-02-28

## Test Framework

**Runner:**
- Jest 29.7.0 - Configured via `jest.config.ts` in project root
- Uses `getJestProjects()` from `@nx/jest` for monorepo support
- Vitest 3.1.4 also available as dependency

**Assertion Library:**
- Jest built-in `expect`
- `@testing-library/react@15.0.6` available for React component testing

**Run Commands:**
```bash
pnpm run test                     # Run all tests with coverage
pnpm run test -- <path>           # Single file/directory
```

## Test File Organization

**Location:**
- No test files currently exist in the codebase
- Jest config supports `*.spec.ts` and `*.test.ts` patterns
- Expected co-location: tests alongside source files

**Expected Naming:**
- `<module>.spec.ts` for NestJS (convention)
- `<component>.test.tsx` for React

**Expected Structure:**
```
libraries/nestjs-libraries/src/database/prisma/posts/
  posts.service.ts
  posts.service.spec.ts          # (missing)
  posts.repository.ts
  posts.repository.spec.ts      # (missing)
```

## Test Structure

**Suite Organization (expected NestJS pattern):**
```typescript
import { Test, TestingModule } from '@nestjs/testing';

describe('PostsService', () => {
  let service: PostsService;
  let repository: PostsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostsService, { provide: PostsRepository, useValue: mockRepo }],
    }).compile();
    service = module.get<PostsService>(PostsService);
  });

  describe('createPost', () => {
    it('should create a post', async () => {
      // arrange, act, assert
    });
  });
});
```

## Mocking

**Framework:**
- Jest built-in mocking (`jest.fn()`, `jest.mock()`)

**Expected Patterns:**
- Mock repositories when testing services
- Mock services when testing controllers
- Mock external APIs (Stripe, social providers) at integration boundary

## Coverage

**Requirements:**
- No enforced coverage target
- `pnpm run test` includes `--coverage` flag
- No CI gate on coverage percentage

## Test Types

**Unit Tests:**
- Not currently implemented
- Priority targets: services, repositories, utility functions

**Integration Tests:**
- Not currently implemented
- Priority targets: API endpoints, Temporal workflows

**E2E Tests:**
- Not currently implemented
- Priority targets: auth flows, post publishing pipeline, payment flows

## Current State

**Critical gap:** Zero test files exist across the entire codebase. Key untested areas:

| Component | File | Risk |
|-----------|------|------|
| Post scheduling | `libraries/nestjs-libraries/src/database/prisma/posts/posts.service.ts` (939 lines) | High - core feature |
| Stripe billing | `libraries/nestjs-libraries/src/services/stripe.service.ts` (938 lines) | Critical - handles money |
| Auth service | `apps/backend/src/services/auth/auth.service.ts` | Critical - security boundary |
| Post workflow | `apps/orchestrator/src/workflows/post.workflow.v1.0.1.ts` | High - publishing reliability |
| Integration providers | `libraries/nestjs-libraries/src/integrations/social/*.provider.ts` (28+ files) | Medium - external API calls |
| Post editor | `apps/frontend/src/components/new-launch/editor.tsx` (1046 lines) | Medium - complex UI |

**Recommended testing priority:**
1. Payment processing (Stripe service)
2. Authentication and authorization
3. Post scheduling and publishing pipeline
4. Social media provider abstraction layer
5. Frontend critical paths (post creation, calendar)

---

*Testing analysis: 2026-02-28*
*Update when test patterns change*
