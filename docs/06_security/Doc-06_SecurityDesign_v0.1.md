# Doc-06: Security Design

**Project**: SiteLens
**Version**: 0.2
**Status**: RLS BASELINE COMPLETE — member access model defined 2026-04-05
**Last Updated**: 2026-04-05

---

## Overview

This document defines the security model, access control design, and RLS
policy specifications for SiteLens at MVP. The primary security mechanism
is Supabase Row-Level Security (RLS), which enforces per-user data isolation
at the database layer.

---

## 1. Authentication

SiteLens uses **Supabase Auth (SSR)** via `@supabase/ssr`.

| Rule | Detail |
|------|--------|
| Session access | Always use `getUser()` — never `getSession()` (deprecated, insecure) |
| Server client | `createServerClient` from `@supabase/ssr` with `cookieStore` |
| User identity | `auth.uid()` returns the authenticated user's UUID |
| `userId` type | `Project.userId` is `TEXT` — always cast: `auth.uid()::text` |

### Auth Flow (MVP)

- Supabase Magic Link / OAuth (configured in Supabase Dashboard)
- No custom auth middleware at MVP
- All protected pages/routes check session via `getUser()` server-side

---

## 2. Authorization Model

### Ownership Model

SiteLens uses a **dual-path access model** at MVP:

1. **Owner path** — `Project.userId = auth.uid()::text`: direct ownership; full access.
2. **Member path** — `ProjectMember.userId = auth.uid()::text`: invitation-based access;
   read-only (Viewer) or read/write (Analyst) to assigned projects.

The two paths are independent: the owner is never in `ProjectMember`. RLS combines
policies with OR — any satisfied policy grants access.

```
auth.uid()::text
       │
       ├── Owner path ───────────────────────────────────────────────────────┐
       │   Project.userId                                                     │
       │       │                                                              │
       │       ├── AuditRun  ──── 1-level JOIN via projectId                 │
       │       │       │                                                      │
       │       │       ├── Metric      ──── 2-level JOIN                     │
       │       │       ├── Finding     ──── 2-level JOIN                     │
       │       │       └── AlertViolation ── 2-level JOIN                    │
       │       │                                                              │
       │       ├── AlertRule ──── 1-level JOIN via projectId                 │
       │       │       └── AlertViolation ── via alertRuleId                 │
       │       └── ProjectMember ── INSERT/DELETE by owner                   │
       │                                                                      │
       └── Member path ─────────────────────────────────────────────────────┘
           ProjectMember (projectId, userId, role)
               └── grants SELECT on Project, AuditRun, Metric, Finding,
                   AlertRule, AlertViolation for the member's userId
```

### Access Matrix (authenticated role)

Owner = `Project.userId = auth.uid()::text`. Member = row in `ProjectMember` for this project.

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|--------|--------|--------|--------|-------|
| `Project` | ✅ owner + member | ✅ own | ✅ own | ✅ own | Members can read but not create/update/delete projects |
| `AuditRun` | ✅ owner + member | ✅ own | ❌ | ✅ own | UPDATE absent — status transitions are system-only |
| `Metric` | ✅ owner + member | ❌ | ❌ | ❌ | Writes are pipeline-only (service role) |
| `Finding` | ✅ owner + member | ❌ | ❌ | ❌ | Writes are pipeline-only (service role) |
| `AlertRule` | ✅ owner + member | ✅ own | ✅ own | ✅ own | Full CRUD for owner; members read-only at MVP |
| `AlertViolation` | ✅ owner + member | ❌ | ❌ | ❌ | Writes are pipeline-only (service role) |
| `ProjectMember` | ✅ own row | ✅ owner inserts | ❌ | ✅ owner deletes | Owner manages members; each member can read their own row |

### RLS Bypass Scenarios (by design)

| Role | RLS enforced? | Reason |
|------|--------------|--------|
| `authenticated` (Supabase client) | ✅ Yes | All access filtered by policies |
| `service_role` (server-side API routes) | ❌ No — bypasses RLS | Supabase standard; audit pipeline uses this |
| Prisma pg adapter (runtime) | ❌ No — bypasses RLS | Uses `postgres` role directly; server-side reads are safe |

**Security implication**: All Supabase client (`anon`/`authenticated`) access
is RLS-protected. Server-side code (Next.js API routes, Server Actions) uses
either the Prisma client or the Supabase service role client — both bypass RLS.
Server-side code must enforce ownership checks in application logic, not relying
on RLS alone.

---

## 3. Row-Level Security Policies

RLS is enabled on all 5 tables. Applied via migration
`20260404000001_rls_policies`.

### 3.1 GRANT Summary

Tables created by Prisma DDL do not auto-grant permissions to the `authenticated`
role. Explicit GRANTs are required before policies take effect.

| Table | authenticated grants |
|-------|---------------------|
| `Project` | SELECT, INSERT, UPDATE, DELETE |
| `AuditRun` | SELECT, INSERT, DELETE |
| `Metric` | SELECT |
| `Finding` | SELECT |
| `AlertRule` | SELECT, INSERT, UPDATE, DELETE |
| `AlertViolation` | SELECT |
| `ProjectMember` | SELECT, INSERT, DELETE |

