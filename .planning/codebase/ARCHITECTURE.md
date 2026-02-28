# Architecture

**Analysis Date:** 2026-02-28

## Pattern Overview

**Overall:** Monorepo with Layered Architecture + Background Workflow Engine

**Key Characteristics:**
- PNPM monorepo with 3 main applications sharing libraries
- Strict 3-tier layered backend (Controller -> Service -> Repository)
- Temporal workflow engine for async/background processing
- Next.js App Router frontend with SWR data fetching
- 28+ social media providers behind a unified interface

## Layers

**Controller Layer (HTTP Boundary):**
- Purpose: Receive HTTP requests, validate input, delegate to services
- Contains: 22 controller files with route handlers
- Location: `apps/backend/src/api/routes/*.controller.ts`
- Depends on: Service layer only
- Used by: HTTP clients (frontend, public API)

**Service Layer (Business Logic):**
- Purpose: Orchestrate business operations, enforce rules
- Contains: 32+ service files with domain logic
- Location: `libraries/nestjs-libraries/src/database/prisma/<domain>/*.service.ts`
- Depends on: Repository layer, external service adapters, Temporal
- Used by: Controllers, Temporal activities

**Repository Layer (Data Access):**
- Purpose: Abstract database queries via Prisma ORM
- Contains: Repository files with typed Prisma queries
- Location: `libraries/nestjs-libraries/src/database/prisma/<domain>/*.repository.ts`
- Depends on: Prisma client, database
- Used by: Service layer only

**Integration/Provider Layer (External Services):**
- Purpose: Abstract social media platform APIs behind unified interface
- Contains: 28+ provider files, each implementing `SocialProvider`
- Location: `libraries/nestjs-libraries/src/integrations/social/*.provider.ts`
- Depends on: External APIs, OAuth tokens
- Used by: Service layer via `IntegrationManager`

**Workflow/Activity Layer (Async Processing):**
- Purpose: Execute long-running and scheduled tasks reliably
- Contains: Workflow definitions and activity implementations
- Location: `apps/orchestrator/src/workflows/`, `apps/orchestrator/src/activities/`
- Depends on: Service layer (via NestJS DI), Temporal runtime
- Used by: Backend triggers workflows via `TemporalService`

## Data Flow

**HTTP Request (Synchronous):**

1. Frontend sends HTTP request to backend API
2. `AuthMiddleware` validates JWT token (`apps/backend/src/services/auth/auth.middleware.ts`)
3. `PoliciesGuard` checks CASL permissions (`apps/backend/src/services/auth/permissions/permissions.guard.ts`)
4. Controller receives request, validates DTO via `ValidationPipe`
5. Controller calls service method with validated data
6. Service executes business logic, calls repository for data access
7. Repository queries PostgreSQL via Prisma
8. Response flows back: Repository -> Service -> Controller -> HTTP response

**Post Publishing (Asynchronous):**

1. User creates/schedules post via frontend
2. `PostsController` receives request, delegates to `PostsService`
3. `PostsService` stores post in database, triggers Temporal workflow
4. `TemporalService` starts `postWorkflow` with schedule
5. Orchestrator worker picks up workflow (`apps/orchestrator/src/workflows/post.workflow.v1.0.1.ts`)
6. Workflow invokes `PostActivity` at scheduled time
7. Activity calls `IntegrationManager` to get correct provider
8. Provider publishes to social platform via API
9. Results stored back in database

**State Management:**
- Backend: Stateless request handling, state in PostgreSQL + Redis
- Frontend: SWR for server state, Zustand for client state (`zustand@5.0.5`)
- Workflows: Temporal manages workflow state durably

## Key Abstractions

**PrismaRepository<T>:**
- Purpose: Typed base class for all database access
- Location: `libraries/nestjs-libraries/src/database/prisma/prisma.service.ts`
- Pattern: Generic repository providing typed access to Prisma models
- Examples: `PrismaRepository<'post'>`, `PrismaRepository<'comments'>`

**SocialAbstract / SocialProvider:**
- Purpose: Unified interface for all social media platform integrations
- Location: `libraries/nestjs-libraries/src/integrations/social.abstract.ts`
- Pattern: Strategy pattern - each provider implements authenticate, post, analytics
- Examples: `XProvider`, `LinkedinProvider`, `TiktokProvider`

**IntegrationManager:**
- Purpose: Service locator routing requests to correct social provider
- Location: `libraries/nestjs-libraries/src/integrations/integration.manager.ts`
- Pattern: Registry/factory - maintains `socialIntegrationList`
- Used by: Controllers and activities to get provider by identifier

**DatabaseModule:**
- Purpose: Global NestJS module exporting all repositories, services, managers
- Location: `libraries/nestjs-libraries/src/database/prisma/database.module.ts`
- Pattern: NestJS global module for centralized DI
- Imported by: `apps/backend/src/app.module.ts`, `apps/orchestrator/src/app.module.ts`

**TemporalService:**
- Purpose: Client for starting/signaling Temporal workflows
- Location: `libraries/nestjs-libraries/src/temporal/temporal.module.ts`
- Pattern: Adapter wrapping Temporal client SDK

## Entry Points

**Backend API:**
- Location: `apps/backend/src/main.ts`
- Triggers: HTTP requests on port 3000
- Responsibilities: Sentry init, NestFactory.create, CORS setup, global pipes/filters

**Orchestrator Worker:**
- Location: `apps/orchestrator/src/main.ts`
- Triggers: Temporal workflow task queue
- Responsibilities: NestFactory.createApplicationContext, register workflows and activities

**Frontend:**
- Location: `apps/frontend/src/app/(app)/layout.tsx`
- Triggers: Browser navigation
- Responsibilities: Next.js App Router, dynamic rendering, auth middleware

## Error Handling

**Strategy:** Custom NestJS exception filters + Sentry integration

**Patterns:**
- Global exception filter: `libraries/nestjs-libraries/src/services/exception.filter.ts`
- `HttpExceptionFilter` catches `HttpForbiddenException`, removes auth, returns 401
- `SubscriptionExceptionFilter`: `apps/backend/src/services/auth/permissions/subscription.exception.ts`
- Sentry captures unhandled exceptions automatically via `@sentry/nestjs`
- Controllers have inconsistent error handling (some try/catch, some let exceptions bubble)

## Cross-Cutting Concerns

**Logging:**
- Built-in NestJS Logger (no structured logging library)
- Debug `console.log` statements in production code (technical debt)
- Sentry for error-level events

**Validation:**
- class-validator decorators on DTOs (`@IsString()`, `@IsEmail()`, `@ValidateIf()`)
- NestJS `ValidationPipe` applied globally in `apps/backend/src/main.ts`
- DTOs in `libraries/nestjs-libraries/src/dtos/`

**Authentication:**
- JWT middleware on authenticated controllers via `ApiModule.configure()`
- `AuthMiddleware` validates tokens: `apps/backend/src/services/auth/auth.middleware.ts`
- OAuth providers: Google, GitHub at `apps/backend/src/services/auth/providers/`

**Authorization:**
- CASL-based policy guard: `apps/backend/src/services/auth/permissions/permissions.guard.ts`
- Registered as global `APP_GUARD` in `apps/backend/src/app.module.ts`

**Rate Limiting:**
- `@nestjs/throttler` with Redis storage (`@nest-lab/throttler-storage-redis`)
- `ThrottlerBehindProxyGuard` as global guard
- Configured in `apps/backend/src/app.module.ts`

---

*Architecture analysis: 2026-02-28*
*Update when major patterns change*
