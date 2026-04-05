# Doc-03: Database Detail Design

**Project**: SiteLens
**Version**: 0.2
**Status**: SCHEMA DECISIONS COMPLETE — migration-ready pending Supabase provisioning
**Last Updated**: 2026-04-05

---

## Overview

This document will define the database schema, entity relationships, and data
access patterns for SiteLens. The database is PostgreSQL managed via Supabase,
with Prisma as the ORM layer.

The Prisma schema is defined in `prisma/schema.prisma`.
**No migration has been applied.** All pre-migration gaps have been resolved
and the schema is now migration-ready. See the Final Schema section below.

The first migration command when ready:
```bash
npx prisma migrate dev --name init
```
Prerequisites: Supabase project provisioned, `DIRECT_URL` and `DATABASE_URL`
set in `.env.local`. Do not run until both are confirmed.

---

## Current Schema State

The schema in `prisma/schema.prisma` defines four models:

| Model | Purpose | Status |
|-------|---------|--------|
| `Project` | A website registered for auditing (renamed from `Site` — Gap 6) | Final |
| `AuditRun` | A single audit execution lifecycle | Final (rawData + errorMessage added) |
| `Metric` | Normalized key/value result from an audit | Final |
| `Finding` | Structured issue/warning/passed check from an audit | Final (new model — Gap 3) |
| `AlertRule` | Threshold alert configuration per project | Final (operator field added — Gap 4) |
| `AlertViolation` | A recorded breach of an AlertRule on a specific AuditRun | Final (new model — Gap 7) |
| `ProjectMember` | Invitation-based access for Analyst and Viewer roles | Final (new model — Gap 8) |

---

## Pre-Migration Gaps Requiring Resolution

The following gaps between the current schema and the refined requirements
(Doc-01) must be decided before `prisma migrate dev` is run. These are noted
as T-07 through T-12 in Doc-04 Technical Notes.

| Gap | Resolution | Status |
|-----|-----------|--------|
| Gap 1 — Multi-URL Support | Option B: defer to V1; single URL at MVP (A-05) | **Resolved** |
| Gap 2 — Raw API Response Storage | `rawData Json?` added to `AuditRun` | **Resolved** |
| Gap 3 — Finding Model | `Finding` model + 3 enums added | **Resolved** |
| Gap 4 — AlertRule Condition Direction | `AlertOperator` enum + `operator` field added | **Resolved** |
| Gap 5 — AuditRun Error Message | `errorMessage String?` added to `AuditRun` | **Resolved** |
| Gap 6 — Model Naming (Site vs Project) | Option A: renamed `Site` → `Project` | **Resolved** |
| Gap 7 — Violation Storage Model | `AlertViolation` dedicated model (T-13) | **Resolved** |
| Gap 8 — Viewer Invitation Model | `ProjectMember` join table + `ProjectRole` enum | **Resolved** |

### Gap 1 — Multi-URL Support (FR-11, T-07)

**Problem**: The `Site` model has a single `url String` field. Doc-01 requires
a project to support multiple URLs (FR-11), and MVP scope states "name + one
or more URLs."

**Options before migration:**
- A. Add a `SiteUrl` model (1:N from `Site` → `SiteUrl`) and move `url` there.
  `AuditRun` then references a `SiteUrl` rather than `Site` directly.
- B. Accept MVP as single-URL per project; add multi-URL in V1 migration.
  Requires explicitly scoping FR-11 to V1 in Doc-01.

**Recommended resolution**: **Option B** — defer multi-URL to V1. Doc-01 has been
updated (Assumption A-05) to scope FR-11 as a V1 feature. MVP will retain the
single `url` field on `Site`.

**V1 migration note**: When multi-URL is introduced, `AuditRun` must reference a
`SiteUrl` ID (not the parent `Site` ID directly) to track which specific URL was
audited. This is a forward-compatibility constraint on the V1 schema design.

**Status**: Resolved. No pre-migration schema change required for this gap.

---

### Gap 2 — Raw API Response Storage (FR-21, NFR-30, T-08)

**Problem**: `AuditRun` has no field to store the raw source API response.
FR-21 requires "raw source API response (as JSON)" on every run.
NFR-30 requires retention of the original raw response for 90 days.

**Resolution**: `rawData Json?` added to `AuditRun`.