### 3.2 Policy Inventory

**Project** — 4 policies (direct ownership)

| Policy name | Op | Predicate |
|------------|-----|-----------|
| `project_select_own` | SELECT | `auth.uid()::text = "userId"` |
| `project_insert_own` | INSERT | `auth.uid()::text = "userId"` |
| `project_update_own` | UPDATE | `auth.uid()::text = "userId"` (USING + WITH CHECK) |
| `project_delete_own` | DELETE | `auth.uid()::text = "userId"` |

**AuditRun** — 3 policies (1-level JOIN; no UPDATE)

| Policy name | Op | Predicate |
|------------|-----|-----------|
| `auditrun_select_own_project` | SELECT | EXISTS: `Project.id = projectId AND Project.userId = auth.uid()::text` |
| `auditrun_insert_own_project` | INSERT | `projectId IN (SELECT id FROM Project WHERE userId = auth.uid()::text)` |
| `auditrun_delete_own_project` | DELETE | EXISTS: `Project.id = projectId AND Project.userId = auth.uid()::text` |

**Metric** — 1 policy (2-level JOIN; SELECT only)

| Policy name | Op | Predicate |
|------------|-----|-----------|
| `metric_select_own_project` | SELECT | EXISTS: `AuditRun JOIN Project WHERE AuditRun.id = auditRunId AND Project.userId = auth.uid()::text` |

**Finding** — 1 policy (2-level JOIN; SELECT only)

| Policy name | Op | Predicate |
|------------|-----|-----------|
| `finding_select_own_project` | SELECT | EXISTS: `AuditRun JOIN Project WHERE AuditRun.id = auditRunId AND Project.userId = auth.uid()::text` |

**AlertRule** — 4 policies (full CRUD via Project ownership)

| Policy name | Op | Predicate |
|------------|-----|-----------|
| `alertrule_select_own_project` | SELECT | EXISTS: `Project.id = projectId AND Project.userId = auth.uid()::text` |
| `alertrule_insert_own_project` | INSERT | `projectId IN (SELECT id FROM Project WHERE userId = auth.uid()::text)` |
| `alertrule_update_own_project` | UPDATE | EXISTS + WITH CHECK `projectId IN (...)` |
| `alertrule_delete_own_project` | DELETE | EXISTS: `Project.id = projectId AND Project.userId = auth.uid()::text` |

**Total (baseline): 13 policies across 5 tables.**

---

### 3.4 Member Access Policies (Viewer Invitation Extension)

These policies extend the baseline to support the `ProjectMember` invitation model.
They are **additive** — they do not modify baseline owner policies. RLS combines
policies with OR: any satisfied policy grants access.

All member-path predicates resolve through `ProjectMember` to confirm the requesting
user has an active membership row for the target project.

**Project** — 1 additional policy

| Policy name | Op | Predicate |
|------------|-----|-----------|
| `project_select_member` | SELECT | EXISTS: `ProjectMember WHERE projectId = id AND userId = auth.uid()::text` |

**AuditRun** — 1 additional policy

| Policy name | Op | Predicate |
|------------|-----|-----------|
| `auditrun_select_member` | SELECT | EXISTS: `Project JOIN ProjectMember WHERE Project.id = projectId AND ProjectMember.userId = auth.uid()::text` |

**Metric** — 1 additional policy

| Policy name | Op | Predicate |
|------------|-----|-----------|
| `metric_select_member` | SELECT | EXISTS: `AuditRun JOIN Project JOIN ProjectMember WHERE AuditRun.id = auditRunId AND ProjectMember.userId = auth.uid()::text` |

**Finding** — 1 additional policy

| Policy name | Op | Predicate |
|------------|-----|-----------|
| `finding_select_member` | SELECT | EXISTS: `AuditRun JOIN Project JOIN ProjectMember WHERE AuditRun.id = auditRunId AND ProjectMember.userId = auth.uid()::text` |

**AlertRule** — 1 additional policy (read-only for members at MVP)

| Policy name | Op | Predicate |
|------------|-----|-----------|
| `alertrule_select_member` | SELECT | EXISTS: `Project JOIN ProjectMember WHERE Project.id = projectId AND ProjectMember.userId = auth.uid()::text` |

**AlertViolation** — 2 owner policies + 1 member policy

| Policy name | Op | Predicate |
|------------|-----|-----------|
| `alertviolation_select_own_project` | SELECT | EXISTS: `AuditRun JOIN Project WHERE AuditRun.id = auditRunId AND Project.userId = auth.uid()::text` |
| `alertviolation_select_member` | SELECT | EXISTS: `AuditRun JOIN Project JOIN ProjectMember WHERE AuditRun.id = auditRunId AND ProjectMember.userId = auth.uid()::text` |

**ProjectMember** — 4 policies

