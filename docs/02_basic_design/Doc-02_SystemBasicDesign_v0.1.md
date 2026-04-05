# Doc-02: System Basic Design

**Project**: SiteLens
**Version**: 0.1
**Status**: IN REVIEW — MVP decisions incorporated; pending technical lead approval
**Last Updated**: 2026-04-05
**Author**: Architecture Agent

---

## Table of Contents

1. [Overview](#1-overview)
2. [Purpose and Scope](#2-purpose-and-scope)
3. [System Context](#3-system-context)
4. [Actors and Roles](#4-actors-and-roles)
5. [Major Functional Modules](#5-major-functional-modules)
6. [Access Pattern Overview](#6-access-pattern-overview)
7. [High-Level Data Flow](#7-high-level-data-flow)
8. [Planned Integration Points](#8-planned-integration-points)
9. [Execution / Scheduling Concept](#9-execution--scheduling-concept)
10. [Constraints and Deferred Topics](#10-constraints-and-deferred-topics)
11. [Notes for Downstream Design](#11-notes-for-downstream-design)

---

## 1. Overview

SiteLens is an **internal decision-support dashboard** for website quality management.
It aggregates audit results from external tools — starting with Google PageSpeed Insights —
and presents them in a structured, traceable, and historically comparable format for
authenticated users.

This document establishes the system boundary, actor model, functional structure, and
high-level data flow at the logical level. It is implementation-aware but does not define
API routes, database schema, or directory structure — those are covered in Doc-03 and Doc-04.

All scope references align with Doc-01 (Requirements Definition). The following open
questions from Doc-01 are resolved for this MVP architecture pass:

| Doc-01 Open Question | MVP Resolution |
|----------------------|----------------|
| OQ-02 — pricing / access model | Internal tool at MVP. No public SaaS. SaaS expansion is future only. |
| OQ-03 — Viewer access mechanism | Invitation-only at MVP. No public share links. No unauthenticated views. |
| OQ-06 — single vs. multi-workspace | Single-workspace at MVP. Multi-workspace is future only. |

These resolutions are adopted in all architecture documents for the current MVP pass.
They should be formally closed in Doc-01 in a subsequent update.

---

## 2. Purpose and Scope

### 2.1 What This Document Covers

- The system boundary of SiteLens at MVP
- Who the actors are and what access level each has
- The major functional modules and how they relate
- High-level data flows for all core operations
- How data access is structured and enforced at MVP
- Which integrations are committed at MVP vs. planned for later
- What is explicitly deferred and why

### 2.2 What This Document Does Not Cover

| Topic | Covered In |
|-------|-----------|
| Database schema, field definitions, migration design | Doc-03 |
| API route conventions, request/response contracts | Doc-04 |
| Authentication flow implementation | Doc-04, Doc-06 |
| RLS policy specifications | Doc-06 |
| Security threat model | Doc-06 |
| Performance targets and optimization strategy | Doc-07 |
| Test design and coverage targets | Doc-05 |
| Operations, deployment, and monitoring runbooks | Doc-08 |

### 2.3 MVP Scope Boundaries

This document describes **MVP scope only**. The following are explicitly outside MVP:

- Scheduled audit execution (cron scaffold exists; execution logic is V1)
- Google Search Console integration (V1)
- Rich Results / Structured Data validation (V1)
- Multi-URL project support (V1)
- Notification delivery — email or webhook (V1)
- Exportable reports — PDF or HTML (V1)
- Multi-workspace / multi-organization support (Future)
- Public share links or unauthenticated views (Future)
- SaaS billing or pricing model (Future)

---

## 3. System Context

SiteLens is a web application that:

- Runs on Vercel (serverless deployment, global CDN)
- Uses Supabase (managed PostgreSQL + Auth) as its primary data layer
- Calls external audit APIs server-side only (PageSpeed Insights at MVP)
- Presents a Next.js App Router dashboard to authenticated users
- Reports errors to Sentry and emits analytics events to PostHog
- Rate-limits outbound API calls via Upstash Redis

### External Boundary Diagram

```
  [User Browser]
       │
       ▼
  [Vercel CDN / Edge]
       │
       ▼
  [Next.js Application] ──────────────────► [Supabase PostgreSQL + Auth]
       │
       ├──► [Google PageSpeed Insights API]    (MVP, server-side only)
       │
       ├──► [Google Search Console API]        (V1, server-side only — stub at MVP)
       │
       ├──► [Upstash Redis]                    (rate limiting, MVP)
       │
       ├──► [Sentry]                           (error tracking, MVP)
       │
       └──► [PostHog]                          (analytics, MVP)

  [Vercel Cron] ──► [POST /api/cron/audit]     (V1 scheduled trigger — scaffold only at MVP)
```

### Key Boundaries

- All external API calls (PSI, GSC) are **server-side only**. API keys never reach the browser.
- Supabase Auth manages identity. Sessions use HTTP-only cookies via `@supabase/ssr`.
- Upstash Redis is used **only for rate limiting** outbound PSI calls at MVP.
- PostHog and Sentry are observability outputs. They receive data from SiteLens but do not
  feed back into product logic.
- The Google Search Console service file exists in the codebase but is a stub that throws
  if called. It must not be wired into any audit path until V1 OAuth2 is implemented.

---

## 4. Actors and Roles

| Actor | Type | Access Level | Description |
|-------|------|-------------|-------------|
| Administrator | Human | Full | Primary operator. Creates and manages projects, configures integrations, manages user access, sets alert rules. |
| Analyst / Operator | Human | Full read/write on project data | Reviews audit data, triggers runs, compares historical results. Cannot modify workspace-level settings. |
| Viewer | Human | Read-only on assigned projects | A non-technical stakeholder or invited client. Views project health summaries only. Cannot trigger audits or modify data. |
| System / Scheduler | Automated | Internal only | Vercel Cron trigger for scheduled audits. V1 feature; endpoint is scaffolded at MVP. |
| External API | Service | N/A | Google PageSpeed Insights API (MVP). Responds to outbound server-side requests. |

**Fixed MVP access rules:**

- All human access requires a valid authenticated session. No unauthenticated access to any
  project data exists at MVP.
- **Viewer access is invitation-only**. An Administrator must grant Viewer access to a
  specific project. There are no public share links and no unauthenticated report views.
- The workspace is **single**. All registered users operate within the same workspace.
  No tenant separation exists at MVP.
- Roles are enforced at two independent layers: the application layer (Route Handlers,
  Server Components) and the database layer (Supabase RLS).

> **Reference**: Role definitions and permission details — Doc-01 §4.
> RLS policy specifications — Doc-06.
> Application-layer enforcement conventions — Doc-04 §5.

---

## 5. Major Functional Modules

SiteLens is organized into the following functional modules. These are logical
groupings and do not map 1:1 to files, directories, or database tables.

### 5.1 Authentication Module

Handles user sign-up, sign-in, session management, and role enforcement.

- Identity managed by Supabase Auth
- Sessions stored in HTTP-only cookies via `@supabase/ssr`
- Server-side session read via `supabase.auth.getUser()` (not `getSession()`)
- Role enforcement at the application layer; data isolation via RLS

### 5.2 Project Module

Manages the primary organizational unit of SiteLens.

- Create, view, update, and archive projects
- Each project has a name and one URL at MVP (multi-URL is V1; Doc-01 Assumption A-05)
- Project status reflects the outcome of the most recent completed audit run (FR-12)
- All audit runs, alert rules, findings, and report views are scoped to a project

### 5.3 Audit Execution Module

Controls the lifecycle of a single audit run.

- Accepts a manual trigger (from the dashboard at MVP)
- Creates an `AuditRun` record in `PENDING` status
- Calls PageSpeed Insights API server-side (with `PAGESPEED_API_KEY`)
- Stores the full raw API response as `rawData` (FR-21, NFR-30)
- Transitions status: `PENDING → RUNNING → COMPLETED / FAILED`
- On failure: populates `errorMessage` before status transition; does not discard prior data (FR-24)

### 5.4 Metric Normalization Layer

Transforms raw API responses into a consistent internal schema.

- Extracts key metrics (scores, Core Web Vitals, counts) from source-specific response formats
- Normalizes to a consistent `key / value / unit / source` structure
- Tags each metric with its canonical source identifier (e.g., `"pagespeed-insights"`)
- Decoupled from source-specific formats; adding a new source in V1 requires a new
  normalizer only, not changes to storage or dashboard logic (NFR-40)

### 5.5 Finding Extraction Layer

Derives structured, actionable findings from raw audit results.

- Extracts individual issues, warnings, and passed checks from the PSI audit items
- Assigns severity: `CRITICAL` / `WARNING` / `INFO` / `PASSED`
- Assigns category: `PERFORMANCE` / `SEO` / `ACCESSIBILITY` / `BEST_PRACTICES` / `STRUCTURED_DATA`
- Tags each finding with its source identifier (FR-80)
- Compares against the previous completed run's findings to classify as:
  `NEW` / `RECURRING` / `RESOLVED`
- First-run findings have no status (no comparison baseline; `Finding.status` is nullable)

### 5.6 Threshold and Alert Module

Evaluates user-defined alert rules against each completed audit run.

- Reads enabled `AlertRule` records for the project after each completed run
- Compares metric values against threshold conditions:
  - `BELOW`: alert when `value < threshold` (e.g., performance score < 80)
  - `ABOVE`: alert when `value > threshold` (e.g., LCP > 2500 ms)
- Records violations for dashboard display (FR-62)
- At MVP: visual indicators only; no email or webhook delivery (FR-63)
- Violation records are structured to support V1 notification delivery without schema breakage

### 5.7 Dashboard and Reporting Module

Presents stored audit data to authenticated users in structured views.

- **Project summary**: current scores, last run status, active violations, recent findings
- **Historical run list**: all runs for a project in reverse-chronological order
- **Metric comparison**: side-by-side or delta view of any two completed runs (FR-50–52)
- **Trend view**: per-metric values across all historical runs for a key
- **Source-filtered findings**: filterable by source, severity, or category (FR-42, FR-81)
- **Viewer summary**: a stripped-down read-only view for Viewer-role users (FR-71, FR-72)

All data is served from stored `Metric` and `Finding` records. No live API calls occur
during dashboard rendering.

---

## 6. Access Pattern Overview

All authenticated users access data through Server Components and Route Handlers.
No database queries are executed client-side. No credentials or raw query results
reach the browser.

| Actor | Access Pattern | Data Scope |
|-------|---------------|------------|
| Administrator | Server Components + Route Handlers (read/write) | All project data and workspace settings |
| Analyst | Server Components + Route Handlers (read/write) | All project data; cannot modify workspace settings |
| Viewer | Server Components, read-only routes only | Assigned project summary view; no admin controls |
| System / Cron | Route Handler (`POST /api/cron/audit`) | V1: projects due for scheduled audit |
| External API (PSI) | Outbound from Route Handler only | Receives audit request; returns audit response |

### Enforcement Layers

**Layer 1 — Application layer** (Route Handlers, Server Components):

- Every route that reads or modifies data must verify a valid session (`getUser()`)
- Mutations verify that the requesting user owns the target resource
- Viewer routes check the Viewer role assignment before rendering

**Layer 2 — Database layer** (Supabase RLS):

- Authoritative isolation gate; enforces `auth.uid() = userId` on all queries
- Active regardless of application-layer checks (defense-in-depth)
- Server-side Prisma and service-role client **bypass RLS** — application-layer
  ownership checks are therefore mandatory for all server-side mutations

### Fixed Access Constraints at MVP

- No unauthenticated access path exists.
- No public project URL or share token exists.
- Viewer access requires invitation by an Administrator; the exact invitation mechanism
  (user registration + role assignment) is to be defined in Doc-06.
- The `PAGESPEED_API_KEY` is server-side only and must never appear in client-side bundles.

---

## 7. High-Level Data Flow

### 7.1 Project Registration

```
1. Administrator or Analyst submits project name + target URL
2. Route Handler validates input and verifies auth
3. Prisma Client creates Project record (userId = auth.uid())
4. Project is now visible in the project list for that user
```

### 7.2 Manual Audit Trigger (MVP)

```
1.  User clicks "Run Audit" on a project URL in the dashboard
2.  Route Handler (POST /api/audits) verifies auth and applies auditRateLimit
3.  Audit Execution Module creates AuditRun record (status: PENDING)
4.  Module calls PageSpeed Insights API (server-side, PAGESPEED_API_KEY)
5.  AuditRun.status updated to RUNNING
6.  PSI response received → stored as rawData on AuditRun (Json field)
7.  Metric Normalization Layer extracts and persists normalized Metric records
8.  Finding Extraction Layer extracts and persists Finding records
      → Compares against previous completed run's findings
      → Sets Finding.status (NEW / RECURRING / RESOLVED) on each finding
      → First run: Finding.status remains null (no baseline)
9.  Threshold Module evaluates enabled AlertRules → records any violations
10. AuditRun.status updated to COMPLETED
11. Dashboard reflects new state on next read (no real-time push at MVP)
```

**On any failure after step 3:**

```
- AuditRun.errorMessage populated with failure reason
- AuditRun.status set to FAILED
- Previously stored Metric / Finding records from prior runs are not modified
- Run is retriggerable by the user
```

### 7.3 Dashboard Read Path

```
1. Authenticated user opens a project page
2. Server Component reads from DB:
   - Most recent COMPLETED AuditRun for the project
   - Metric records for that run
   - Finding records for that run (filterable by severity / category)
   - Active alert violations
3. Renders project summary view
4. No live API call during rendering — all data is from stored records
```

### 7.4 Historical Comparison

```
1. User selects two completed AuditRun records for the same project
2. Server Component reads Metric records for both runs
3. Renders a delta view: metrics that improved / degraded / unchanged
4. Optional trend chart: reads all historical Metric records for a given key
```

### 7.5 Viewer Read Path

```
1. Viewer is granted access to a project by an Administrator (invitation-only)
2. Viewer authenticates and navigates to the project read-only view
3. Application layer verifies Viewer role assignment for that project
4. RLS independently enforces access to assigned project data only
5. Viewer sees: current health summary, latest findings, active violations
6. Viewer cannot: trigger audits, modify data, see raw API responses or system internals
```

There are no unauthenticated report URLs. There are no public share links at MVP.

### 7.6 Alert Threshold Evaluation (Post-Run)

```
1. After AuditRun reaches COMPLETED, Threshold Module runs:
2. Reads all enabled AlertRules for the project
3. For each rule:
   - Looks up the corresponding Metric value from the just-completed run
   - Applies operator:
       BELOW: fires if metric value < threshold
       ABOVE: fires if metric value > threshold
4. Records each violation
5. Dashboard surfaces violations as visual indicators on next read
```

No notifications are sent at MVP. Violation records are structured for V1 delivery.

### 7.7 Scheduled Audit Trigger (V1 — Not MVP)

```
1.  Vercel Cron fires at configured interval → POST /api/cron/audit
2.  Handler validates Authorization: Bearer {CRON_SECRET}
3.  Handler queries DB for projects with scheduled audits due
4.  For each due project URL: creates AuditRun (PENDING)
5.  Proceeds as in §7.2 steps 4–10 above
```

The cron endpoint is scaffolded at MVP. It validates the secret but has no
business logic. Scheduling metadata is not yet in the schema.

---

## 8. Planned Integration Points

| Integration | Phase | Direction | Notes |
|-------------|-------|-----------|-------|
| Google PageSpeed Insights API | **MVP** | Outbound, server-side | Primary audit source. Requires `PAGESPEED_API_KEY`. ~25,000 req/day free tier. |
| Supabase Auth | **MVP** | Bidirectional | Session cookies via `@supabase/ssr`. |
| Supabase PostgreSQL | **MVP** | Server-side | Via Prisma ORM. Pooled (runtime) + direct (migrations). |
| Upstash Redis | **MVP** | Outbound, server-side | Rate limiting only. Prevents PSI cost runaway. |
| Sentry | **MVP** | Outbound | Auto-instrumented error tracking. Config present; DSN needed. |
| PostHog | **MVP** | Outbound (browser + server) | Pageview and key-event analytics. Provider wired in layout. |
| Vercel Cron Jobs | MVP scaffold / **V1 logic** | Inbound, scheduled | CRON_SECRET validated; no business logic at MVP. |
| Google Search Console API | **V1** | Outbound, server-side | OAuth2 service account. Stub file exists; throws if called. |
| Rich Results / Structured Data | **V1** | TBD | Source and integration scope not yet decided. |
| Lighthouse CI | **Future candidate** | CI pipeline | May supplement PSI for CI/CD workflows. Not committed. |
| Third-party SEO tool imports | **Future candidate** | Import | CSV/JSON import. Not committed. |

---

## 9. Execution / Scheduling Concept

### 9.1 MVP: Manual Trigger Only

At MVP, all audit runs are triggered manually by an Analyst or Administrator via
the dashboard. No automated scheduling is active or configurable.

The `/api/cron/audit` endpoint is scaffolded and ready for V1 activation:

- `POST`: validates `Authorization: Bearer {CRON_SECRET}` → returns `{ ok: true }`
- `GET`: health check → returns `{ status: "scaffold" }`
- No DB queries or audit pipeline calls at MVP

### 9.2 V1: Scheduled Runs (Planned)

When scheduling is activated in V1:

1. Projects gain scheduling fields (cadence, `nextRunAt`, `schedulingEnabled`) via a V1 migration
2. `vercel.json` gains a Cron schedule pointing to `POST /api/cron/audit`
3. The cron handler queries DB for projects due for their next scheduled run
4. For each due project: creates `AuditRun` record, invokes the same pipeline as manual triggers

**Design decision deferred to V1**: Whether scheduling metadata lives on the `Project`
model directly or in a separate `ScheduleConfig` model.

### 9.3 Cron Security

- Only requests with a valid `CRON_SECRET` in `Authorization: Bearer` are accepted
- Vercel Cron automatically includes this header when configured via `vercel.json`
- All other requests are rejected with HTTP 401
- The secret must be set in Vercel environment variables and in `.env.local`

---

## 10. Constraints and Deferred Topics

### 10.1 Fixed MVP Constraints

The following are fixed for MVP and must not be assumed otherwise in downstream design:

| Constraint | Detail |
|-----------|--------|
| **Single-workspace** | All users share one workspace context. No tenant separation at MVP. |
| **Internal tool** | SiteLens is an internal tool at MVP. No SaaS billing, no public user signup, no multi-tenant model. |
| **Invitation-only Viewer access** | Viewers are granted access by an Administrator. No public share links. No unauthenticated access. |
| **PSI-only committed source** | PageSpeed Insights API is the only committed audit source at MVP. |
| **One URL per project** | Multi-URL support (FR-11) is deferred to V1 (Doc-01 A-05). |
| **Manual audit trigger only** | Scheduled runs are V1. No automated scheduling at MVP. |
| **Visual violations only** | No email/webhook notification delivery at MVP (FR-63). |

### 10.2 Intentionally Deferred Topics

| Topic | Deferred To |
|-------|------------|
| Database schema details | Doc-03 |
| API route conventions | Doc-04 |
| Authentication flow implementation | Doc-04, Doc-06 |
| Viewer invitation mechanism | Doc-06 §3.5 ✅ Defined |
| RLS policy definitions | Doc-06 §3.2–3.4 ✅ Defined |
| Notification delivery (email / webhook) | V1 |
| Multi-URL project structure | V1 migration (Doc-01 A-05) |
| Scheduled audit execution | V1 |
| Google Search Console integration | V1 |
| Rich Results validation | V1 |
| PDF / HTML export generation | V1 |
| Mobile-responsive layout | V1 |
| Violation model (inline vs. separate table) | ✅ Resolved — `AlertViolation` model (Doc-03 Gap 7) |
| Multi-workspace / multi-organization | Future |
| Public share links | Future |
| SaaS billing and pricing | Future |
| Advanced role hierarchy | Future |

---

## 11. Notes for Downstream Design

Notes to reduce ambiguity for agents working on downstream documents.

### 11.1 For Doc-03 (Database Detail Design)

- **Violation storage** — ✅ Resolved (Doc-03 Gap 7). A dedicated `AlertViolation` model
  (Option A) was chosen. It snapshots `metricKey`, `actualValue`, `threshold`, and `operator`
  at violation time. Pipeline-written only (service role); `authenticated` SELECT only.
  Back-relations: `AuditRun.violations`, `AlertRule.violations`.
- `Finding.status` is nullable by design (null = first run; no baseline to compare against).
- Scheduling fields (`cadence`, `nextRunAt`, `schedulingEnabled`) are V1 only.
  Do not add them to the MVP schema.

### 11.2 For Doc-04 (Technical Architecture)

- The audit pipeline (§7.2 steps 4–10) must be implemented as a discrete, testable
  service function — not inline inside a Route Handler.
- The planned directory structure is: `src/lib/audit/` → `execute.ts`, `normalize/`,
  `findings/`, `thresholds.ts`.
- Prisma Client singleton location: `src/lib/db/client.ts` (planned, not yet created).

### 11.3 For Doc-06 (Security Design)

- Single-workspace simplifies RLS: baseline policies are owner-based (`userId = auth.uid()`).
- Viewer role enforcement requires both an application-layer route guard **and** RLS.
- **Viewer invitation mechanism — ✅ Defined in Doc-06 §3.5.** Mechanism: Administrator inserts
  a `ProjectMember` row for an existing user. Member-path RLS policies (Doc-06 §3.4) grant
  the invited user read access to the assigned project and its audit data.
- No unauthenticated access path exists at MVP. Confirmed in Doc-06 §6.
- Member extension RLS policies (Doc-06 §3.4) are not yet applied to Supabase — must be
  applied before Viewer invitation UI is built.

### 11.4 For Doc-05 (Test Design)

- Smoke tests (Playwright, 2/2 passing) cover the foundation page.
- Critical test paths to add: project creation, manual audit trigger, finding view, Viewer access gate.
- Metric normalization and finding extraction are pure transform functions well-suited to unit tests.
- RLS policy correctness requires explicit per-role database-level tests.

---

> **Document control**: This document moves to status `APPROVED` when reviewed by the
> technical lead and confirmed consistent with Doc-01.
> Currently **IN REVIEW**. Doc-01 open questions OQ-02, OQ-03, and OQ-06 are resolved
> for this MVP architecture pass and should be formally closed in Doc-01 in a future update.
