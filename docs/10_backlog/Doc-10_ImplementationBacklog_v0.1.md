# Doc-10: Implementation Backlog

**Project**: SiteLens
**Version**: 0.1
**Status**: DRAFT
**Last Updated**: 2026-06-17
**Source**: Split from Doc-01 §7.0.1 D (Implementation Reality Alignment, 2026-06-17)

---

## Purpose

This backlog tracks **not-yet-implemented** requirements identified during the 2026-06-17
implementation review. It is the single place to manage pending work so that Doc-01
(Requirements) can stay focused on *what the product is*, while this document manages
*what remains to be built*.

> **Scope guard (binding):** Items here are tracking entries only. Implementation must not
> change scoring logic, evaluation thresholds, or data-parsing rules without explicit
> approval. Items marked **[APPROVAL-GATED]** require sign-off before any code is written.

---

## Backlog Items

| ID | Item | Source req. | Priority | Status | Approval |
|----|------|-------------|----------|--------|----------|
| BL-01 | Tracked keywords + ranking snapshots (Search Visibility core) → **plan: Doc-11** | §7.0 / §7.0.1 D | **High** | Planning (Doc-11 DRAFT) | — |
| BL-02 | MEO / local-map **score** (0–100) | §7.0.1 D | Medium | Not started | **[APPROVAL-GATED]** |
| BL-03 | Finding diff cross-run wiring (NEW / RECURRING / RESOLVED) | FR-43 | Medium | Partial (scaffold only) | — |
| BL-04 | Multi-URL per project | FR-11 | Low (V1) | Deferred (as planned) | — |
| BL-05 | Error tracking via Sentry | NFR-70 | Medium | Not started | — |
| BL-06 | Silent-failure hardening | FR-24 / NFR-52 | **High** | Partial | — |

---

## Item Detail

### BL-01 — Tracked keywords + ranking snapshots  `[High]`
- **Implementation plan:** see **Doc-11 (`docs/11_implementation_plans/Doc-11_KeywordRankTrackingImplementationPlan_v0.1.md`)** — design DRAFT, external-API-based (DataForSEO primary), no code yet.
- **Gap:** No keyword/ranking model or code present. The 2026-04-10 realignment named this
  part of the MVP "Search Visibility core," but it is the largest unmet requirement.
- **Scope (proposed, to be planned next):** keyword registration per project, periodic rank
  snapshot capture, history + trend surfacing. Follows the existing axis pattern
  (analyzer service + Result table + API + dashboard page + nav entry).
- **Dependencies:** data source for ranking data (TBD — to be decided in the implementation plan).
- **Note:** No scoring formula change to existing axes; new axis only.

### BL-02 — MEO / local-map score (0–100)  `[Medium] [APPROVAL-GATED]`
- **Gap:** GBP currently shows raw metrics only; no 0–100 score exists.
- **Constraint:** Introducing a score = **new scoring logic** → requires explicit approval
  before design or implementation. Do not invent a formula.

### BL-03 — Finding diff cross-run wiring  `[Medium]`
- **Gap:** `FindingStatus` enum (NEW/RECURRING/RESOLVED) and first-run scaffold exist, but
  population of RECURRING/RESOLVED on comparison runs is unconfirmed.
- **Scope:** wire comparison logic to set status across consecutive runs; surface in findings list.

### BL-04 — Multi-URL per project (FR-11)  `[Low / V1]`
- **Status:** Deferred to V1 exactly as originally planned (one URL per project today).
  Schema migration introduces `SiteUrl` (1:N) per Doc-01 A-05 when scheduled.

### BL-05 — Sentry error tracking (NFR-70)  `[Medium]`
- **Gap:** Only PostHog present; runtime errors not reported to an error-tracking service.
- **Scope:** add Sentry SDK + DSN via env var (no secret in code).

### BL-06 — Silent-failure hardening (FR-24 / NFR-52)  `[High]`
- **Gap:** Some swallowed errors remain (e.g. previously noted webhook `.catch(()=>{})`
  and audit execute paths). Violates the data-integrity rule "no silent failure."
- **Scope:** ensure failed runs record an error reason; surface user-facing error states.

---

## Next Action

Per the agreed sequence, the implementation plan for **BL-01 (keyword/ranking tracking)** is
now drafted in **Doc-11**. This backlog remains the reference for subsequent items (BL-02…BL-06).