| Policy name | Op | Predicate |
|------------|-----|-----------|
| `projectmember_select_own` | SELECT | `auth.uid()::text = userId` |
| `projectmember_insert_own_project` | INSERT | `projectId IN (SELECT id FROM Project WHERE userId = auth.uid()::text)` |
| `projectmember_delete_own_project` | DELETE | EXISTS: `Project.id = projectId AND Project.userId = auth.uid()::text` |
| `projectmember_insert_own_project_check` | INSERT | WITH CHECK: `projectId IN (SELECT id FROM Project WHERE userId = auth.uid()::text)` |

**Total (member extension): 11 additional policies across 6 tables.**
**Grand total: 24 policies across 7 tables.**

> **Implementation note**: Member extension policies are not yet applied to Supabase.
> They must be applied in the next migration or via a separate SQL script before
> Viewer invitation UI is built. See §3.5 for the migration SQL template.

---

### 3.5 Viewer Invitation Mechanism

**How invitation works (application layer):**

1. An Administrator navigates to a project's settings and enters a user's email.
2. The server-side Route Handler:
   a. Looks up the user's `auth.uid()` via `supabaseAdmin.auth.admin.listUsers()` or
      requires the invited user to have already signed up (MVP constraint).
   b. Inserts a row into `ProjectMember (projectId, userId, role, invitedBy)`.
3. On next sign-in, the invited user's session `auth.uid()` matches the
   `ProjectMember.userId` predicate, and the member-path RLS policies grant access.

**MVP constraints:**
- The invited user must already have a SiteLens account (no email-based invite flow at MVP).
- Only the project owner (Administrator) can add or remove members.
- Role changes require the owner to delete the existing `ProjectMember` row and insert a new one.
- No self-service access requests.

**V1 additions (deferred):**
- Email invitation flow with a pending-state `ProjectMember` record
- Bulk member management UI
- ANALYST member INSERT on `AuditRun` (to allow Analyst-role members to trigger audits)

---

### 3.3 Verification (Baseline — 13 policies)

Applied 2026-04-05. Confirmed via `pg_policies` query:

```
tablename   policyname                        cmd
---------   ---------                         ---
AlertRule   alertrule_delete_own_project      DELETE
AlertRule   alertrule_insert_own_project      INSERT
AlertRule   alertrule_select_own_project      SELECT
AlertRule   alertrule_update_own_project      UPDATE
AuditRun    auditrun_delete_own_project       DELETE
AuditRun    auditrun_insert_own_project       INSERT
AuditRun    auditrun_select_own_project       SELECT
Finding     finding_select_own_project        SELECT
Metric      metric_select_own_project         SELECT
Project     project_delete_own                DELETE
Project     project_insert_own                INSERT
Project     project_select_own                SELECT
Project     project_update_own                UPDATE
```

All 5 tables confirmed `rls_enabled = true` via `pg_class`.

---

## 4. Secret Management

| Secret | Storage | Notes |
|--------|---------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` only | Never exposed to client; bypasses RLS |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + public | Safe to expose; enforced by RLS |
| `DATABASE_URL` / `DIRECT_URL` | `.env.local` only | Prisma runtime + migration |
| `PAGESPEED_API_KEY` | `.env.local` only | Server-side only |
| `CRON_SECRET` | `.env.local` only | Used to authenticate scheduled job requests |
| All other keys | `.env.local` only | See `.env.example` for full list |

**Rules:**
- `.env.local` is in `.gitignore` — never commit
- No secret is ever passed to client components
- `NEXT_PUBLIC_*` variables are intentionally public; must contain no secrets

---

## 5. API Security

### Cron / Scheduled Job Routes
- All cron routes must validate the `Authorization: Bearer $CRON_SECRET` header
- Reject requests without a valid secret with `401 Unauthorized`

### Rate Limiting
- Upstash Redis rate limiting to be applied to all user-facing API routes in V1
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` already in `.env.local`

### Input Validation
- All user inputs validated with `zod` before database writes
- URL inputs sanitized and validated (must be valid HTTP/HTTPS URL) before creating a Project

---

## 6. anon Role

The Supabase `anon` role has **no grants** on any application table. No RLS
policies are defined for `anon`. Unauthenticated users cannot read or write
any data.

---

## 7. Pending / Post-MVP Security Work

| Item | Priority | Notes |
|------|----------|-------|
| **Apply member RLS policies (§3.4)** | **High** | 11 policies not yet applied to Supabase — blocker for Viewer UI |
| Upstash rate limiting on API routes | High | Prevent audit abuse |
| Audit pipeline authorization | High | Verify cron caller identity before triggering audit |
| Input validation hardening | Medium | URL allowlist / blocklist (no localhost, no private IP) |
| Security headers (CSP, HSTS) | Medium | `next.config.ts` headers config |
| Multi-URL support RLS | Low | Deferred with FR-11 to V1 |
| Dependency audit | Low | `pnpm audit` + Dependabot |

---

> **Document control**: RLS baseline complete (13 policies, verified 2026-04-05).
> Member access model defined 2026-04-05: 11 additional policies across 6 tables (§3.4).
> Member extension policies not yet applied to Supabase — apply before Viewer UI is built.
> Next security work: apply member RLS policies, rate limiting, audit pipeline auth (V1).
> See `prisma/migrations/20260404000001_rls_policies/migration.sql` for baseline SQL.
