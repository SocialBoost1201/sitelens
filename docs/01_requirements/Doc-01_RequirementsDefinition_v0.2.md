# Doc-01: Requirements Definition

**Project**: SiteLens
**Version**: 0.2
**Status**: REFINED DRAFT — implementation reality alignment applied 2026-06-17 (supersedes 2026-04-10 scope where noted)
**Last Updated**: 2026-06-17
**Author**: Requirements Agent (Antigravity); 2026-06-17 reconciliation via implementation review

---

## Table of Contents

1. [Document Purpose](#1-document-purpose)
2. [Background and Business Objective](#2-background-and-business-objective)
3. [Product Goal](#3-product-goal)
4. [Target Users](#4-target-users)
5. [User Problems to Solve](#5-user-problems-to-solve)
6. [Core Use Cases](#6-core-use-cases)
7. [Scope Definition](#7-scope-definition)
8. [Functional Requirements](#8-functional-requirements)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Data Source Scope](#10-data-source-scope)
11. [Success Criteria](#11-success-criteria)
12. [Risks and Open Questions](#12-risks-and-open-questions)
13. [Glossary](#13-glossary)

---

## 1. Document Purpose

This document defines the requirements for SiteLens — a unified website analysis
and audit dashboard. It establishes:

- Why SiteLens exists and what problem it solves
- Who the intended users are and what they need
- What the product must do (functional requirements)
- What constraints it must satisfy (non-functional requirements)
- What is explicitly out of scope
- What success looks like at MVP

This document is the authoritative requirements reference for subsequent design,
technical architecture, and implementation decisions. All downstream documents
(Doc-02 through Doc-08) should be consistent with the scope defined here.

---

## 2. Background and Business Objective

### 2.1 The Problem

Website quality assessment currently requires operating multiple disconnected tools:

- **Google PageSpeed Insights / Lighthouse** — Performance and Core Web Vitals
- **Google Search Console** — Organic search visibility, indexing, and crawl health
- **Rich Results Test / Schema Markup Validator** — Structured data validation
- **Uptime monitors** — Availability and response time
- **Manual reports** — Custom export and compilation

Each tool uses a different interface, login, data format, and cadence. Audit results
live in separate silos. There is no single place to:

- See the combined health of a site across all signals
- Track how any metric has changed over time
- Compare the relative severity of issues across categories
- Quickly produce a structured summary for a team or client

This fragmentation increases time-to-insight, creates blind spots, and makes regular
reporting slow and manual.

### 2.2 Business Objective

SiteLens aims to consolidate website audit signals into a single, consistent
dashboard that:

- Reduces the operational overhead of monitoring multiple tools
- Makes cross-signal trend analysis fast and accessible
- Supports structured internal and client-facing reporting
- Enables proactive issue detection before signals deteriorate further

### 2.3 Who Benefits

- **Freelance web consultants** managing audit workflows for multiple clients
- **In-house digital teams** responsible for site quality and SEO health
- **Agencies** needing to report website performance data to clients
- **Technical operators** who need a consolidated view of signals without switching tools

---

## 3. Product Goal

### 3.1 What SiteLens Is

SiteLens is a **decision-support dashboard** for website quality management. It:

- Aggregates audit results from multiple sources into one place
- Tracks historical changes in key metrics over time
- Surfaces issues, threshold violations, and regressions clearly
- Supports structured reporting views for internal or client use
- Organizes audits by project (one or more URLs per project)

### 3.2 What SiteLens Is Not

SiteLens is not:

- A replacement for the underlying tools (Lighthouse, GSC, Rich Results Test)
- An SEO crawler or link auditor (no Screaming Frog / Ahrefs parity)
- An AI auto-remediation engine
- A CMS or website builder
- A competitive intelligence platform
- A full enterprise analytics suite
- A real-time uptime monitoring system (at MVP)

### 3.3 Strategic Product Realignment Addendum (2026-04-10)

This addendum supersedes earlier wording when conflicts exist.

**Updated product definition:**

SiteLens is a unified search visibility and site intelligence platform that
connects site quality signals with search and local visibility outcomes.

**Updated product framing:**

- Core: Website Health + Search Visibility
- Extension layers: Local Visibility (GBP) + Impact/Outcomes (GA4)
- Future advanced layer: GEO / AI-search visibility

**Positioning guardrail:**

GBP is a Local SEO support module and must not be represented as a primary MVP
identity pillar.

---

## 4. Target Users

### Role: Administrator

| Attribute | Description |
|-----------|-------------|
| Who | The owner or primary operator of a SiteLens workspace |
| Technical level | Medium to high |
| Primary goals | Register projects, configure integrations, manage user access, set alert thresholds |
| Access | Full — all features and settings |

### Role: Analyst / Operator

| Attribute | Description |
|-----------|-------------|
| Who | A team member or consultant actively reviewing and working with audit data |
| Technical level | Medium |
| Primary goals | Run audits, review findings, compare historical results, track issues |
| Access | Full read/write access to project data; cannot manage workspace settings |

### Role: Viewer (Stakeholder / Client)

| Attribute | Description |
|-----------|-------------|
| Who | A client, manager, or non-technical stakeholder who needs to see results |
| Technical level | Low |
| Primary goals | View summary status, review reports, understand trend direction |
| Access | Read-only; limited to assigned projects |

> **Assumption [A-01]**: Initial MVP supports only a single-workspace model.
> Multi-tenant / multi-organization support is a future concern.

> **Assumption [A-04]**: The current Prisma schema uses `Site` as the model name
> for what this document calls "Project." This is a pre-migration naming decision.
> Before the first migration, the team must decide whether to rename the model to
> `Project` or to document `Site` as the internal identifier with "Project" as the
> user-facing label. All downstream documents (Doc-02, Doc-04) use "Project" to
> match this document's terminology.

> **Assumption [A-05]**: MVP supports **one URL per project**. Multi-URL support
> (FR-11) is deferred to V1. This resolves schema Gap 1 (Doc-03) as Option B —
> the single `url` field on `Site` is retained at MVP. A `SiteUrl` model (1:N
> from Project → URL) will be introduced in the V1 schema migration. When that
> migration runs, `AuditRun` will reference a `SiteUrl` ID to track which specific
> URL was audited.

---

## 5. User Problems to Solve

| ID | Problem |
|----|---------|
| P-01 | Audit results are scattered across multiple tools and require manual collation |
| P-02 | There is no consistent view of how a site's quality signals change over time |
| P-03 | Threshold violations (e.g., score drops below 80) are not detected automatically |
| P-04 | Preparing a structured report for a client or manager requires significant manual effort |
| P-05 | It is difficult to know which issues are new, regressed, or unchanged across audit runs |
| P-06 | Comparing multiple pages or URLs within a project has no unified interface |
| P-07 | Analysts have no efficient way to see the relative severity of issues across categories |
| P-08 | Teams cannot easily share findings or status with non-technical stakeholders |

---

## 6. Core Use Cases

### UC-01: Register a Project

An Administrator registers a new project in SiteLens by providing a project name
and one or more target URLs. The project becomes the organizational unit for all
subsequent audit runs and results.

**Actors**: Administrator
**Outcome**: Project exists in the system with at least one tracked URL.

---

### UC-02: Trigger or Import an Audit Run

An Analyst initiates an audit for a project. For MVP, this may be triggered
manually or via a scheduled integration. The system fetches or receives data
from the configured source (e.g., PageSpeed Insights API) and stores a timestamped
audit result.

**Actors**: Analyst, Administrator
**Outcome**: A new audit run record exists for the project, with associated metrics.

---

### UC-03: View Latest Audit Status

An Analyst or Viewer opens a project and sees the most recent audit result:
summary scores, key metrics, and a categorized list of current findings.

**Actors**: Analyst, Viewer
**Outcome**: User understands the current health state of the project.

---

### UC-04: Compare Historical Audit Runs

An Analyst selects two or more audit runs for the same project and views a
side-by-side or trend comparison. Changes in scores and metrics are highlighted.

**Actors**: Analyst
**Outcome**: User understands how the site has changed between specific points in time.

---

### UC-05: Review Source-Specific Findings

An Analyst filters the findings view by data source (e.g., Lighthouse only,
or Search Console only) to investigate issues from a specific tool.

**Actors**: Analyst
**Outcome**: User can isolate and review findings from a specific audit source.

---

### UC-06: Detect Threshold Violations

The system evaluates audit results against user-defined thresholds (e.g.,
Performance score < 80, LCP > 2.5s). When a violation is detected, it is
surfaced prominently in the dashboard and optionally triggers a notification.

**Actors**: System (automated), Analyst
**Outcome**: Users are made aware of meaningful degradations without manual review.

---

### UC-07: Review a Structured Issue Summary

An Analyst or Viewer opens a structured summary of all current issues for a
project, grouped by severity and category. This view is suitable for use in
reporting or decision-making.

**Actors**: Analyst, Viewer
**Outcome**: User has a consolidated, structured list of actionable issues.

---

### UC-08: Prepare a Reporting View

An Analyst generates a shareable or exportable summary of a project's audit
status for internal or client use. At MVP, this may be a read-only view link
or a printable page.

**Actors**: Analyst, Administrator
**Outcome**: A structured, presentable view of project health is available for sharing.

---

## 7. Scope Definition

### 7.0 Strategic Scope Override (2026-04-10)

This section updates MVP scope discipline for product realignment. When this
section conflicts with older MVP wording, this section takes precedence.

**MVP must include:**

- Website Health core (audit runs, findings, CWV/SEO/security/broken links)
- Search Visibility core (narrow): GSC daily metrics + tracked keywords +
  basic ranking snapshots
- Core reporting and in-app alert baseline

**MVP must exclude:**

- GA4 integration
- GBP as a primary navigation pillar
- Local map ranking / MEO ranking
- GEO visibility analysis
- Advanced causation modeling

**Post-MVP extensions:**

- Local SEO module maturation (GBP)
- GA4 outcomes module
- Stronger comparison transform layers

### 7.0.1 Implementation Reality Alignment (2026-06-17)

This section reconciles the requirements with what has actually been **implemented and
verified in the codebase** as of 2026-06-17. When it conflicts with earlier scope wording
(including §7.0, §7.2, §7.3, §7.4), **this section takes precedence**. It does not change
scoring logic, evaluation thresholds, or data-parsing rules; it only re-classifies scope to
match the shipped product.

> Rationale: the build has moved well past the original narrow MVP. Several capabilities
> previously listed as Future (§7.3) or Out of Scope (§7.4) are now shipped, and the
> requirements must reflect that to remain the authoritative reference.

#### A. Promoted into committed scope (previously Future / Out of Scope)

| Capability | Prior status | New status | Implementation evidence |
|------------|-------------|-----------|-------------------------|
| **Competitor benchmarking** (you-vs-competitor) | §7.4 Out of Scope | **In scope** | `Competitor` model; `/dashboard/[id]/competitors`; `/api/projects/[id]/competitors` |
| **Uptime monitoring** (periodic HEAD-check; UP / DEGRADED / DOWN) | §7.3 Future / §7.4 (real-time) | **In scope** (periodic, **not** sub-minute) | `UptimeMonitor`/`UptimeEvent` models; `/dashboard/[id]/uptime`; `/api/cron/uptime` |
| **GEO / AI-search visibility** | §3.3 future advanced layer; §7.0 MVP-excluded | **In scope** | `GeoResult` model; `geo-analyzer.ts`; `/dashboard/[id]/geo`; `/api/projects/[id]/geo` |
| **Broken-link auditing** (recursive crawl) | §7.4 (full SEO crawler excluded) | **In scope** (link-status crawl only; full link-graph still excluded) | `link-checker.ts`; `/dashboard/[id]/links` |

#### B. Newly built modules not previously specified

| Capability | Status | Implementation evidence |
|------------|--------|-------------------------|
| **Animation / motion profiler** (load / hover / scroll capture + comparison) | **In scope (shipped)** | `AnimationResult`; `animation-analyzer.ts`; `animation-comparison.ts`; `/dashboard/[id]/animation` |
| **Page crawl inventory** (discovered URL list) | **In scope (shipped)** | `/dashboard/[id]/pages`; `crawler.ts` |
| **Cross-axis "Site Health"** (unified overview across axes) | **In scope (shipped)** | `site-health.tsx` on project overview |
| **Security headers audit** (OWASP rules, A+–F grade) | In scope (already implied by §7.0) | `SecurityResult`; `security-scanner.ts`; `/dashboard/[id]/security` |

#### C. V1 features (§7.2) now implemented

- Scheduled audit runs — `/api/cron/audit`, plus `/api/cron/audit-recovery` (retry/recovery)
- Google Search Console surfacing — `search-console.ts` + `seo/search-console-panel.tsx`
- Webhook notifications on events — Slack / Discord / generic via `notifier.ts`
- Auto-audit on deploy/push — `/api/webhooks/vercel`, `/api/webhooks/github` (fail-closed signature verification)
- Read-only shareable report view — `/share/[slug]` (with optional expiry)
- Weekly digest report — `/api/cron/weekly-report`; `/dashboard/[id]/report`
- Google Business Profile (Local SEO support module) — OAuth connect/sync; `/dashboard/[id]/gbp`
  (per §3.3 guardrail, GBP remains a support module, **not** a primary identity pillar)

#### D. Still pending (NOT yet implemented — do not represent as done)

| Item | Status / constraint |
|------|--------------------|
| Tracked keywords + ranking snapshots (§7.0 "Search Visibility core") | **Not implemented** — no keyword/ranking model or code present |
| MEO / local-map **score** (0–100) | **Not implemented** — GBP shows raw metrics only; a scoring model is **approval-gated** (do not invent) |
| Finding diff state (NEW / RECURRING / RESOLVED) cross-run wiring | **Partial** — `FindingStatus` enum + first-run scaffold exist; comparison-run population not confirmed |
| Multi-URL per project (FR-11) | **Deferred to V1** as originally planned (one URL per project today) |
| Error tracking via Sentry (NFR-70) | **Not implemented** — only PostHog present |
| Silent-failure hardening (FR-24 / NFR-52) | **Partial** — some swallowed errors remain |

#### E. Items that remain explicitly out of scope (unchanged)

- Full SEO crawler with link-graph / crawl-budget analysis
- Real-time **sub-minute** uptime checks
- AI auto-remediation; CMS/website builder
- Enterprise multi-tenant billing
- Full Lighthouse CLI parity (PSI remains the source)

### 7.1 MVP Scope

The MVP must be narrow, buildable, and verifiable. It must include only what is
necessary to deliver core value.

**MVP includes:**

- User authentication (Supabase Auth — email/password)
- Project registration (name + one URL per project at MVP)
- Manual trigger of Lighthouse / PageSpeed Insights audit runs via API
- Storage and display of audit run results (timestamped)
- Latest audit status view per project
- Historical run list per project
- Basic metric comparison between two runs
- Source-tagged findings view (categorized by type)
- Simple threshold rules (score-based) with visual violation indicators
- Role-based access: Administrator, Analyst, Viewer
- Read-only shareable project view (Viewer role)

**MVP excludes everything in sections 7.3 and 7.4.**

> **Note [N-01]**: Multi-URL support per project (FR-11) is a **V1 feature**, not
> MVP. The MVP schema supports one URL per project. This is the recommended
> resolution for schema Gap 1 (Doc-03). See Assumption A-05.

---

### 7.2 V1 Extension Scope

After MVP is validated, the next layer adds:

- Scheduled audit runs (configurable cadence per project)
- Google Search Console integration (impressions, clicks, index coverage)
- Rich Results / Structured Data validation integration
- Email or webhook notification on threshold violation
- **Multi-URL support per project** (FR-11) — multiple URLs tracked and audited per project, with per-URL run history
- Multi-URL comparison within a project
- Exportable report (PDF or structured HTML)
- Dashboard overview across all projects (portfolio view)
- Audit run tagging (e.g., "pre-launch", "post-deploy")

---

### 7.3 Future Expansion (Not Committed)

These are candidates for consideration after V1, subject to user validation and
product priority decisions:

- Multi-organization / multi-tenant workspace model
- Uptime / availability monitoring integration
- Third-party tool integrations (Ahrefs, Semrush, Screaming Frog export import)
- Custom metric definitions and scoring
- AI-assisted issue prioritization or explanation
- White-label reporting for agencies
- API access for external consumers

---

### 7.4 Explicitly Out of Scope

The following are not in scope at any point in the current product definition:

| Item | Reason |
|------|---------|
| Full SEO crawler (link graph, crawl budget) | Requires infrastructure and scope far beyond this product |
| AI auto-remediation (auto-fixing detected issues) | Not validated; high complexity; risk of unintended site changes |
| CMS replacement or content management | Out of domain |
| Enterprise billing and multi-tenant SaaS | Premature; not part of current product definition |
| ~~Competitive intelligence (competitor benchmarking)~~ → **moved IN SCOPE, see §7.0.1** | Implemented as you-vs-competitor benchmarking (2026) |
| Real-time monitoring (**sub-minute** uptime checks) | Sub-minute checks remain out of scope; **periodic HEAD-check uptime is now in scope** (§7.0.1) |
| Full Lighthouse CLI parity | CLI remains the source; SiteLens consumes results, not replicates behavior |

---

## 8. Functional Requirements

### 8.1 Authentication and Access

| ID | Requirement |
|----|-------------|
| FR-01 | The system must support user sign-up and sign-in via email and password. |
| FR-02 | The system must support at least three roles: Administrator, Analyst, Viewer. |
| FR-03 | Role permissions must be enforced server-side; client-side rendering differences are secondary. |
| FR-04 | Viewer-role users must not be able to trigger audits, modify projects, or access settings. |
| FR-05 | Sessions must expire and require re-authentication after a configurable period. |

### 8.2 Project Management

| ID | Requirement |
|----|-------------|
| FR-10 | An Administrator or Analyst must be able to create a project with a name and at least one URL. |
| FR-11 | A project must support multiple URLs per project (e.g., homepage, specific landing pages). **[V1 — MVP supports one URL per project; see Assumption A-05 and Doc-03 Gap 1]** |
| FR-12 | A project must have a visible status reflecting the result of its most recent audit run. |
| FR-13 | Projects must be listable in a summary view. |
| FR-14 | An Administrator must be able to archive or delete a project. |

### 8.3 Audit Run Management

| ID | Requirement |
|----|-------------|
| FR-20 | An Analyst or Administrator must be able to manually trigger an audit run for a project URL. |
| FR-21 | Each audit run must be stored with: source, target URL, timestamp, raw source API response (as JSON), and derived metrics. |
| FR-22 | Audit runs must be listable in reverse-chronological order per project. |
| FR-23 | The system must track the run status: pending, running, completed, failed. |
| FR-24 | Failed audit runs must record an error reason and not silently discard data. |

### 8.4 Metric Normalization

| ID | Requirement |
|----|-------------|
| FR-30 | The system must normalize key metrics from each supported source into a consistent internal schema. |
| FR-31 | Normalized metrics must include: numeric score (0–100 where applicable), raw value, unit, and source tag. |
| FR-32 | Source-specific raw data must also be retained alongside normalized data for traceability. |

### 8.5 Findings and Issue Tracking

| ID | Requirement |
|----|-------------|
| FR-40 | Each audit run must produce a structured list of findings (issues, warnings, passed checks). |
| FR-41 | Findings must be categorized by: severity (critical / warning / info / passed), category (performance / seo / accessibility / best-practices / structured-data), and source. |
| FR-42 | Findings from a run must be viewable in a filterable list. |
| FR-43 | The system must indicate whether a finding is new, recurring, or resolved compared to the previous run. |

### 8.6 Historical Comparison

| ID | Requirement |
|----|-------------|
| FR-50 | A user must be able to select any two completed audit runs for the same URL and view a metric comparison. |
| FR-51 | The comparison view must highlight metrics that have improved, degraded, or remained unchanged. |
| FR-52 | A trend chart must be available per metric showing values across all historical runs. |

### 8.7 Threshold Rules and Alerts

| ID | Requirement |
|----|-------------|
| FR-60 | An Administrator or Analyst must be able to define threshold rules per project URL (e.g., "Performance score must be ≥ 80"). |
| FR-61 | The system must evaluate threshold rules after each audit run completes. |
| FR-62 | Violations must be surfaced visually on the project dashboard with clear indication of which rule was breached. |
| FR-63 | At MVP, notification delivery (email/webhook) is not required but the violation record must exist for V1 integration. |

### 8.8 Dashboard and Reporting Views

| ID | Requirement |
|----|-------------|
| FR-70 | Each project must have a summary dashboard showing: current scores, last run time, active violations, and recent findings. |
| FR-71 | The system must provide a Viewer-accessible read-only project view suitable for sharing with clients or stakeholders. |
| FR-72 | The read-only view must not expose system internals, raw API responses, or user account information. |

### 8.9 Audit Source Tagging

| ID | Requirement |
|----|-------------|
| FR-80 | Every audit result, metric, and finding must carry a source tag identifying its origin (e.g., "lighthouse", "pagespeed-insights", "search-console"). |
| FR-81 | Users must be able to filter dashboard views by source. |

---

## 9. Non-Functional Requirements

### 9.1 Performance

| ID | Requirement |
|----|-------------|
| NFR-01 | Dashboard pages must load and render within 2 seconds under normal conditions (non-audit-trigger pages). |
| NFR-02 | Audit result pages must be available for view within 5 seconds of a completed run. |
| NFR-03 | The application must achieve a Lighthouse Performance score ≥ 85 on its own pages. |
| NFR-04 | API responses for read operations must complete within 500ms at p95. |

### 9.2 Security

| ID | Requirement |
|----|-------------|
| NFR-10 | All data access must be gated by authenticated sessions. No data may be accessible without authentication except explicitly shared read-only views. |
| NFR-11 | API keys and credentials must never be stored in source code or client-side code. All secrets via environment variables. |
| NFR-12 | Input from users must be validated server-side before processing. |
| NFR-13 | Database access must enforce Row-Level Security (RLS) policies at the Supabase layer. |
| NFR-14 | The application must use HTTPS exclusively in all environments except local development. |

### 9.3 Reliability

| ID | Requirement |
|----|-------------|
| NFR-20 | The application must target 99.5% monthly uptime for production (excluding planned maintenance). |
| NFR-21 | Audit run failures must not result in data loss of previously stored results. |
| NFR-22 | A failed audit run must be recoverable (retriggerable) without data corruption. |

### 9.4 Audit Traceability

| ID | Requirement |
|----|-------------|
| NFR-30 | All audit runs must retain the original raw response from the source API for the retention period. |
| NFR-31 | Retention period for raw audit data: minimum 90 days at MVP (configurable later). |
| NFR-32 | All system-level events (run triggered, run completed, run failed, threshold violated) must be logged. |

### 9.5 Maintainability

| ID | Requirement |
|----|-------------|
| NFR-40 | New data sources must be addable without requiring changes to core dashboard logic. |
| NFR-41 | The codebase must maintain TypeScript strict mode with no suppressed type errors. |
| NFR-42 | All environment-specific configuration must be externalized to environment variables. |

### 9.6 Usability

| ID | Requirement |
|----|-------------|
| NFR-50 | The dashboard must be fully functional on modern desktop browsers (Chrome, Firefox, Safari, Edge). |
| NFR-51 | Mobile layout is not required at MVP but must not be actively broken. |
| NFR-52 | Error states (failed runs, missing data, API errors) must present meaningful user-facing messages. |

### 9.7 Scalability

| ID | Requirement |
|----|-------------|
| NFR-60 | The data model must support at least 100 projects and 1,000 audit runs per project without schema changes. |
| NFR-61 | Architecture must not assume a fixed single-user context; multi-user workspace must be structurally possible from day one. |

### 9.8 Observability

| ID | Requirement |
|----|-------------|
| NFR-70 | Runtime errors must be captured and reported to an error tracking service (Sentry). |
| NFR-71 | Key user actions (audit triggered, project created, report viewed) must emit analytics events (PostHog). |
| NFR-72 | Application logs must be structured and accessible in the hosting environment (Vercel logs). |

---

## 10. Data Source Scope

### 10.1 MVP Sources (Committed)

| Source | Integration Type | Notes |
|--------|-----------------|-------|
| Google PageSpeed Insights API | Direct API call (server-side) | Wraps Lighthouse; free tier; requires API key |

**Note**: PageSpeed Insights API is the primary MVP source. It provides
Performance, Accessibility, Best Practices, and SEO scores, plus Core Web
Vitals (LCP, CLS, INP) and structured audit findings. This covers the
majority of Lighthouse output without requiring local Lighthouse CLI setup.

### 10.2 V1 Sources (Planned, Not Committed)

| Source | Integration Type | Notes |
|--------|-----------------|-------|
| Google Search Console API | OAuth2 service account | Requires GSC property verification by user |
| Rich Results Test (via Search Console) | API or manual import | Validation scope TBD |

### 10.3 Future Candidates (Not Planned)

| Source | Notes |
|--------|-------|
| Lighthouse CI (self-hosted) | May replace or supplement PSI for CI/CD pipelines |
| Third-party SEO tool exports (CSV/JSON import) | Ahrefs, Semrush export files — import only |
| Uptime monitoring APIs | Separate concern; integration TBD |
| Web Vitals (CrUX field data) | Chrome UX Report; real-user data supplement |

> **Assumption [A-02]**: The PageSpeed Insights API free tier provides 25,000
> requests per day per project. For MVP usage patterns this is sufficient.
> If usage exceeds this, API quota management becomes a requirement.

> **Assumption [A-03]**: Google Search Console integration requires OAuth2
> service account setup by the workspace Administrator. This is a non-trivial
> onboarding step and is deferred to V1.

---

## 11. Success Criteria

The MVP is considered successful when all of the following are observable:

| ID | Criterion |
|----|-----------|
| SC-01 | An Administrator can register a project with one or more URLs without developer intervention. |
| SC-02 | An Analyst can trigger a Lighthouse/PSI audit run and see results within 30 seconds of completion. |
| SC-03 | Audit results persist across sessions; refreshing the page does not lose data. |
| SC-04 | An Analyst can compare two historical runs and see which metrics improved or degraded. |
| SC-05 | A threshold rule violation is visually surfaced after a run that breaches it. |
| SC-06 | A Viewer-role user can be given access to a project and view results without seeing system internals or admin controls. |
| SC-07 | The application deploys to Vercel from the main branch without manual intervention. |
| SC-08 | The application's own Lighthouse Performance score is ≥ 85 in production. |
| SC-09 | No secrets or API keys appear in client-side code or public build output. |

---

## 12. Risks and Open Questions

### Risks

| ID | Risk | Likelihood | Impact | Notes |
|----|------|-----------|--------|-------|
| R-01 | PageSpeed Insights API rate limits hit earlier than expected for active users | Low at MVP scale | Medium | Mitigate with run queuing and per-project cooldown |
| R-02 | Google Search Console OAuth setup proves too complex for V1 onboarding | Medium | Medium | May require guided setup flow or deferred to V2 |
| R-03 | Raw audit data storage costs grow faster than anticipated | Low | Medium | Enforce retention limits and compression |
| R-04 | Lighthouse score volatility produces confusing trend data for users | Low–Medium | Low | Mitigate with run averaging or annotation support |
| R-05 | RLS policies in Supabase are misconfigured and allow cross-tenant data leakage | Low | High | Requires explicit testing per role |

### Open Questions

| ID | Question | Owner | Priority |
|----|----------|-------|---------|
| OQ-01 | Should threshold rules be global (workspace-level) or per-project? | Product | High |
| ~~OQ-02~~ | ~~What is the intended pricing/access model — internal tool, freemium SaaS, or agency tool?~~ **Closed.** Resolution: **Internal tool at MVP.** No public user registration, no SaaS billing, no pricing model. Stated as a fixed constraint in Doc-02 §10.1 and Doc-04 §2.3. | Product | ~~High~~ **Resolved** |
| ~~OQ-03~~ | ~~Is the Viewer role accessed via invitation only, or via a public share link?~~ **Closed.** Resolution: **Invitation-only.** No public share links, no unauthenticated access. The `ProjectMember` model (Doc-03 Gap 8) tracks invited members. Mechanism defined in Doc-06 §3.5. | Product | ~~High~~ **Resolved** |
| OQ-04 | Should audit runs be stored in full raw form indefinitely, or is a retention cap acceptable? | Engineering | Medium |
| OQ-05 | What is the expected number of concurrent users at initial production launch? | Product | Medium |
| ~~OQ-06~~ | ~~Will SiteLens support multiple workspaces (organizations) from the start, or begin as single-workspace?~~ **Closed.** Resolution: **Single-workspace at MVP.** All users share one workspace context. No tenant isolation needed at MVP. Multi-workspace is deferred to Future scope (§7.3). Stated as a fixed constraint in Doc-02 §10.1 and Doc-04 §2.3. | Product | ~~High~~ **Resolved** |
| OQ-07 | Should failed audit runs be automatically retried, and if so, how many times? | Engineering | Medium |
| OQ-08 | Is a mobile-responsive dashboard required at V1 or deferred? | Product | Low |
| ~~OQ-09~~ | ~~Should threshold rules support only lower-bound conditions or also upper-bound?~~ **Closed.** Resolution: `AlertOperator` enum (`BELOW` / `ABOVE`) added to schema. `operator @default(BELOW)` on `AlertRule`. Strict inequality for both directions. See Doc-03 Gap 4. | Engineering | ~~High~~ **Resolved** |

---

## 13. Glossary

| Term | Definition |
|------|-----------|
| **Audit Run** | A single execution of one or more audit sources against a target URL, producing a timestamped set of results. |
| **Finding** | A specific issue, warning, or passed check identified within an audit run. |
| **Metric** | A quantitative measurement extracted from an audit run (e.g., Performance score, LCP value). |
| **Project** | The primary organizational unit in SiteLens. Groups one or more target URLs under a named context. |
| **Source** | An external tool or API that provides audit data (e.g., PageSpeed Insights, Search Console). |
| **Source Tag** | A label attached to data identifying which tool or API produced it. |
| **Threshold Rule** | A user-defined condition that, when violated by an audit result, triggers a visible alert. |
| **Viewer** | A read-only user role intended for clients or stakeholders who need to see results but not operate the system. |
| **Workspace** | The top-level container for all projects, users, and settings within a SiteLens installation. |
| **CWV** | Core Web Vitals — a set of real-user performance metrics defined by Google: LCP, CLS, INP. |
| **LCP** | Largest Contentful Paint — measures how long the largest visible content element takes to render. |
| **CLS** | Cumulative Layout Shift — measures visual stability of a page during load. |
| **INP** | Interaction to Next Paint — measures responsiveness to user interactions. |
| **PSI** | PageSpeed Insights — Google's public API that runs Lighthouse and returns lab data and CrUX field data. |
| **RLS** | Row-Level Security — a Supabase/PostgreSQL feature that restricts data access at the database row level based on the authenticated user. |
| **GSC** | Google Search Console — Google's web service for monitoring search performance and indexing status. |
| **SEO** | Organic search optimization and technical/content discoverability practice. In SiteLens, this is not identical to ranking snapshots. |
| **Keyword Ranking** | Position tracking for explicitly tracked terms. Separate signal family from GSC aggregate metrics. |
| **GBP** | Google Business Profile data used as Local SEO support signals. Not equivalent to local ranking truth. |
| **MEO** | Local map/search optimization discipline. Broader than GBP API metrics alone. |
| **GA4** | Google Analytics 4 outcome/behavior telemetry. Not a primary search visibility source of truth. |
| **GEO** | AI-search/LLM-era visibility intelligence. Future capability, not MVP-critical. |

---

> **Document control**: This document moves to status `APPROVED` when the
> product owner and technical lead have reviewed and signed off on all sections.
> Open questions in section 12 should be resolved before architecture is approved.
> Doc-02 and Doc-04 may proceed as provisional drafts while open questions remain
> active, provided assumptions are clearly flagged in those documents.