- Nullable because FAILED runs may have no response to store
- At MVP (PSI only): stores the full PageSpeed Insights API response object
- V1 note: if GSC adds a second source per run, `rawData` can hold a keyed
  object `{ "pagespeed-insights": {...}, "search-console": {...} }` without
  a schema change; revisit in V1 if a dedicated `AuditRunRawData` model is needed

**Status**: Resolved.

---

### Gap 3 — Finding Model (FR-40–43, T-09)

**Problem**: There is no `Finding` model. FR-40–43 require:
- Structured findings per audit run (severity, category, source)
- Filterable finding lists
- Classification as new / recurring / resolved vs. previous run

**Resolution**: `Finding` model added with three supporting enums.

**Fields**: `id`, `auditRunId`, `key`, `title`, `severity`, `category`, `source`,
`status?`, `displayValue?`, `createdAt`

**Key design decisions:**
- `key`: the Lighthouse audit ID (e.g., `"uses-optimized-images"`). Used as the
  matching key when comparing runs to determine NEW / RECURRING / RESOLVED status.
- `status FindingStatus?`: nullable. Null on the first run (no baseline). Set by
  comparing the current run's findings against the previous completed run.
- `displayValue String?`: optional Lighthouse-provided display string (e.g., "2.0 s").
  Improves dashboard readability without requiring clients to parse rawData.
- All findings are stored per run, including PASSED checks. This is required to
  support both the filterable findings view and the NEW/RESOLVED classification.

**FindingSeverity enum** (maps to Lighthouse score thresholds):
- `CRITICAL` — score < 0.5 (Lighthouse "poor" band)
- `WARNING` — score 0.5–0.89 (Lighthouse "needs improvement" band)
- `INFO` — informative / not-applicable (no score)
- `PASSED` — score >= 0.9

**FindingCategory enum**: `PERFORMANCE`, `ACCESSIBILITY`, `BEST_PRACTICES`,
`SEO`, `STRUCTURED_DATA`. STRUCTURED_DATA is V1 but included now for forward
compatibility.

**FindingStatus enum**: `NEW`, `RECURRING`, `RESOLVED`

**Indexes**: `(auditRunId)`, `(auditRunId, severity)`, `(auditRunId, category)`

**Status**: Resolved.

---

### Gap 4 — AlertRule Condition Direction (FR-60, OQ-09, T-10)

**Problem**: `AlertRule.threshold Float` supports only implicit "value below
threshold" conditions. Metrics where lower is better (LCP, CLS, INP) need
"value above threshold" conditions.

**Resolution**: `AlertOperator` enum added; `operator AlertOperator @default(BELOW)`
added to `AlertRule`.

```prisma
enum AlertOperator {
  BELOW // alert when metric value < threshold (e.g., performance < 80)
  ABOVE // alert when metric value > threshold (e.g., lcp > 2500)
}
```

**Key design decisions:**
- `@default(BELOW)` preserves the original semantics (the prior schema comment
  said "drops below"). Existing rules without an explicit operator default to BELOW.
- Strict inequality only (`<` / `>`). Boundary-exact equality (≤ / ≥) is not
  required at MVP — score thresholds and CWV thresholds are imprecise enough
  that the distinction is immaterial.
- OQ-09 is closed. No further options considered.

**Migration compatibility**: `@default(BELOW)` means this field can be added in
the initial migration without any data migration concern (no existing rows yet).

**Status**: Resolved. OQ-09 closed in Doc-01.

---

### Gap 5 — AuditRun Error Message (FR-24, T-11)

**Problem**: Failed `AuditRun` records have no field to record the error reason.
FR-24 requires: "Failed audit runs must record an error reason and not silently
discard data."

**Resolution**: `errorMessage String?` added to `AuditRun`.

- Nullable: only populated on `status = FAILED` runs
- Implementation note: set `errorMessage` before transitioning status to FAILED
  so that the final state is always consistent

**Status**: Resolved.

---

### Gap 6 — Model Naming: Site vs Project (A-04, T-12)

**Problem**: The Prisma model is named `Site`. Requirements documents use
"Project" as the user-facing concept.

**Resolution**: Option A — renamed `Site` → `Project` throughout the schema.

