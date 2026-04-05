# Integration Setup Status

**Phase:** Foundation / Integration Scaffold
**Date completed:** 2026-04-04
**Build status:** ✅ Passing
**Smoke tests:** ✅ 2 / 2 passing (Playwright / Chromium)

---

## What is installed and scaffolded

| Tool | Status | Notes |
|---|---|---|
| **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) | ✅ Scaffolded | Client + server utilities ready; auth flow not yet wired |
| **Prisma** (`prisma`, `@prisma/client`) | ✅ Scaffolded | Schema defined; no migration run yet (requires real DB) |
| **Playwright** (`@playwright/test`) | ✅ Running | Chromium installed; 2 smoke tests passing |
| **Lighthouse CI** (`@lhci/cli`) | ✅ Configured | `.lighthouserc.js` ready; no LHCI server configured yet |
| **Sentry** (`@sentry/nextjs`) | ✅ Scaffolded | Client / server / edge configs present; DSN not yet set |
| **PostHog** (`posthog-js`) | ✅ Scaffolded | Provider live in root layout; key not yet set |
| **Upstash Redis / Ratelimit** (`@upstash/redis`, `@upstash/ratelimit`) | ✅ Scaffolded | Rate-limit helper ready; credentials not yet set |
| **PageSpeed Insights** (service stub) | ✅ Stubbed | `src/lib/services/pagespeed.ts` — needs `PAGESPEED_API_KEY` |
| **Search Console** (service stub) | ✅ Stubbed | `src/lib/services/search-console.ts` — needs service-account keys + JWT impl |
| **Cron audit route** | ✅ Stubbed | `src/app/api/cron/audit/route.ts` — needs business logic + `CRON_SECRET` |

---

## Remaining manual setup required

### 1. Supabase project
- [ ] Create a project at [supabase.com](https://supabase.com)
- [ ] Copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` into `.env.local`
- [ ] Copy `DATABASE_URL` (pooled, port 6543) and `DIRECT_URL` (direct, port 5432) into `.env.local` and `.env`
- [ ] Run `npx prisma migrate dev --name init` to apply the schema

### 2. Prisma first migration
```bash
# After filling in .env.local with real Supabase credentials:
npx prisma migrate dev --name init
npx prisma generate
```

### 3. Sentry project
- [ ] Create a project at [sentry.io](https://sentry.io)
- [ ] Copy DSN into `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` in `.env.local`
- [ ] For CI source-map upload: add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`

### 4. PostHog project
- [ ] Create a project at [posthog.com](https://posthog.com)
- [ ] Copy Project API Key into `NEXT_PUBLIC_POSTHOG_KEY` in `.env.local`
- [ ] Optionally set `NEXT_PUBLIC_POSTHOG_HOST` for EU data residency

### 5. Upstash Redis
- [ ] Create a database at [upstash.com](https://upstash.com)
- [ ] Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` into `.env.local`

### 6. Google PageSpeed Insights API
- [ ] Enable "PageSpeed Insights API" in Google Cloud Console
- [ ] Create an API key and set `PAGESPEED_API_KEY` in `.env.local`

### 7. Google Search Console service account
- [ ] Create a service account in Google Cloud Console
- [ ] Grant it access in Search Console
- [ ] Set `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` and `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` in `.env.local`
- [ ] Implement `getAccessToken()` in `src/lib/services/search-console.ts` (JWT signing via `google-auth-library`)

### 8. Cron scheduled audits
- [ ] Set `CRON_SECRET` (random string) in `.env.local` and your deployment environment
- [ ] Implement business logic in `src/app/api/cron/audit/route.ts`
- [ ] Add `vercel.json` cron entry if deploying to Vercel

### 9. Lighthouse CI server (optional)
- [ ] For persistent history, set up an LHCI server or use `temporary-public-storage`
- [ ] Update `.lighthouserc.js` `upload.target` and credentials

---

## File manifest (changed / created this phase)

```
Modified:
  package.json                         — added scripts + all new dependencies
  next.config.ts                       — wrapped with withSentryConfig; turbopack root
  src/app/layout.tsx                   — added PostHogProvider wrapper
  .env.example                         — added all new placeholder keys
  .gitignore                           — added .env to ignore list
  prisma.config.ts                     — updated for .env.local resolution
  prisma/schema.prisma                 — full minimal schema (Site, AuditRun, Metric, AlertRule)

Created:
  .env                                 — Prisma CLI credential file (empty placeholders)
  .lighthouserc.js                     — Lighthouse CI configuration
  playwright.config.ts                 — Playwright test configuration
  sentry.client.config.ts              — Sentry browser init
  sentry.server.config.ts              — Sentry server init
  sentry.edge.config.ts                — Sentry edge runtime init
  src/proxy.ts                         — Next.js 16 proxy (replaces deprecated middleware.ts)
  src/lib/supabase/client.ts           — Supabase browser client
  src/lib/supabase/server.ts           — Supabase server client
  src/lib/posthog/client.ts            — PostHog browser client init
  src/lib/posthog/provider.tsx         — PostHog React provider (App Router)
  src/lib/ratelimit.ts                 — Upstash rate-limit instances
  src/lib/services/pagespeed.ts        — PageSpeed Insights service stub
  src/lib/services/search-console.ts  — Search Console service stub
  src/app/api/cron/audit/route.ts      — Cron audit trigger route handler
  tests/e2e/smoke.spec.ts              — Playwright smoke tests
  docs/SETUP_STATUS.md                 — this file

Deleted:
  src/middleware.ts                    — deprecated in Next.js 16; replaced by src/proxy.ts
```
