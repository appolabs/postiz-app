# External Integrations

**Analysis Date:** 2026-02-28

## APIs & External Services

**Social Media Platforms (28+ Channels):**

All providers in `libraries/nestjs-libraries/src/integrations/social/`, implementing `SocialProvider` interface via `SocialAbstract` base class. Managed by `integration.manager.ts`.

| Platform | Provider File | SDK/Package |
|----------|--------------|-------------|
| X (Twitter) | `x.provider.ts` | `twitter-api-v2@1.24.0` |
| LinkedIn | `linkedin.provider.ts`, `linkedin.page.provider.ts` | REST API |
| Instagram | `instagram.provider.ts`, `instagram.standalone.provider.ts` | Meta Graph API |
| Facebook | `facebook.provider.ts` | `facebook-nodejs-business-sdk@21.0.5` |
| TikTok | `tiktok.provider.ts` | REST API |
| YouTube | `youtube.provider.ts` | `googleapis@137.1.0` |
| Pinterest | `pinterest.provider.ts` | REST API |
| Bluesky | `bluesky.provider.ts` | `@atproto/api@0.15.15` |
| Mastodon | `mastodon.provider.ts`, `mastodon.custom.provider.ts` | REST API |
| Threads | `threads.provider.ts` | Meta API |
| Reddit | `reddit.provider.ts` | REST API |
| Discord | `discord.provider.ts` | `discord.js` |
| Telegram | `telegram.provider.ts` | `node-telegram-bot-api@0.66.0` |
| Slack | `slack.provider.ts` | REST API |
| Dev.to | `dev.to.provider.ts` | REST API |
| Medium | `medium.provider.ts` | REST API |
| Hashnode | `hashnode.provider.ts` | GraphQL API |
| Dribbble | `dribbble.provider.ts` | REST API |
| WordPress | `wordpress.provider.ts` | REST API |
| Farcaster | `farcaster.provider.ts` | `@neynar/nodejs-sdk@3.112.0` |
| Nostr | `nostr.provider.ts` | `nostr-tools@2.18.2` |
| VK | `vk.provider.ts` | REST API |
| Lemmy | `lemmy.provider.ts` | REST API |
| Kick | `kick.provider.ts` | REST API |
| Twitch | `twitch.provider.ts` | REST API |
| GMB | `gmb.provider.ts` | Google My Business API |
| Skool | `skool.provider.ts` | REST API |
| Whop | `whop.provider.ts` | REST API |
| Moltbook | `moltbook.provider.ts` | REST API |
| Listmonk | `listmonk.provider.ts` | REST API |

**Payment Processing:**
- Stripe - Subscription billing, checkout sessions, webhooks
  - SDK: `stripe@15.5.0`, `@stripe/react-stripe-js@5.4.1`, `@stripe/stripe-js@8.6.0`
  - Service: `libraries/nestjs-libraries/src/services/stripe.service.ts`
  - Events: `customer.subscription.created`, `customer.subscription.updated`
- NowPayments - Crypto payments (Solana/SOL) for lifetime deals
  - Service: `libraries/nestjs-libraries/src/crypto/nowpayments.ts`
  - API: `https://api.nowpayments.io/v1/invoice`

**AI Services:**
- OpenAI - Content generation (GPT-4.1), image generation (DALL-E 3), text-to-speech
  - SDK: `openai@6.2.0`
  - Service: `libraries/nestjs-libraries/src/openai/openai.service.ts`
- FAL AI - Image and video generation
  - SDK: `@ai-sdk/openai@2.0.52`
  - Service: `libraries/nestjs-libraries/src/openai/fal.service.ts`
- HeyGen - AI avatar video generation
  - Service: `libraries/nestjs-libraries/src/3rdparties/heygen/heygen.provider.ts`
- LangChain/Mastra - Agent orchestration and LLM workflows
  - SDK: `@langchain/core@0.3.44`, `@mastra/core@0.20.2`
  - Service: `libraries/nestjs-libraries/src/agent/agent.graph.service.ts`

**Email:**
- Resend - Transactional emails (default provider)
  - SDK: `resend@3.2.0`
  - Provider: `libraries/nestjs-libraries/src/emails/resend.provider.ts`
- Nodemailer - SMTP-based email (alternative)
  - SDK: `nodemailer@7.0.11`
  - Provider: `libraries/nestjs-libraries/src/emails/node.mailer.provider.ts`
- Interface: `libraries/nestjs-libraries/src/emails/email.interface.ts`

**Newsletter Platforms:**
- Beehiiv - `libraries/nestjs-libraries/src/newsletter/providers/beehiiv.provider.ts`
- Listmonk - `libraries/nestjs-libraries/src/newsletter/providers/listmonk.provider.ts`

