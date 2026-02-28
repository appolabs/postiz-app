# Technology Stack

**Analysis Date:** 2026-02-28

## Languages

**Primary:**
- TypeScript 5.5.4 - All application code across backend, frontend, orchestrator, and libraries (`package.json`)

**Secondary:**
- JavaScript - Build scripts, config files (`jest.config.ts`, `eslint.config.mjs`)
- SCSS - Styling (`apps/frontend/src/app/colors.scss`, `apps/frontend/src/app/global.scss`)

## Runtime

**Environment:**
- Node.js >=22.12.0 <23.0.0 (`package.json` engines field)
- Volta pinned to 20.17.0 (`package.json` volta section) - conflicts with engines

**Package Manager:**
- pnpm 10.6.1 (`package.json` packageManager field)
- Lockfile: `pnpm-lock.yaml` present
- Monorepo via pnpm workspaces

## Frameworks

**Core:**
- NestJS 10.0.2 - Backend API and orchestrator (`apps/backend/`, `apps/orchestrator/`)
- Next.js 14.2.35 - Frontend with App Router (`apps/frontend/`)
- React 18.3.1 - UI framework (`package.json`)

**Background Jobs:**
- Temporal 1.14.0 - Workflow orchestration (`@temporalio/client`, `@temporalio/worker`, `@temporalio/workflow`, `@temporalio/activity`)
- nestjs-temporal-core 3.2.0 - NestJS Temporal integration

**Testing:**
- Jest 29.7.0 - Test runner (`jest.config.ts`)
- Vitest 3.1.4 - Alternative test runner (`package.json`)
- @testing-library/react 15.0.6 - React testing utilities

**Build/Dev:**
- SWC 1.5.7 - TypeScript compilation (`@swc/cli`, `@swc/core`)
- tsup 8.5.0 - Bundler for CLI and SDK (`apps/cli/tsup.config.ts`, `apps/sdk/tsup.config.ts`)
- Vite 6.3.5 - Extension bundler (`apps/extension/vite.config.ts`)

## Key Dependencies

**Critical:**
- Prisma 6.5.0 - ORM and database access (`libraries/nestjs-libraries/src/database/prisma/`)
- Stripe 15.5.0 - Payment processing (`libraries/nestjs-libraries/src/services/stripe.service.ts`)
- OpenAI 6.2.0 - AI content generation (`libraries/nestjs-libraries/src/openai/openai.service.ts`)
- SWR 2.2.5 - Frontend data fetching (`libraries/helpers/src/utils/custom.fetch.tsx`)
- React Hook Form 7.58.1 - Form state management

**Infrastructure:**
- Redis 4.6.12 / ioredis 5.3.2 - Caching, rate limiting, sessions (`libraries/nestjs-libraries/src/redis/redis.service.ts`)
- @aws-sdk/client-s3 3.787.0 - File storage with presigned URLs
- @nestjs/throttler 6.3.0 + @nest-lab/throttler-storage-redis 1.2.0 - Distributed rate limiting
- @sentry/nestjs 10.26.0 + @sentry/nextjs 10.26.0 - Error tracking
- i18next 25.2.1 - Internationalization

**AI/ML:**
- @langchain/core 0.3.44 + @langchain/openai 0.5.5 - LLM chains
- @mastra/core 0.20.2 - Agent orchestration
- @copilotkit/react-core 1.10.6 - In-app AI copilot
- @ai-sdk/openai 2.0.52 - AI SDK integration

**Styling:**
- Tailwind CSS 3.4.17 - Utility-first CSS (`apps/frontend/tailwind.config.js`)
- Sass 1.89.2 - SCSS processing
- Mantine UI 5.10.5 - Component library

## Configuration

**Environment:**
- `.env` file at repo root, loaded via `dotenv-cli` (`dotenv -e ../../.env` in app scripts)
- `.env.example` present for documentation

**Build:**
- `tsconfig.base.json` - Shared TypeScript config with path aliases
- `apps/frontend/next.config.js` - Next.js config with Sentry integration
- `apps/frontend/tailwind.config.js` - Tailwind with 55+ custom color variables
- `apps/backend/nest-cli.json` - NestJS CLI config
- `apps/orchestrator/nest-cli.json` - Orchestrator NestJS config
- `eslint.config.mjs` - ESLint flat config

## Platform Requirements

**Development:**
- Any platform with Node.js 22+
- Docker for local infrastructure: PostgreSQL, Redis, Temporal, Elasticsearch
- `docker-compose.dev.yaml` - Dev infrastructure (PostgreSQL:5432, Redis:6379, Temporal:7233, pgAdmin:8081, Temporal UI:8080)

**Production:**
- Docker via `docker-compose.yaml`
- PM2 process manager available
- PostgreSQL, Redis, Temporal server required

---

*Stack analysis: 2026-02-28*
*Update after major dependency changes*