- Relation fields: `siteId` → `projectId` on `AuditRun` and `AlertRule`
- Relation scalars: `site` → `project` on both models
- PostgreSQL table name: `Project` (Prisma convention: model name → table name)
- Prisma query namespace: `prisma.project.*` (reads naturally; no mismatch)

**Rationale for Option A**: Since no migration data exists, renaming is zero-cost.
Option B would create permanent cognitive load ("Site always means Project") for
every developer and code search touching the schema. Early correctness is free here.

**Status**: Resolved.

---

### Gap 7 — Violation Storage Model (FR-62, FR-63, T-13)

**Problem**: `AlertRule` evaluation produces violations after each audit run, but
there was no model to store them. FR-63 requires "the violation record must exist
for V1 notification integration."

**Options considered:**
- A. A dedicated `AlertViolation` model per `AuditRun + AlertRule` combination
- B. An inline `violationCount`/`hasViolations` flag on `AuditRun` plus serialized JSON

**Resolution**: **Option A** — dedicated `AlertViolation` model.

- Option B cannot support the per-rule violation detail needed for FR-62 (clear
  indication of which rule was breached) or V1 notification targeting (FR-63)
- A dedicated model allows efficient querying: violations per run, violations per
  rule, violation history for a project
- Snapshot fields (`metricKey`, `actualValue`, `threshold`, `operator`) preserve
  rule state at violation time so subsequent edits to the rule do not alter history

**Fields**: `id`, `auditRunId`, `alertRuleId`, `metricKey`, `actualValue`,
`threshold`, `operator`, `createdAt`

**Key design decisions:**
- All value fields (`actualValue`, `threshold`, `operator`) snapshot the rule's
  state at the moment of violation. This is required for accurate historical display.
- `AlertViolation` is pipeline-written only — no user INSERT. Service role writes
  violations; `authenticated` role has SELECT only.
- Cascade deletes: deleting an `AuditRun` or `AlertRule` removes associated violations.
- Indexes on `(auditRunId)` and `(alertRuleId)` for efficient dashboard queries.

**Back-relations added:**
- `AuditRun.violations AlertViolation[]`
- `AlertRule.violations AlertViolation[]`

**Status**: Resolved. T-13 closed. See `prisma/schema.prisma` for full field definitions.

---

### Gap 8 — Viewer Invitation Model (FR-02, FR-03, FR-04, Doc-06)

**Problem**: The Viewer role (FR-02) requires read-only access to specific projects,
accessible via invitation only. No database model existed to track which users have
been granted access to which projects.

**Context**: The project owner (`Project.userId`) continues to have full access via
direct ownership. `ProjectMember` only tracks *invited* users — it does not include
the owner.

**Resolution**: `ProjectMember` join table with `ProjectRole` enum.

**Fields**: `id`, `projectId`, `userId`, `role`, `invitedBy`, `createdAt`

**Key design decisions:**
- `@@unique([projectId, userId])` — one role per user per project. Role changes
  require delete + re-insert (no UPDATE path).
- `invitedBy` records the `userId` of the Administrator who granted access.
  This is for audit trail only — it is not used in RLS predicates.
- `role ProjectRole` has two values:
  - `ANALYST`: full read/write on project data; cannot manage workspace settings
  - `VIEWER`: read-only access to assigned project data

**ProjectRole enum values**: `ANALYST`, `VIEWER`

**RLS implications** (see Doc-06 §3 for full policy definitions):
- Existing owner-based policies are unchanged. New OR-branch policies are added
  per table to allow ProjectMember access. PostgreSQL RLS combines policies with OR.
- `Project`: add `project_select_member` policy (EXISTS in ProjectMember)
- `AuditRun`: add `auditrun_select_member` policy
- `Metric`: add `metric_select_member` policy
- `Finding`: add `finding_select_member` policy
- `AlertViolation`: add `alertviolation_select_member` policy
- `ProjectMember` itself: owner can INSERT/DELETE; member can SELECT own rows
- ANALYST members additionally need INSERT on `AuditRun` (to trigger audits)
  and CRUD on `AlertRule`. V1 concern — at MVP, only the owner triggers audits.

**Status**: Resolved. See Doc-06 §3.4 for full RLS policy additions.

---

---

## Entity Relationships

