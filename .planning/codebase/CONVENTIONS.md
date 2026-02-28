# Coding Conventions

**Analysis Date:** 2026-02-28

## Naming Patterns

**Files:**
- `kebab.case.ts` for all modules (dot-separated: `posts.service.ts`, `stripe.service.ts`)
- `*.controller.ts`, `*.service.ts`, `*.repository.ts` for NestJS layers
- `*.provider.ts` for social integrations and auth providers
- `*.dto.ts` for data transfer objects (e.g., `create.post.dto.ts`, `get.posts.list.dto.ts`)
- `*.workflow.ts`, `*.activity.ts` for Temporal
- PascalCase or kebab-case for React components (e.g., `color.picker.tsx`, `translated-label.tsx`)

**Functions:**
- camelCase for all functions: `createPost()`, `getStatistics()`, `searchForMissingThreeHoursPosts()`
- Boolean checks: `can*()` or `is*()` prefixes (e.g., `canRegister()`)
- Event handlers: `handle*` or `on*` pattern

**Variables:**
- camelCase for variables: `orgId`, `userId`, `providerId`
- Private class properties: underscore prefix `_authService`, `_postRepository`
- UPPER_SNAKE_CASE for constants

**Types:**
- PascalCase for interfaces and types: `CreateOrgUserDto`, `SocialProvider`
- `*Dto` suffix for DTOs
- `*Props` suffix for React component props (e.g., `TranslatedLabelProps`)
- No `I` prefix on interfaces

## Code Style

**Formatting:**
- Prettier with `.prettierrc` config
- Single quotes (`singleQuote: true`)
- 2-space indentation
- Semicolons present on all statements

**Linting:**
- ESLint 8.57 with `eslint.config.mjs`
- TypeScript ESLint 7.18 (`@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`)
- Must run from repo root
- No dedicated `pnpm lint` script; use eslint directly

## Import Organization

**Order:**
1. External packages (`@nestjs/common`, `react`, `express`)
2. Prisma/database types (`@prisma/client`)
3. Path-aliased imports (`@gitroom/nestjs-libraries/...`, `@gitroom/helpers/...`)
4. Relative imports (rarely used, prefer aliases)

**Path Aliases (from `tsconfig.base.json`):**
- `@gitroom/backend/*` -> `apps/backend/src/*`
- `@gitroom/frontend/*` -> `apps/frontend/src/*`
- `@gitroom/helpers/*` -> `libraries/helpers/src/*`
- `@gitroom/nestjs-libraries/*` -> `libraries/nestjs-libraries/src/*`
- `@gitroom/react/*` -> `libraries/react-shared-libraries/src/*`
- `@gitroom/plugins/*` -> `libraries/plugins/src/*`
- `@gitroom/orchestrator/*` -> `apps/orchestrator/src/*`

## Error Handling

**Patterns:**
- Custom NestJS exception filters registered globally
- `HttpExceptionFilter` at `libraries/nestjs-libraries/src/services/exception.filter.ts`
- `SubscriptionExceptionFilter` at `apps/backend/src/services/auth/permissions/subscription.exception.ts`
- Sentry captures unhandled exceptions via `@sentry/nestjs`

**Inconsistencies:**
- Some controllers use `throw new Error()` instead of proper NestJS exceptions (`BadRequestException`, etc.)
- Mixed patterns: some try/catch blocks, some let exceptions bubble
- Should use NestJS exception classes consistently

## Logging

**Framework:**
- Built-in NestJS Logger (no dedicated logging library)
- Sentry for error-level events

**Patterns:**
- `console.log()` present in several controllers (technical debt - should be removed)
- No structured logging library (Winston, Pino) configured
- Sentry metrics: `Sentry.metrics.count()` for custom counters

## Comments

**When to Comment:**
- Scientific and minimalistic style (per project guidelines)
- Explain why, not what
- Minimal inline comments throughout codebase

**JSDoc/TSDoc:**
- Not heavily used
- Type annotations serve as primary documentation
- Some JSDoc on shared library functions

**TODO Comments:**
- Various TODO/FIXME comments exist across codebase
- No consistent format or tracking system

## Function Design

**Size:**
- Several large files exceed 900+ lines (technical debt)
- Target: keep functions small and focused; split into functions if comments needed

**Parameters:**
- NestJS controllers use decorator-based parameter extraction: `@Body()`, `@Param()`, `@Query()`
- Custom decorators: `@GetOrgFromRequest()`, `@GetUserFromRequest()` for context extraction
- DTOs with class-validator decorators for validation

**Return Values:**
- Explicit returns
- Async/await throughout (no callback patterns)

## Module Design

**NestJS Modules:**
- `@Global()` decorator on shared modules (e.g., `DatabaseModule`)
- `APP_GUARD` providers for global middleware
- Feature modules group related controllers and providers

**Exports:**
- Named exports preferred throughout
- Barrel files (`index.ts`) used in libraries for public API
- Default exports for React page components

**React Components:**
- Functional components with hooks
- `FC<Props>` type annotation or inline props destructuring
- SWR hooks must each be in separate custom hooks (per project rules)
- Never use `eslint-disable-next-line` for hooks rules

## NestJS-Specific Patterns

**Dependency Injection:**
```typescript
constructor(
  private _authService: AuthService,
  private _postRepository: PostsRepository,
) {}
```
- Always private with underscore prefix
- Constructor injection only

**Controller Pattern:**
```typescript
@ApiTags('Posts')
@Controller('/posts')
export class PostsController {
  @Get('/')
  async getPosts(@GetOrgFromRequest() org: Organization) { ... }
}
```
- `@ApiTags()` for Swagger grouping
- Custom parameter decorators for auth context

**Validation:**
- class-validator decorators on DTOs: `@IsString()`, `@IsEmail()`, `@ValidateIf()`, `@IsIn()`
- `ValidationPipe` applied globally in `main.ts`

---

*Convention analysis: 2026-02-28*
*Update when patterns change*