**URL Shortening:**
All in `libraries/nestjs-libraries/src/short-linking/providers/`:
- Dub Analytics - `dub.ts` (`@dub/analytics@0.0.32`)
- Short.io - `short.io.ts`
- Kutt - `kutt.ts`
- Linkdrip - `linkdrip.ts`

## Data Storage

**Databases:**
- PostgreSQL - Primary data store
  - Client: Prisma 6.5.0
  - Schema: `libraries/nestjs-libraries/src/database/prisma/schema.prisma`
  - Connection: `DATABASE_URL` env var
  - Dev: Docker on port 5432

**File Storage:**
- Cloudflare R2 - Primary file storage (S3-compatible)
  - Service: `libraries/nestjs-libraries/src/upload/cloudflare.storage.ts`
  - Uploader: `libraries/nestjs-libraries/src/upload/r2.uploader.ts`
  - SDK: `@aws-sdk/client-s3@3.787.0`, `@aws-sdk/s3-request-presigner@3.787.0`
- Local Storage - Fallback provider
  - Service: `libraries/nestjs-libraries/src/upload/local.storage.ts`
- Frontend upload widget: Uppy 4.x (`@uppy/core`, `@uppy/dashboard`, `@uppy/aws-s3`, `@uppy/react`)

**Caching:**
- Redis - Rate limiting, throttling, session storage
  - SDK: `redis@4.6.12`, `ioredis@5.3.2`
  - Service: `libraries/nestjs-libraries/src/redis/redis.service.ts`
  - Dev: Docker on port 6379

## Authentication & Identity

**Auth Provider:**
- Custom JWT authentication
  - Service: `apps/backend/src/services/auth/auth.service.ts`
  - Middleware: `apps/backend/src/services/auth/auth.middleware.ts`

**OAuth Integrations:**
- Google OAuth 2.0 - `apps/backend/src/services/auth/providers/google.provider.ts` (via `googleapis`, `google-auth-library`)
- GitHub OAuth - `apps/backend/src/services/auth/providers/github.provider.ts`
- Generic OAuth - `apps/backend/src/services/auth/providers/oauth.provider.ts`

**Authorization:**
- CASL - Role-based access control (`@casl/ability@6.5.0`)
  - Guard: `apps/backend/src/services/auth/permissions/permissions.guard.ts`

## Monitoring & Observability

**Error Tracking:**
- Sentry - Server and client errors
  - Backend: `@sentry/nestjs@10.26.0`, `@sentry/profiling-node@10.25.0`
  - Frontend: `@sentry/nextjs@10.26.0`, `@sentry/react@10.25.0`
  - Init: `libraries/nestjs-libraries/src/sentry/initialize.sentry.ts`
  - Frontend configs: `apps/frontend/src/sentry.server.config.ts`, `apps/frontend/src/sentry.edge.config.ts`

**Analytics:**
- PostHog - Product analytics (`posthog-js@1.178.0`)
  - Integration: `libraries/react-shared-libraries/src/helpers/posthog.tsx`
- Custom tracking: `libraries/nestjs-libraries/src/track/track.service.ts`

## CI/CD & Deployment

**Hosting:**
- Docker - `docker-compose.yaml` for production
- PM2 - Process manager available

**CI Pipeline:**
- GitHub Actions - `.github/` directory
- Dependabot - `.github/Dependabot.yml` for dependency updates

## Environment Configuration

**Development:**
- Required: PostgreSQL, Redis, Temporal (via `docker-compose.dev.yaml`)
- Env vars: `.env` at repo root, loaded via `dotenv -e ../../.env`
- Template: `.env.example` present

**Background Processing:**
- Temporal Server - Workflow orchestration
  - Dev: Docker on port 7233
  - UI: Port 8080
  - Module: `libraries/nestjs-libraries/src/temporal/temporal.module.ts`

## Webhooks & Callbacks

**Incoming:**
- Stripe webhooks - Subscription events
  - Controller: `apps/backend/src/api/routes/billing.controller.ts`
- Social platform callbacks - OAuth and posting callbacks
  - Controller: `apps/backend/src/api/routes/no.auth.integrations.controller.ts`

**Outgoing:**
- Custom webhooks - User-configurable
  - Service: `libraries/nestjs-libraries/src/database/prisma/webhooks/`

## Web3 & Blockchain

- Solana wallet integration - `@solana/wallet-adapter-react@0.15.35`
- Ethereum SDK - `viem@2.22.9`
- NowPayments crypto billing
- Custom wallet package: `@postiz/wallets@0.0.1`

---

*Integration audit: 2026-02-28*
*Update when adding/removing external services*