```
Project (1) ──────────────────────────── (N) AuditRun
   │                                            │
   │                                            ├── (N) Metric
   │                                            ├── (N) Finding
   │                                            └── (N) AlertViolation
   │
   ├── (N) AlertRule ──────────────────── (N) AlertViolation
   │
   └── (N) ProjectMember
```

All relations use `onDelete: Cascade`. Deleting a `Project` removes all
its `AuditRun`, `Metric`, `Finding`, `AlertRule`, `AlertViolation`, and
`ProjectMember` records.

`AuditRun` owns `Metric`, `Finding`, and `AlertViolation` records. Deleting
an `AuditRun` removes all three. Deleting an `AlertRule` removes its
`AlertViolation` records.

---

## Source Tag Convention

The `source` field on `Metric` and `Finding` identifies the origin of each
data point. Canonical values:

| Value | Used For | Phase |
|-------|---------|-------|
| `"pagespeed-insights"` | Google PageSpeed Insights API responses | MVP |
| `"search-console"` | Google Search Console API responses | V1 |

**Rules:**
- Always lowercase, hyphenated, full service name
- Not `"lighthouse"` — that is the underlying tool, not the API being called
- Not `"pagespeed"` — ambiguous abbreviation
- Not `"psi"` — abbreviation; use full name for clarity
- New sources added in future must follow the same convention and be documented here

---

## Final Schema Reference

The complete migration-ready schema is maintained in `prisma/schema.prisma`.
Key structure:

| Model | Fields added vs original | Enums |
|-------|-------------------------|-------|
| `Project` | Renamed from `Site`; `siteId` → `projectId` on relations; `+members ProjectMember[]` | — |
| `AuditRun` | `+rawData Json?`, `+errorMessage String?`, `+findings Finding[]`, `+violations AlertViolation[]` | `AuditStatus` (unchanged) |
| `Metric` | Unchanged | — |
| `Finding` | New model | `FindingSeverity`, `FindingCategory`, `FindingStatus` |
| `AlertRule` | `+operator AlertOperator @default(BELOW)`, `+violations AlertViolation[]`; `siteId` → `projectId` | `AlertOperator` |
| `AlertViolation` | New model (Gap 7) — snapshot violation record per AuditRun+AlertRule | — |
| `ProjectMember` | New model (Gap 8) — invitation-based project access | `ProjectRole` |

See `prisma/schema.prisma` for full field definitions, index declarations,
and inline design rationale comments.

---

## Migration Notes

First migration command:
```bash
npx prisma migrate dev --name init
```

**Prerequisites before running:**
1. Supabase project provisioned (manual step — see SETUP_STATUS.md)
2. `DIRECT_URL` set in `.env.local` — direct (non-pooled) connection; bypasses pgBouncer for DDL
3. `DATABASE_URL` set in `.env.local` — pooled connection; used by runtime Prisma Client
4. `prisma.config.ts` uses `DIRECT_URL` for CLI operations — already configured correctly
5. Run `npx prisma validate` to confirm schema parses cleanly (currently: ✅ valid)

**Prisma 7.x datasource note**: Connection URLs are NOT in `prisma/schema.prisma`.
The datasource block contains only `provider = "postgresql"`. All URL configuration
is in `prisma.config.ts` (CLI) and in `src/lib/db/client.ts` (runtime, via pg adapter).
This was a pre-existing schema incompatibility corrected during the schema decision phase.

**After migration:**
1. Run `npx prisma generate` to rebuild the Prisma Client in `src/generated/prisma`
2. Confirm `pnpm build` passes (build includes `prisma generate`)
3. Implement RLS policies in Supabase dashboard (Doc-06 — still TBD)

---

## Still Pending (Post-Migration Work)

- [ ] **RLS policy design** — Define per-table policies enforcing userId isolation.
      Deferred to Doc-06 (Security Design). Must be implemented before any user
      data is stored in production.
- [ ] **Seed data** — Local development seed for testing. Deferred to implementation phase.
- [ ] **Full index review** — Validate query patterns against index coverage once
      the audit pipeline is implemented. Current indexes are provisional for MVP
      access patterns.

---

> **Document control**: Gap resolution phase is complete. Schema is migration-ready.
> Next action: provision Supabase, set env vars, and run first migration.
> Do not run `prisma migrate dev` until prerequisites above are confirmed.
