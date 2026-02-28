# Codebase Structure

**Analysis Date:** 2026-02-28

## Directory Layout

```
postiz-app/
├── apps/                          # Application packages
│   ├── backend/                   # NestJS REST API (port 3000)
│   ├── frontend/                  # Next.js 14 frontend (port 4200)
│   ├── orchestrator/              # Temporal workflow worker
│   ├── extension/                 # Browser extension (Vite + CRXJS)
│   ├── cli/                       # CLI tool
│   ├── sdk/                       # Node SDK
│   └── commands/                  # NestJS CLI commands
├── libraries/                     # Shared code across apps
│   ├── nestjs-libraries/          # Core server logic (backend + orchestrator)
│   ├── helpers/                   # Universal utilities (frontend + backend)
│   ├── react-shared-libraries/    # Shared React components and hooks
│   └── plugins/                   # Plugin system
├── docker-compose.yaml            # Production Docker setup
├── docker-compose.dev.yaml        # Dev infrastructure
├── package.json                   # Root package.json (all deps)
├── tsconfig.base.json             # Shared TypeScript config + path aliases
├── .env.example                   # Environment template
└── eslint.config.mjs              # ESLint configuration
```

## Directory Purposes

**apps/backend/**
- Purpose: NestJS REST API server
- Contains: Controllers, auth services, API modules
- Key files:
  - `src/main.ts` - Server bootstrap
  - `src/app.module.ts` - Root module
  - `src/api/api.module.ts` - API routes module
  - `src/api/routes/*.controller.ts` - 22 controller files
  - `src/services/auth/` - Authentication and authorization
  - `src/public-api/` - Public API endpoints

**apps/frontend/**
- Purpose: Next.js 14 frontend application
- Contains: Pages, components, styles
- Key files:
  - `src/app/(app)/(site)/` - Main authenticated pages (launches, analytics, billing, settings, media, agents)
  - `src/app/(app)/auth/` - Auth pages (login, register, oauth callback)
  - `src/components/` - React components by feature
  - `src/components/ui/` - Base UI components
  - `src/app/colors.scss` - Theme color variables
  - `src/app/global.scss` - Global styles
  - `src/middleware.ts` - Next.js routing middleware
  - `tailwind.config.js` - Tailwind configuration
  - `next.config.js` - Next.js + Sentry config

**apps/orchestrator/**
- Purpose: Temporal workflow worker for async jobs
- Contains: Workflow definitions and activity implementations
- Key files:
  - `src/main.ts` - Worker bootstrap
  - `src/app.module.ts` - Module with Temporal registration
  - `src/workflows/post.workflow.v1.0.1.ts` - Post publishing workflow
  - `src/workflows/autopost.workflow.ts` - Scheduled autopost
  - `src/workflows/send.email.workflow.ts` - Email dispatch
  - `src/workflows/refresh.token.workflow.ts` - Token refresh
  - `src/activities/post.activity.ts` - Post publishing activity
  - `src/activities/email.activity.ts` - Email activity

**libraries/nestjs-libraries/**
- Purpose: Core server logic shared between backend and orchestrator
- Subdirectories:
  - `src/database/prisma/` - Prisma schema, service, and domain modules
  - `src/database/prisma/<domain>/` - Each domain has `*.repository.ts` + `*.service.ts`
  - `src/integrations/social/` - One `*.provider.ts` per social platform
  - `src/integrations/integration.manager.ts` - Provider registry
  - `src/dtos/` - Request validation DTOs
  - `src/services/` - Cross-cutting services (stripe, email, codes)
  - `src/temporal/` - Temporal module config
  - `src/openai/` - AI services
  - `src/redis/` - Redis caching
  - `src/sentry/` - Error tracking
  - `src/throttler/` - Rate limiting
  - `src/upload/` - File storage (R2, S3, local)
  - `src/short-linking/` - URL shortening
  - `src/agent/` - AI agent framework
  - `src/chat/` - CopilotKit/MCP integration
  - `src/3rdparties/` - Third-party APIs (HeyGen)

**libraries/helpers/**
- Purpose: Utilities shared across frontend and backend
- Key files:
  - `src/utils/custom.fetch.tsx` - `useFetch` SWR hook
  - `src/utils/posts.list.minify.ts` - Data transformation
  - `src/auth/` - Auth utilities and decorators
  - `src/decorators/` - Custom NestJS decorators
  - `src/swagger/` - Swagger/OpenAPI setup
  - `src/configuration/` - Config loading

**libraries/react-shared-libraries/**
- Purpose: Shared React components and hooks
- Key files:
  - `src/helpers/variable.context.tsx` - Theme/variable context
  - `src/helpers/posthog.tsx` - Analytics
  - `src/form/` - Form components (input, select, checkbox, color picker)
  - `src/translation/` - i18n configuration
  - `src/toaster/` - Toast notifications

## Key File Locations

**Entry Points:**
- `apps/backend/src/main.ts` - Backend server startup
- `apps/orchestrator/src/main.ts` - Orchestrator worker startup
- `apps/frontend/src/app/(app)/layout.tsx` - Frontend app layout

**Configuration:**
- `tsconfig.base.json` - Shared TypeScript config with path aliases
- `apps/frontend/tailwind.config.js` - Tailwind with custom colors
- `apps/frontend/src/app/colors.scss` - CSS color variables
- `apps/backend/nest-cli.json` - Backend NestJS config
- `.env.example` - Environment variable template
- `eslint.config.mjs` - ESLint config
- `.prettierrc` - Prettier config

**Core Logic:**
- `libraries/nestjs-libraries/src/database/prisma/schema.prisma` - Database schema
- `libraries/nestjs-libraries/src/database/prisma/database.module.ts` - Global DI module
- `libraries/nestjs-libraries/src/integrations/integration.manager.ts` - Social provider registry
- `libraries/nestjs-libraries/src/services/stripe.service.ts` - Payment processing
- `libraries/nestjs-libraries/src/openai/openai.service.ts` - AI content generation

**Testing:**
- `jest.config.ts` - Root Jest config (uses `getJestProjects()`)
- No test files currently present in codebase

**Documentation:**
- `CLAUDE.md` - Development instructions for Claude Code
- `CONTRIBUTING.md` - Contribution guidelines
- `.env.example` - Environment setup reference

## Naming Conventions

**Files:**
- `kebab.case.ts` for all backend/library modules (e.g., `posts.service.ts`, `stripe.service.ts`)
- `kebab.case.tsx` for React components (e.g., `color.picker.tsx`, `translated-label.tsx`)
- `*.controller.ts` for HTTP controllers
- `*.service.ts` for business logic services
- `*.repository.ts` for data access repositories
- `*.provider.ts` for integration providers
- `*.workflow.ts` for Temporal workflows
- `*.activity.ts` for Temporal activities
- `*.dto.ts` for data transfer objects (e.g., `create.post.dto.ts`)
- `*.module.ts` for NestJS modules
- `*.guard.ts` for NestJS guards
- `*.filter.ts` for NestJS exception filters

**Directories:**
- Lowercase/kebab-case for all directories
- Domain-based grouping in `database/prisma/` (e.g., `posts/`, `users/`, `integrations/`)

**Special Patterns:**
- Versioned workflows: `post.workflow.v1.0.1.ts`
- Abstract base: `social.abstract.ts`
- `page.tsx` for Next.js pages

## Where to Add New Code

**New Backend Feature:**
- Controller: `apps/backend/src/api/routes/<feature>.controller.ts`
- Service: `libraries/nestjs-libraries/src/database/prisma/<feature>/<feature>.service.ts`
- Repository: `libraries/nestjs-libraries/src/database/prisma/<feature>/<feature>.repository.ts`
- DTO: `libraries/nestjs-libraries/src/dtos/<feature>/`
- Register in: `apps/backend/src/api/api.module.ts` and `libraries/nestjs-libraries/src/database/prisma/database.module.ts`

**New Social Integration:**
- Provider: `libraries/nestjs-libraries/src/integrations/social/<platform>.provider.ts`
- Implement `SocialProvider` interface, extend `SocialAbstract`
- Register in: `libraries/nestjs-libraries/src/integrations/integration.manager.ts`

**New Frontend Page:**
- Page: `apps/frontend/src/app/(app)/(site)/<feature>/page.tsx`
- Components: `apps/frontend/src/components/<feature>/`

**New Background Job:**
- Workflow: `apps/orchestrator/src/workflows/<name>.workflow.ts`
- Activity: `apps/orchestrator/src/activities/<name>.activity.ts`
- Register in: `apps/orchestrator/src/app.module.ts`

**Shared Utilities:**
- Backend/Orchestrator: `libraries/nestjs-libraries/src/`
- Frontend/Backend: `libraries/helpers/src/`
- React only: `libraries/react-shared-libraries/src/`

## Special Directories

**node_modules/**
- Purpose: Dependencies (hoisted to root by pnpm)
- Committed: No (in .gitignore)

**dist/ (per app)**
- Purpose: Compiled output
- Source: NestJS build, Next.js build
- Committed: No

**.planning/**
- Purpose: Project planning documents
- Source: Manual/tool-generated
- Committed: Yes

---

*Structure analysis: 2026-02-28*
*Update when directory structure changes*
