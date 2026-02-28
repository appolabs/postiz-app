# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Postiz is a social media scheduling tool supporting 30+ channels (X, LinkedIn, Instagram, TikTok, YouTube, Facebook, Reddit, Discord, Bluesky, Mastodon, etc.). Users schedule posts via a calendar, which are processed by a background workflow engine and published at the right time. Features include analytics, team collaboration, media library, AI copilot, and webhook integrations.

## Monorepo Structure

PNPM workspaces monorepo with all dependencies in the root `package.json`. Node >=22.12.0 <23.0.0.

### Apps
- **`apps/backend`** — NestJS REST API (port 3000). Controllers live here; business logic lives in libraries.
- **`apps/orchestrator`** — NestJS Temporal worker. Contains workflows (post scheduling, token refresh, email digest, autopost, streak) and activities.
- **`apps/frontend`** — Next.js 14 (React 18) frontend (port 4200). Uses App Router with route groups `(app)/(site)` for authenticated pages and `(app)/auth` for auth flows.
- **`apps/extension`** — Browser extension (Vite + CRXJS).
- **`apps/cli`**, **`apps/sdk`**, **`apps/commands`** — CLI tool, Node SDK, and utility commands.

### Libraries (shared code)
- **`libraries/nestjs-libraries`** — Core server logic shared between backend and orchestrator:
  - `database/prisma/` — Prisma schema, service, and domain modules (each domain has `*.repository.ts` + `*.service.ts`): users, posts, integrations, media, organizations, notifications, subscriptions, etc.
  - `integrations/social/` — One `*.provider.ts` per social platform, all implementing `SocialProvider` interface. Registered in `integration.manager.ts`.
  - `dtos/` — Request validation DTOs using class-validator.
  - `services/` — Cross-cutting services (stripe, email, codes).
  - `temporal/` — Temporal module configuration and workflow registration.
- **`libraries/helpers`** — Shared utilities for both frontend and backend. Contains `useFetch` hook at `helpers/src/utils/custom.fetch.tsx`.
- **`libraries/react-shared-libraries`** — Shared React components and hooks.

### Path Aliases (tsconfig.base.json)
```
@gitroom/backend/*      → apps/backend/src/*
@gitroom/frontend/*     → apps/frontend/src/*
@gitroom/helpers/*      → libraries/helpers/src/*
@gitroom/nestjs-libraries/* → libraries/nestjs-libraries/src/*
@gitroom/react/*        → libraries/react-shared-libraries/src/*
@gitroom/plugins/*      → libraries/plugins/src/*
@gitroom/orchestrator/* → apps/orchestrator/src/*
```

## Commands

```bash
# Install dependencies
pnpm install

# Start dev infrastructure (PostgreSQL, Redis, Temporal, Elasticsearch)
pnpm run dev:docker

# Generate Prisma client (runs automatically on postinstall)
pnpm run prisma-generate

# Push schema to database
pnpm run prisma-db-push

# Run all apps in dev mode (backend + frontend + orchestrator + extension)
pnpm run dev

# Run individual apps
pnpm run dev:backend      # NestJS backend with --watch
pnpm run dev:frontend     # Next.js frontend on port 4200
pnpm run dev:orchestrator # Temporal worker with --watch

# Build
pnpm run build            # All apps sequentially
pnpm run build:backend
pnpm run build:frontend
pnpm run build:orchestrator

# Tests
pnpm run test             # Jest with coverage (root-level)

# Linting (must run from root)
# No dedicated lint script; use eslint directly from root
```

## Backend Architecture

Strict layered architecture — no shortcuts:

```
Controller → Service → Repository
Controller → Manager → Service → Repository (when needed)
```

- **Controllers** in `apps/backend/src/api/routes/` — thin HTTP layer, delegates to services.
- **Services** in `libraries/nestjs-libraries/src/database/prisma/<domain>/` — business logic.
- **Repositories** in same domain folders — Prisma database access.
- **Auth middleware** applied to authenticated controllers via `ApiModule.configure()`.
- **Public API** has its own module at `apps/backend/src/public-api/`.
- **Rate limiting** via `@nestjs/throttler` with Redis storage.

## Frontend Conventions

- **Next.js App Router** with route groups: `(app)/(site)/` for main pages, `(app)/auth/` for auth.
- **Data fetching**: Always use SWR via `useFetch` hook from `@gitroom/helpers/utils/custom.fetch`. Each SWR call must be its own hook to comply with react-hooks/rules-of-hooks. Never use `eslint-disable-next-line` for this.
- **UI components** in `apps/frontend/src/components/ui/`. Never install UI component packages from npm — write native components.
- **Tailwind 3** with CSS variables for theming. Check `apps/frontend/src/app/colors.scss` for theme variables and `tailwind.config.js` for custom colors.
- **Theme colors**: Use `--new-*` CSS variables (e.g., `newBgColor`, `newTextColor`, `btnPrimary`). All `--color-custom*` / `customColor*` are deprecated.
- Rich text editing with TipTap. Media uploads with Uppy.

## Social Integration System

Each social platform is a provider class in `libraries/nestjs-libraries/src/integrations/social/`:
- Implements `SocialProvider` interface (authenticate, refreshToken, generateAuthUrl, post, analytics).
- Extends `SocialAbstract` base class.
- Registered in `integration.manager.ts` as `socialIntegrationList`.

## Background Jobs (Temporal)

- Workflows in `apps/orchestrator/src/workflows/` — post publishing, token refresh, digest emails, autopost, streaks.
- Activities in `apps/orchestrator/src/activities/` — the actual work functions called by workflows.
- Temporal module configured in `libraries/nestjs-libraries/src/temporal/temporal.module.ts`.

## Database

- **Prisma** with PostgreSQL. Schema at `libraries/nestjs-libraries/src/database/prisma/schema.prisma`.
- Key models: Organization (tenant), User, Post, Integration, Media, Subscription, Tags.
- Multi-tenant via Organization — most queries scoped to org.

## Environment

- Config via `.env` file at the repo root (used by `dotenv -e ../../.env` in app scripts).
- Dev infrastructure via `docker-compose.dev.yaml`: PostgreSQL (5432), Redis (6379), Temporal (7233), pgAdmin (8081), Temporal UI (8080).
