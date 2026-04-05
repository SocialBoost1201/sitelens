# Doc-04: Technical Architecture

**Project**: SiteLens
**Version**: 0.1
**Status**: IN REVIEW — MVP decisions incorporated; pending technical lead approval
**Last Updated**: 2026-04-05
**Author**: Architecture Agent

---

## Table of Contents

1. [Overview](#1-overview)
2. [Purpose and Scope](#2-purpose-and-scope)
3. [Technical Principles](#3-technical-principles)
4. [Approved Stack](#4-approved-stack)
5. [Repository and Directory Strategy](#5-repository-and-directory-strategy)
6. [Application Layer Responsibilities](#6-application-layer-responsibilities)
7. [Data Layer Responsibilities](#7-data-layer-responsibilities)
8. [Integration Layer Responsibilities](#8-integration-layer-responsibilities)
9. [Scheduling / Background Execution Preparation](#9-scheduling--background-execution-preparation)
10. [Configuration and Environment Strategy](#10-configuration-and-environment-strategy)
11. [Logging / Monitoring / Observability](#11-logging--monitoring--observability)
12. [Testing Strategy](#12-testing-strategy)
13. [Current State vs Planned State](#13-current-state-vs-planned-state)
14. [Risks / Technical Notes](#14-risks--technical-notes)

---

## 1. Overview

This document defines the technical architecture for SiteLens: technology choices and
their rationale, layer responsibilities, integration patterns, configuration strategy,
and the honest current state of the codebase relative to what is needed for MVP.

This document must be read alongside:

- **Doc-01** — product scope, requirements, and open questions
- **Doc-02** — system context, actors, functional modules, and data flow
- **Doc-03** — database schema and data access design details

Decisions marked `[DEFERRED]` are noted but not resolved here. Decisions marked
`[RESOLVED]` were previously open questions that are now closed.

---

## 2. Purpose and Scope

### 2.1 What This Document Covers

- Technical principles guiding all implementation decisions
- The approved technology stack with rationale for each choice
- Directory structure and layer responsibility boundaries
- Application, data, and integration layer responsibilities
- Configuration and secret management strategy
- Logging, error tracking, and observability approach
- Testing strategy and coverage expectations
- Honest current state vs. what is needed for MVP
- Technical risks and notes for implementation agents

### 2.2 What This Document Does Not Cover

| Topic | Covered In |
|-------|-----------|
| Product requirements and functional scope | Doc-01 |
| System context, actors, functional modules | Doc-02 |
| Database schema and entity design | Doc-03 |
| RLS policies and security model | Doc-06 |
| Performance targets and load expectations | Doc-07 |
| Test case definitions and E2E scenarios | Doc-05 |
| Operations runbooks and deployment procedures | Doc-08 |

### 2.3 Fixed MVP Technical Constraints

The following product decisions are fixed for this architecture pass and must not
be contradicted in implementation:

| Constraint | Detail |
|-----------|--------|
| **Internal tool** | No public SaaS. No public user registration. No pricing model at MVP. |
| **Single-workspace** | One workspace context shared by all users. No tenant isolation needed at MVP. |
| **Invitation-only Viewer access** | Viewer role requires explicit assignment. No public URLs. No unauthenticated views. |
| **PSI-only committed data source** | PageSpeed Insights API is the only committed audit source at MVP. |
| **One URL per project** | Multi-URL support is V1. The `Project` model retains a single `url` field. |

---

## 3. Technical Principles

These principles guide all architectural decisions in SiteLens.

1. **Server-first data access**
   All external API calls, database queries, and secret usage run server-side —
   in Route Handlers or Server Components. No API keys, credentials, or raw database
   results reach the browser except through Server Component rendering.

2. **Minimal active surface at MVP**
   Scaffolded integrations that would incur cost or make external calls must not execute
   until intentionally activated. Stub functions that are not ready must fail loudly
   (throw), not silently degrade.

3. **Separation of concerns**
   Route Handlers validate requests and check auth. They delegate to service functions
   for business logic. They do not contain normalization, finding extraction, or
   threshold evaluation logic directly.

4. **Explicit over implicit**
   All environment-specific configuration via environment variables. No magic defaults
   that diverge between local and production. No hardcoded secrets or URLs.

5. **Observability from the start**
   Sentry captures uncaught errors from day one. PostHog captures key user actions.
   Structured log output for audit pipeline operations.

6. **RLS as the authoritative data gate**
   Supabase Row-Level Security is the final isolation layer. Application-layer ownership
   checks are secondary defense-in-depth. Both must be present; neither is sufficient alone
   for server-side code (which bypasses RLS by default when using the Prisma client).

7. **Schema-first, migrate-intentionally**
   The Prisma schema must be final before any migration is applied. Premature schema changes
   create irreversible state. Do not run `prisma migrate dev` until the schema is correct and
   Supabase is provisioned with environment variables in `.env.local`.

8. **Single-workspace simplicity at MVP**
   Do not introduce multi-tenant abstractions, organization models, or billing layers.
   The data model assumes a single implicit workspace. Multi-tenant refactoring is a future
   concern that should not be anticipated in MVP code.

---

## 4. Approved Stack

| Layer | Technology | Version | Role | MVP-Critical? |
|-------|-----------|---------|------|--------------|
| Framework | Next.js (App Router) | 16.2.2 | Routing, Server Components, Route Handlers, SSR | Yes |
| Language | TypeScript (strict) | 5.x | Type safety across all layers | Yes |
| UI | React | 19.2.4 | Client rendering (required by Next.js 16) | Yes |
| Styling | Tailwind CSS | 4.x | Utility-first styling; zero runtime CSS | Yes |
| Database | Supabase (PostgreSQL) | Managed | Managed Postgres + Auth + RLS + pooling | Yes |
| ORM | Prisma | 7.x | Type-safe DB access; schema-as-code; migration management | Yes |
| Auth | Supabase Auth via `@supabase/ssr` | 0.10.x | HTTP-only cookie sessions; SSR-compatible; RLS JWT integration | Yes |
| Deployment | Vercel | Managed | Native Next.js deployment; Cron Jobs; global CDN; CI from GitHub | Yes |
| E2E Testing | Playwright + `@playwright/test` | 1.59.x | Cross-browser E2E; smoke tests currently passing | Yes |
| Performance CI | Lighthouse CI (`@lhci/cli`) | 0.15.x | Automated score gating in CI; configured but not yet wired to CI pipeline | Supporting |
| Error Tracking | Sentry (`@sentry/nextjs`) | 10.x | Auto-instrumented; client + server + edge coverage | Yes |
| Analytics | PostHog (`posthog-js`) | 1.x | Pageview and key-event tracking; disabled in non-production | Supporting |
| Rate Limiting | Upstash Redis + `@upstash/ratelimit` | Redis 1.x / ratelimit 2.x | Serverless-compatible; prevents PSI API cost runaway | Yes |

> **Breaking change notice**: Next.js 16 has API changes from prior versions. Before
> writing any App Router code, read `node_modules/next/dist/docs/` for current behavior.
> Do not assume Next.js 13/14/15 conventions apply. `middleware.ts` is replaced by `proxy.ts`.

---

## 5. Repository and Directory Strategy

### 5.1 Current Directory Structure

```
SiteLens/
├── src/
│   ├── app/                              # Next.js App Router — routing, pages, layouts
│   │   ├── api/
│   │   │   └── cron/audit/route.ts       # POST: cron audit trigger (scaffold; no business logic)
│   │   ├── globals.css                   # Tailwind v4 global import
│   │   ├── layout.tsx                    # Root layout + PostHog provider
│   │   └── page.tsx                      # Foundation status home page
│   ├── generated/
│   │   └── prisma/                       # Prisma-generated client (non-standard output path)
│   ├── lib/
│   │   ├── services/                     # External API client wrappers
│   │   │   ├── pagespeed.ts              # PageSpeed Insights API (scaffold; not pipeline-integrated)
│   │   │   └── search-console.ts         # Google Search Console (V1 stub — throws if called)
│   │   ├── supabase/                     # Supabase client factories
│   │   │   ├── client.ts                 # Browser client (Client Components)
│   │   │   └── server.ts                 # Server client (Server Components, Route Handlers)
│   │   ├── posthog/                      # PostHog client and provider
│   │   │   ├── client.ts
│   │   │   └── provider.tsx
│   │   ├── ratelimit.ts                  # Upstash rate limiter instances (not yet applied to routes)
│   │   └── utils.ts                      # Shared utility placeholder (empty)
│   ├── types/
│   │   └── index.ts                      # Domain type definitions (empty placeholder)
│   └── proxy.ts                          # Next.js 16 proxy (replaces middleware.ts; passthrough only)
├── prisma/
│   ├── schema.prisma                     # Prisma schema — 5 models, 5 enums; finalized
│   ├── prisma.config.ts                  # CLI datasource resolution (Prisma 7)
│   └── migrations/
│       ├── 20260404000000_init/          # Initial DDL migration SQL (prepared; see §13)
│       └── 20260404000001_rls_policies/  # RLS policy SQL (applied per Doc-06 §3.3)
├── tests/
│   └── e2e/
│       └── smoke.spec.ts                 # Playwright smoke tests (2/2 passing)
├── docs/                                 # Architecture and design documents
├── .lighthouserc.js                      # Lighthouse CI configuration
├── sentry.client.config.ts               # Sentry browser configuration
├── sentry.server.config.ts               # Sentry server configuration
└── sentry.edge.config.ts                 # Sentry edge configuration
```

### 5.2 Planned Additions for MVP Implementation

The following do not yet exist and must be created:

```
src/app/
├── (auth)/                    # Auth routes: sign-in, sign-up, callback
└── (dashboard)/               # Protected routes: project list, detail, run view

src/lib/
├── audit/                     # Audit pipeline (planned)
│   ├── execute.ts             # Orchestrates a full audit run (steps 4–10 of Doc-02 §7.2)
│   ├── normalize/             # Source-specific normalizers
│   │   └── pagespeed.ts       # PSI response → Metric records
│   ├── findings/              # Finding extraction per source
│   │   └── pagespeed.ts       # PSI audit items → Finding records
│   └── thresholds.ts          # AlertRule evaluation after each completed run
└── db/                        # Data access layer (planned)
    └── client.ts              # Prisma Client singleton (prevents connection leaks in serverless)
```

### 5.3 Layer Responsibility Model

| Directory | Layer | Responsibility |
|-----------|-------|----------------|
| `src/app/` | Presentation + Routing | Page rendering, metadata, layout structure |
| `src/app/api/` | API (Route Handlers) | HTTP handling; auth validation; request delegation; JSON response |
| `src/lib/services/` | Integration | External API client wrappers; source-specific data retrieval |
| `src/lib/audit/` *(planned)* | Business Logic | Audit orchestration; metric normalization; finding extraction; threshold evaluation |
| `src/lib/supabase/` | Auth Infrastructure | Supabase client factories for browser vs. server context |
| `src/lib/db/` *(planned)* | Data Access | Prisma Client singleton; typed query helpers |
| `src/lib/posthog/` | Analytics Infrastructure | PostHog client and React provider |
| `src/types/` | Shared Types | Domain type definitions used across all layers |
| `prisma/` | Schema and Migrations | Schema definition; migration SQL history |
| `src/generated/prisma/` | Generated (do not edit) | Prisma-generated client; import from here, not `@prisma/client` |

**Key rule**: Route Handlers must not contain business logic. They validate the request,
check auth, delegate to the `src/lib/audit/` or query helpers, and format the response.
No Prisma queries should appear directly in Route Handlers.

---

## 6. Application Layer Responsibilities

### 6.1 Next.js App Router

Next.js 16 uses the App Router as the primary routing and rendering mechanism.

**Server Components** (default) are used for:

- Dashboard pages that read from the database
- Any component needing server-side data without a client round-trip
- Auth session verification before rendering sensitive data

**Client Components** (`"use client"`) are used only for:

- Interactive UI (forms, buttons, dropdowns, modals)
- PostHog analytics provider and hooks
- Browser-specific APIs

**Route Handlers** (`src/app/api/`) are used for:

- All HTTP API endpoints (audit triggers, cron, future auth callbacks)
- Never for page rendering

### 6.2 Proxy (Replaces Middleware)

`src/proxy.ts` replaces the deprecated `middleware.ts` convention in Next.js 16.
The proxy runs on every request matched by its `config.matcher`.

**Current state**: Passthrough only — `NextResponse.next()` with no logic.

**Required before auth routes are added (V1 proxy logic)**:

- Call `supabase.auth.getUser()` to refresh the session cookie on each request
- Redirect unauthenticated requests on protected routes to the sign-in page

**Matcher**: Excludes `/_next/`, static file extensions, and other Next.js internals.
Do not modify the matcher without verifying the full routing behavior.

### 6.3 Authentication Strategy

| Aspect | Detail |
|--------|--------|
| Identity provider | Supabase Auth |
| Session storage | HTTP-only cookies (no `localStorage`) |
| Server-side client | `createClient()` from `src/lib/supabase/server.ts` — cookie-aware |
| Browser client | `createClient()` from `src/lib/supabase/client.ts` — singleton |
| Session read | Always use `supabase.auth.getUser()` — never `getSession()` (insecure; deprecated) |
| User identity | `auth.uid()` returns the authenticated user's UUID (TEXT in the DB) |

**Enforcement layering:**

1. Route Handlers call `getUser()` before any mutation or sensitive read
2. Server Components verify auth before rendering protected data
3. Supabase RLS enforces row-level isolation as the authoritative database gate

**Important**: Server-side code (Route Handlers, Server Components using Prisma or the
service-role Supabase client) **bypasses RLS**. Application-layer ownership checks are
therefore mandatory for all server-side mutations.

---

## 7. Data Layer Responsibilities

### 7.1 Supabase Services in Use

| Service | Used For | Current Status |
|---------|---------|----------------|
| PostgreSQL | Primary relational datastore | Pending provisioning; schema finalized |
| Auth | User management, session tokens, JWT claims | Scaffolded; sign-in flow not yet wired |
| Row-Level Security | Data isolation per user | Policies applied via Supabase SQL editor (Doc-06 §3.3) |
| pgBouncer connection pooling | Runtime DB connections | Configured in env var `DATABASE_URL` |

**Supabase services not used by SiteLens:**

- Edge Functions — not used; Next.js Route Handlers serve this role
- Realtime subscriptions — not required at MVP
- Supabase Storage — not required

### 7.2 Prisma ORM

Prisma manages all structured database access from application code.

| Aspect | Detail |
|--------|--------|
| Schema location | `prisma/schema.prisma` — model and enum definitions |
| Client output | `src/generated/prisma` — non-standard output path; always import from here, not `@prisma/client` |
| CLI config | `prisma.config.ts` — resolves datasource URL for migrations; uses `DIRECT_URL` → falls back to `DATABASE_URL` |
| Runtime URL | `DATABASE_URL` — pooled via pgBouncer; used by pg adapter at runtime |
| Migration URL | `DIRECT_URL` — bypasses pgBouncer; required for `prisma migrate dev` DDL operations |

**Schema state**: The schema defines 5 models and 5 enums; all pre-migration design
gaps are resolved. Migration SQL files exist in `prisma/migrations/`. The initial
DDL migration has not yet been applied via `prisma migrate dev` (pending Supabase
project provisioning and env var configuration). The RLS policy migration SQL has
been applied separately via Supabase SQL editor (see Doc-06 §3.3).

**Important**: Do not run `prisma migrate dev` until:
1. Supabase project is provisioned
2. `DIRECT_URL` and `DATABASE_URL` are set in `.env.local`

**Data access pattern:**

```
Route Handler / Server Component
  → auth check via supabase.auth.getUser()
  → Prisma Client executes query
  → result returned, rendered, or serialized
```

No raw SQL. All structured queries through the Prisma Client.

### 7.3 Prisma Client Singleton

A Prisma Client singleton must be created at `src/lib/db/client.ts` (planned) to avoid
exhausting database connections in a serverless environment. Hot-reload in development
creates new module instances; the singleton pattern (with `global` caching in dev mode)
prevents connection leaks.

**Import path**: `import { prisma } from "@/lib/db/client"` — not from `@prisma/client`.

---

## 8. Integration Layer Responsibilities

### 8.1 Google PageSpeed Insights API (MVP — Committed)

| Attribute | Detail |
|-----------|--------|
| File | `src/lib/services/pagespeed.ts` |
| Status | Scaffold — types and stub HTTP call defined; not yet integrated into audit pipeline |
| Auth | `PAGESPEED_API_KEY` environment variable |
| Endpoint | `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` |
| Rate limiting | `auditRateLimit` — 5 audits/hour per site (Upstash, fixed window) |
| What is missing | Retry logic, structured error handling, pipeline integration |

The service returns a `PageSpeedResult` type with category scores and the full raw
response. The raw response must be stored on the `AuditRun.rawData` field (Json type).

**Integration responsibility model:**

```
src/lib/services/pagespeed.ts       ← HTTP call only; returns raw PSI response
src/lib/audit/normalize/pagespeed.ts ← PSI response → normalized Metric records (planned)
src/lib/audit/findings/pagespeed.ts  ← PSI audit items → Finding records (planned)
src/lib/audit/execute.ts             ← Orchestrates all of the above (planned)
```

Each layer is independently testable. The service wrapper can be tested with mocked
HTTP responses. The normalizer and finding extractor are pure functions testable with
sample PSI response fixtures.

### 8.2 Google Search Console API (V1 Only — Do Not Activate at MVP)

| Attribute | Detail |
|-----------|--------|
| File | `src/lib/services/search-console.ts` |
| Status | **Stub only — throws if `querySearchConsole()` is called** |
| Auth | OAuth2 service account (JWT signing not implemented) |
| Dependency needed | `google-auth-library` or equivalent |

**Do not wire this service into any audit path.** Calling it at MVP will throw.
All GSC functionality is V1.

### 8.3 Upstash Redis (Rate Limiting)

| Attribute | Detail |
|-----------|--------|
| File | `src/lib/ratelimit.ts` |
| Status | Scaffold — limiters defined; not yet applied to any Route Handler |
| `apiRateLimit` | 60 req/min per user/IP (sliding window) |
| `auditRateLimit` | 5 audits/hour per site (fixed window) |
| Credentials | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Boot behavior | Throws at boot if credentials are missing (lazy init; env check at first use) |

The `auditRateLimit` limiter must be applied in the audit trigger Route Handler before
PSI is called.

### 8.4 Sentry (Error Tracking)

| Attribute | Detail |
|-----------|--------|
| Configuration | `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` |
| Status | Config files in place; requires Sentry project DSN to be active |
| Coverage | Client, server, and edge runtimes (auto-instrumented for App Router) |
| Manual capture | Use `Sentry.captureException(error, { extra: { auditRunId } })` in the audit pipeline |
| Source maps | Uploaded via `SENTRY_AUTH_TOKEN` at build time when `CI=true` |

### 8.5 PostHog (Product Analytics)

| Attribute | Detail |
|-----------|--------|
| Browser client | `src/lib/posthog/client.ts` |
| Provider | `src/lib/posthog/provider.tsx` — wired into root layout |
| Pageview tracking | Active via `usePathname()` hook in provider |
| Non-production gate | Event capture explicitly disabled outside production — **do not remove this gate** |
| Credentials | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` |

**Planned events to implement** (not yet wired):

- `project_created`, `audit_triggered`, `audit_completed`, `audit_failed`
- `threshold_violation_detected`, `report_viewed`

---

## 9. Scheduling / Background Execution Preparation

### 9.1 Current State

The endpoint `/api/cron/audit` is scaffolded with:

- `POST` handler: validates `Authorization: Bearer {CRON_SECRET}` → returns `{ ok: true }` (200)
- `GET` handler: health check → returns `{ status: "scaffold" }` (200)
- **No business logic** — no DB queries, no audit triggering, no pipeline calls

### 9.2 V1 Activation Design (Planned)

When scheduling is activated in V1:

1. `vercel.json` gains a Cron schedule pointing to `POST /api/cron/audit`
2. A V1 schema migration adds scheduling fields to `Project`: `cadence`, `nextRunAt`, `schedulingEnabled`
3. The cron handler queries the DB for projects with scheduled audits due
4. For each due project URL: creates `AuditRun` (PENDING) and invokes the audit pipeline

**Design decision deferred to V1**: Whether scheduling metadata lives on `Project` directly
or in a separate `ScheduleConfig` model.

### 9.3 Cron Security

- Only requests with a valid `CRON_SECRET` in `Authorization: Bearer` are accepted
- Vercel Cron automatically includes this header when configured via `vercel.json`
- All other requests are rejected with HTTP 401
- `CRON_SECRET` must be in Vercel environment variables and `.env.local`
- The secret must never appear in client-side code or logs

---

## 10. Configuration and Environment Strategy

### 10.1 Environment File Roles

| File | Purpose | Committed? |
|------|---------|-----------|
| `.env.example` | Documented template of all required variables with comments | Yes |
| `.env.local` | Local development values | No (`.gitignore`) |
| `.env` | Prisma CLI only — minimal placeholder | Yes (empty values) |
| Vercel Dashboard | Production and preview environment variables | External |

**Rule**: All secrets and environment-specific values must be in `.env.local` locally
and in Vercel's environment variable settings in production. Nothing sensitive in source.

### 10.2 Variable Categories

| Category | Key Variables | Exposure |
|----------|--------------|---------|
| Application | `NEXT_PUBLIC_APP_URL` | Public (browser-safe) |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (RLS enforces isolation) |
| Supabase | `SUPABASE_SERVICE_ROLE_KEY` | Server-side only — bypasses RLS |
| Database | `DATABASE_URL` | Server-side only (pooled; runtime) |
| Database | `DIRECT_URL` | Server-side only (direct; migration only) |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN` | Public (browser error reporting) |
| Sentry | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Server-side / build-time only |
| PostHog | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Public (analytics keys are safe) |
| Upstash | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Server-side only |
| Google APIs | `PAGESPEED_API_KEY` | Server-side only |
| Google APIs | `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL`, `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` | Server-side only (V1) |
| Cron | `CRON_SECRET` | Server-side only — must never appear in client bundle |

### 10.3 `NEXT_PUBLIC_` Prefix Policy

Variables prefixed `NEXT_PUBLIC_` are bundled into client-side JavaScript. This is
intentional **only** for:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — required by browser Supabase client (RLS enforces isolation)
- `NEXT_PUBLIC_SENTRY_DSN` — required for browser error reporting
- `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` — analytics
- `NEXT_PUBLIC_APP_URL` — base URL for client-side links

All other credentials must **not** use the `NEXT_PUBLIC_` prefix.

### 10.4 Connection URL Strategy

| Variable | Purpose | Notes |
|----------|---------|-------|
| `DATABASE_URL` | Runtime Prisma queries via pg adapter | Pooled via pgBouncer (port 6543) |
| `DIRECT_URL` | `prisma migrate dev` and `prisma db push` | Bypasses pgBouncer (port 5432); DDL operations only |

Missing `DIRECT_URL` will cause `prisma migrate dev` to fail. Missing `DATABASE_URL`
will cause the Prisma Client to throw at runtime.

---

## 11. Logging / Monitoring / Observability

### 11.1 Error Tracking (Sentry)

- Uncaught errors in client, server, and edge contexts are auto-captured
- For audit pipeline operations, use `Sentry.captureException(error, { extra: { auditRunId } })`
  to attach run context to caught errors
- Source maps provide readable stack traces in Sentry when `SENTRY_AUTH_TOKEN` is set at build
- Config files are in place; requires a real Sentry project DSN to be active

### 11.2 Product Analytics (PostHog)

- Pageviews tracked automatically via the provider in the root layout
- Key business events must be emitted explicitly in Route Handlers (see §8.5)
- Event capture is **disabled in non-production** environments — do not remove this gate
- PostHog is a supporting concern; do not let analytics instrumentation block core feature work

### 11.3 Application Logs

- Use `console.error()` and `console.warn()` for server-side operational messages
- Vercel aggregates server logs in the Vercel Logs dashboard (available in production)
- For structured entries in the audit pipeline, emit JSON objects:

  ```ts
  console.log(JSON.stringify({
    event: "audit_completed",
    auditRunId,
    projectId,
    durationMs,
    source: "pagespeed-insights"
  }));
  ```

- No external log aggregation service is planned at MVP

### 11.4 Audit Run Traceability

Every audit run must be traceable via:

| Field | Purpose |
|-------|---------|
| `AuditRun.id` | Unique CUID per run; use as correlation ID in logs and Sentry context |
| `AuditRun.createdAt` | Run creation timestamp |
| `AuditRun.startedAt` / `finishedAt` | Execution timing |
| `AuditRun.status` | Current lifecycle state |
| `AuditRun.rawData` | Full source API response for post-hoc debugging |
| `AuditRun.errorMessage` | Failure reason on FAILED runs |

---

## 12. Testing Strategy

### 12.1 E2E Tests (Playwright)

| Aspect | Detail |
|--------|--------|
| Test directory | `tests/e2e/` |
| Current coverage | `smoke.spec.ts` — 2/2 passing (page load, title, status message) |
| Run command | `npm run test:e2e` |
| Planned critical paths | Project creation, manual audit trigger, result view, Viewer access gate |
| CI status | Not yet wired to CI pipeline (no GitHub Actions or `vercel.json` integration) |

### 12.2 Performance CI (Lighthouse CI)

| Aspect | Detail |
|--------|--------|
| Configuration | `.lighthouserc.js` |
| CLI | `@lhci/cli` (dev dependency installed) |
| Target score | Performance ≥ 85 (NFR-03, SC-08) |
| Status | Configured; not yet wired to CI (no GitHub Actions workflow) |

### 12.3 Unit and Integration Tests

Not yet scaffolded. Planned:

- **Framework**: Vitest — compatible with Next.js 16; faster than Jest
  **Note**: Vitest is not yet in `package.json`. Add with `npm install -D vitest` before first use.
- **Priority unit test targets**:
  - Metric normalization functions (pure transforms; high unit test value)
  - Finding extraction and NEW/RECURRING/RESOLVED classification logic
  - Threshold evaluation (`thresholds.ts`)
- **Integration test targets**:
  - PSI service wrapper (mocked HTTP responses via Vitest/MSW)
  - Prisma query helpers (against a test DB or with Prisma mocks)

### 12.4 Security and Permission Testing

| Test Type | Priority | Notes |
|-----------|---------|-------|
| RLS policy correctness per role | High | Must verify owner isolation; cross-user data leakage (R-05 in Doc-01) |
| Viewer route guard | High | Verify Viewer cannot access admin routes or trigger audits |
| CRON_SECRET enforcement | Medium | Reject requests without valid secret |
| Server-side-only API key exposure | High | Verify no API key appears in client bundle |

### 12.5 Coverage Expectations at MVP

| Area | Approach | Expectation |
|------|---------|-------------|
| Metric normalization | Unit tests | High coverage |
| Finding extraction | Unit tests | High coverage |
| Threshold evaluation | Unit tests | High coverage |
| PSI service wrapper | Integration (mocked HTTP) | Medium coverage |
| Route Handlers | Integration | Key auth and mutation paths |
| Dashboard UI | Playwright E2E | Critical journeys only |
| RLS policies | DB-level tests | Per-role isolation verified |

---

## 13. Current State vs Planned State

| Component | Current State | What Is Needed for MVP |
|-----------|--------------|------------------------|
| Next.js App Router | Foundation home page; cron scaffold | Auth routes `(auth)/`; dashboard routes `(dashboard)/` |
| `src/proxy.ts` | Passthrough only | Session refresh; unauthenticated redirect logic |
| Supabase Auth | Client factories scaffolded; no sign-in flow | Sign-in, sign-up, callback routes wired |
| Prisma Schema | Fully defined (5 models, 5 enums); migration SQL prepared; RLS applied separately (Doc-06) | `prisma migrate dev` run after Supabase provisioned + env vars set |
| Prisma Client singleton | Not created | `src/lib/db/client.ts` with serverless-safe singleton pattern |
| PSI Service | Types + stub HTTP call | Retry logic, error handling, pipeline integration |
| GSC Service | Stub; throws if called | V1 only — do not touch at MVP |
| Cron Endpoint | CRON_SECRET validation only | V1 only: DB query + pipeline trigger |
| Rate Limiting | Limiters defined; not applied to routes | `auditRateLimit` applied in audit trigger Route Handler |
| Sentry | Config files present | DSN populated; source maps verified at build |
| PostHog | Provider wired in layout | Key populated; business events implemented at feature completion |
| Upstash Redis | Lazy init in place | Credentials populated; applied to audit route |
| Audit Pipeline | Not started | `src/lib/audit/execute.ts`, `normalize/pagespeed.ts`, `findings/pagespeed.ts`, `thresholds.ts` |
| Finding extraction | Schema has `Finding` model | Extraction logic to be implemented in `src/lib/audit/findings/` |
| Dashboard UI | Not started | Project list, project detail, run view, comparison view |
| Viewer access | `ProjectMember` model in schema (Doc-03 Gap 8) | Invitation UI; Viewer-role read-only routes; RLS member policies (Doc-06 §3.4) |
| Alert violations | `AlertViolation` model in schema (Doc-03 Gap 7) | Threshold evaluation logic in `src/lib/audit/thresholds.ts` |
| Vitest | Not installed | Install before first unit test: `npm install -D vitest` |

---

## 14. Risks / Technical Notes

| ID | Risk / Note | Severity | Status |
|----|-------------|---------|--------|
| T-01 | **Next.js 16 breaking changes**: `proxy.ts` replaces `middleware.ts`; new bundler behavior; changed APIs. Read `node_modules/next/dist/docs/` before any App Router code. | High | **Active** |
| T-02 | **Non-standard Prisma Client output path**: generated client is at `src/generated/prisma`, not `@prisma/client`. All imports must use `@/generated/prisma` or the configured alias. | Medium | **Active** |
| T-03 | **Prisma 7 datasource config**: connection URLs are **not** in `schema.prisma`. `prisma.config.ts` resolves them at CLI time. Missing `DIRECT_URL` causes `prisma migrate dev` to fail. Missing `DATABASE_URL` causes runtime errors. Set both before running migrations. | High | **Active — pending env var setup** |
| T-04 | **Upstash lazy init**: rate limiters throw at boot if `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` are missing. Do not deploy without these set. | Medium | **Active** |
| T-05 | **GSC service is non-functional**: `querySearchConsole()` throws. Do not wire it into any audit path. V1 only. | High | **Active** |
| T-06 | **PostHog non-production gate**: event capture is intentionally disabled outside production. Do not remove this gate — it prevents dev data from polluting analytics. | Low | **Active** |
| T-07 | **Multi-URL deferred to V1**: `Project` retains its single `url` field at MVP. A `SiteUrl` model (1:N from Project → URL) is a V1 migration. `AuditRun` will reference `SiteUrl.id` in V1. | Low | **Resolved (Doc-01 A-05, Doc-03 Gap 1 Option B)** |
| T-08 | **`rawData` on `AuditRun`**: `rawData Json?` stores the full PSI API response. Nullable (FAILED runs may have no response). At MVP: stores full PSI response. V1 note: if multiple sources exist per run, use a keyed object `{ "pagespeed-insights": {...} }`. | Low | **Resolved (Doc-03 Gap 2)** |
| T-09 | **`Finding` model**: 5-field model with `FindingSeverity`, `FindingCategory`, `FindingStatus` enums. `Finding.status` is nullable (null = first run, no baseline). Indexes on `(auditRunId)`, `(auditRunId, severity)`, `(auditRunId, category)`. | Low | **Resolved (Doc-03 Gap 3)** |
| T-10 | **`AlertRule` operator**: `AlertOperator` enum (`BELOW` / `ABOVE`) + `operator AlertOperator @default(BELOW)` on `AlertRule`. Strict inequality only. OQ-09 closed. | Low | **Resolved (Doc-03 Gap 4)** |
| T-11 | **`AuditRun.errorMessage`**: nullable `String?` field; populated before status is set to `FAILED`. Implementation must set `errorMessage` before transitioning status to ensure atomically consistent state. | Low | **Resolved (Doc-03 Gap 5)** |
| T-12 | **`Site` → `Project` rename**: model renamed pre-migration; `siteId` → `projectId` on all relations. All code must use `Project`, `projectId` — no references to the old `Site` / `siteId` names. | Low | **Resolved (Doc-03 Gap 6)** |
| T-13 | **Violation storage model**: `AlertViolation` dedicated model chosen (Option A). Snapshots `metricKey`, `actualValue`, `threshold`, `operator` at violation time. Pipeline-written only (service role INSERT; authenticated SELECT). Back-relations: `AuditRun.violations`, `AlertRule.violations`. See Doc-03 Gap 7. | Medium | **Resolved (Doc-03 Gap 7)** |
| T-14 | **RLS applied outside Prisma migration flow**: RLS policies were applied via Supabase SQL editor (Doc-06 §3.3), not through `prisma migrate dev`. When `prisma migrate dev` is run for the first time, verify that the migration history and applied state are consistent. Use `prisma migrate status` to check. | Medium | **Active — verify at migration time** |
| T-15 | **Vitest not yet installed**: unit and integration test tooling is planned but not in `package.json`. Install with `npm install -D vitest` before writing first unit tests. | Low | **Active** |

---

> **Document control**: This document moves to status `APPROVED` when reviewed by the
> technical lead and confirmed consistent with Doc-01 and Doc-02.
> Currently **IN REVIEW**. All pre-migration schema items (T-07 through T-13) are resolved.
> T-14 (migration history consistency with RLS applied outside Prisma) is Active — verify at migration time.
> Next blocker before `prisma migrate dev`: Supabase project provisioning and env var setup.
