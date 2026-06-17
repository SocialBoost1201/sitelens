# Doc-11: Keyword & Rank Tracking — Implementation Plan

**Project**: SiteLens
**Version**: 0.1
**Status**: DRAFT — design only (no code yet)
**Last Updated**: 2026-06-17
**Implements**: Doc-10 BL-01 (Tracked keywords + ranking snapshots)
**Related**: Doc-01 §7.0 / §7.0.1, Doc-03 (DB), Doc-04 (Architecture)

---

## 0. Scope Guards (binding)

- **Design only.** No code is written under this document. Implementation starts only after this plan is approved.
- **Do not change** existing scoring logic, evaluation thresholds, or data-parsing rules of any existing axis (SEO/GEO/Security/Uptime/…).
- This is a **new axis**, added in parallel, following the existing axis pattern.
- **No 0–100 rank "score" in MVP.** Any composite visibility score = new scoring logic → **[APPROVAL-GATED]** (same treatment as BL-02 MEO score). MVP surfaces raw positions and non-scored derived metrics only.
- **No self-scraping in MVP.** Rank data is obtained via an external API (see §6).

---

## 1. Requirement Traceability Matrix (RTM)

User-stated requirements (2026-06-17) → where each is satisfied in this plan.

| # | Requirement | Plan section | Status |
|---|-------------|--------------|--------|
| R1 | MVP does not self-scrape; external-API-based design | §6, §0 | ✅ covered |
| R2 | First choice = DataForSEO | §6.2 (recommendation) | ✅ covered |
| R3 | Rationale: self-built rank fetch = ToS/CAPTCHA/IP/maintenance risk | §6.1, §7 | ✅ covered |
| R4 | Comparison table: DataForSEO / SerpApi / Zenserp / self-built | §6.1 | ✅ covered |
| R5 | MVP flow: register → periodic fetch → store history → dashboard → improvement actions | §2, §3, §4, §5 | ✅ covered |
| R6 | Do not touch existing scoring / thresholds / parsing | §0 | ✅ guarded |
| R7 | Add as new axis, follow existing axis pattern | §3, §4, §5 | ✅ covered |
| R8 | Author as Doc-11_KeywordRankTrackingImplementationPlan_v0.1.md | this file | ✅ done |
| R9 | No implementation yet; fix design/DB/API/UI/cost/risk/MVP scope first | whole doc | ✅ covered |

> Per Agent Inspector D3, this RTM is presented for confirmation before implementation begins.

---

## 2. MVP Scope

**In scope (MVP):**
1. **Keyword registration** — per project: keyword text, target URL/domain, location (country), language, device (desktop/mobile).
2. **Periodic fetch** — scheduled cron pulls current rank for each enabled keyword via external API.
3. **Rank history storage** — every fetch stored as a timestamped snapshot (position + found URL + SERP context).
4. **Dashboard display** — keyword list with current position, delta vs previous, and a per-keyword trend chart.
5. **Improvement actions** — rule-based, non-scored suggestions (e.g. "page X dropped from #8→#14: review on-page SEO / check Search Console for this query"). Reuses the existing Finding/recommendation catalog style; **introduces no new scoring**.

**Out of scope (MVP) — tracked as future:**
- 0–100 keyword visibility score / SoV index `[APPROVAL-GATED]`
- Competitor rank tracking for the same keywords (extends Competitor axis later)
- Keyword research / volume / difficulty discovery (separate concern)
- Automatic keyword suggestions
- SERP feature ownership analytics beyond basic capture
- Historical backfill before first registration

---

## 3. Data Model (DB design)

Mirrors the **config-entity + event-history** pattern already used by `UptimeMonitor` + `UptimeEvent`
(not the single-shot `*Result` pattern, because keywords are long-lived tracked entities).

### 3.1 `TrackedKeyword` (config entity)

| Field | Type | Notes |
|-------|------|-------|
| id | String @id @default(cuid()) | |
| projectId | String | FK → Project, `onDelete: Cascade` |
| keyword | String | search term |
| targetUrl | String | domain/URL we track ranking for |
| country | String | e.g. "jp" (DataForSEO location) |
| language | String | e.g. "ja" |
| device | `RankDevice` enum (DESKTOP / MOBILE) @default(DESKTOP) | |
| enabled | Boolean @default(true) | |
| lastCheckedAt | DateTime? | |
| lastPosition | Int? | denormalized latest position (null = not in top-N / not found) |
| createdAt | DateTime @default(now()) | |
| snapshots | KeywordRankSnapshot[] | relation |

Indexes: `@@index([projectId])`, `@@unique([projectId, keyword, country, language, device])` (no duplicate tracking).

### 3.2 `KeywordRankSnapshot` (history)

| Field | Type | Notes |
|-------|------|-------|
| id | String @id @default(cuid()) | |
| keywordId | String | FK → TrackedKeyword, `onDelete: Cascade` |
| position | Int? | null = not found in fetched depth |
| rankedUrl | String? | the URL that ranked (may differ from targetUrl) |
| serpFeatures | Json @default("{}") | featured snippet / PAA / local pack flags (raw retained for traceability per NFR-30) |
| source | String | provider tag, e.g. "dataforseo" (mirrors FR-80 source tagging) |
| capturedAt | DateTime @default(now()) | |

Indexes: `@@index([keywordId])`, `@@index([keywordId, capturedAt])`.

### 3.3 Enum

```
enum RankDevice { DESKTOP  MOBILE }
```

### 3.4 RLS & retention
- RLS policies scoped by `projectId` membership, identical pattern to existing axis tables (Doc-06).
- Raw provider response retained on snapshot per NFR-30 (≥90 days, configurable).
- Prisma migration applied manually by user (existing convention); regenerate `database.types.ts` after.

---

## 4. API Design

Mirrors existing `/api/projects/[projectId]/<axis>` shape (POST=write w/ admin-insert, GET=RLS-scoped read) and `/api/cron/*` (fail-closed bearer).

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| POST | `/api/projects/[projectId]/keywords` | Register a tracked keyword | session + role≥Analyst |
| GET | `/api/projects/[projectId]/keywords` | List tracked keywords + latest position | session (RLS) |
| DELETE | `/api/projects/[projectId]/keywords/[keywordId]` | Stop tracking | session + role≥Analyst |
| GET | `/api/projects/[projectId]/keywords/[keywordId]/history` | Rank snapshot history | session (RLS) |
| POST | `/api/projects/[projectId]/keywords/[keywordId]/refresh` | Manual single-keyword fetch (optional MVP) | session + role≥Analyst |
| GET/POST | `/api/cron/rank-fetch` | Scheduled batch fetch for all enabled keywords | **fail-closed bearer (CRON_SECRET)** |

- All inputs validated server-side (NFR-12), e.g. zod (existing pattern).
- Provider calls go through a single `rank-tracker.ts` service (see §6.3) so the provider is swappable (NFR-40).
- Rate-limit write endpoints via existing Upstash limiter.

---

## 5. UI Design

New axis page + sidebar nav entry, consistent with existing dashboard pages.

- **Sidebar:** add primary-group entry **"Rankings"** (suffix `/rankings`, icon e.g. `TrendingUp`/`LineChart`) near "Search Visibility" in `app-sidebar.tsx`. (Nav addition only — no change to existing entries.)
- **Page `/dashboard/[projectId]/rankings`:**
  - Keyword table: keyword · device · country · current position · Δ vs previous · last checked.
  - "Add keyword" form (keyword, targetUrl prefilled from project, country, language, device).
  - Per-keyword detail: position trend chart (reuse existing Recharts `axis-trend-chart` style) over history.
  - **Improvement actions panel:** rule-based, non-scored messages derived from position deltas and presence in Search Console (link to existing GSC panel). No numeric score.
- **Empty/error/loading states** per NFR-52 (meaningful messages; failed fetches surfaced, not swallowed — aligns with BL-06).
- Mobile-not-broken (NFR-51).

---

## 6. External API Selection

### 6.1 Comparison

> ⚠️ Pricing/quotas below are **indicative and must be verified against each provider's current
> official pricing** before contracting (figures shift; do not treat as committed). Recorded here
> for structure, not as fact.

| Criterion | **DataForSEO** | SerpApi | Zenserp | Self-built scraping |
|-----------|----------------|---------|---------|---------------------|
| Model | Pay-per-request (queue / live modes) | Monthly subscription tiers (per-search) | Credit/subscription | Infra + dev time |
| Cost shape | Lowest marginal cost at scale; batch-friendly | Higher per-search; predictable monthly | Mid | "Free" API, high hidden cost |
| Reliability | High; designed for SERP at scale | High | Medium | Low (CAPTCHA/IP blocks) |
| Compliance (Google ToS) | Vendor assumes fetching | Vendor assumes fetching | Vendor assumes fetching | **High risk — likely ToS breach, IP bans** |
| Maintenance | Vendor-maintained parsing | Vendor-maintained | Vendor-maintained | **High — ongoing parser/proxy upkeep** |
| Geo/device targeting | Extensive (location + language + device) | Good | Good | DIY |
| SERP features | Rich structured output | Rich | Moderate | DIY |
| SiteLens fit (SaaS stability) | **Best** | Good | OK | **Unsuitable for MVP** |

### 6.2 Recommendation
- **Primary: DataForSEO** — lowest marginal cost, batch/queue model fits scheduled bulk fetches, broad geo/device targeting, vendor-maintained parsing.
- **Fallback: SerpApi** — if predictable flat-rate billing is preferred or DataForSEO onboarding blocks.
- **Self-built scraping: rejected for MVP** — per R3: Google ToS exposure, CAPTCHA, IP/proxy management, and continuous maintenance make it unstable for a SaaS. Reconsider only as a far-future cost-optimization with legal review.

### 6.3 Abstraction
- Single provider-agnostic service `src/lib/services/rank-tracker.ts` exposing `fetchRank({keyword, targetUrl, country, language, device})`.
- Provider selected via env var (e.g. `RANK_PROVIDER=dataforseo`); credentials via env only (NFR-11). This satisfies "swappable source" (NFR-40) and lets the comparison decision be reversed without schema/UI change.

---

## 6.4 Cost Estimation (formula, not a quote)

Monthly request volume:

```
requests/month = (# enabled keywords) × (fetches per day) × 30
```

Sample (verify unit price with provider):

| Keywords | Frequency | Requests/mo | Notes |
|----------|-----------|-------------|-------|
| 50 | weekly | ~215 | low cost; good MVP default |
| 50 | daily | ~1,500 | moderate |
| 200 | daily | ~6,000 | scale check needed |

- MVP default cadence recommendation: **weekly** (cost-light, sufficient signal), with optional manual refresh.
- Add a per-project keyword cap + cadence setting to bound cost (config, not scoring).

---

## 7. Risks

| ID | Risk | Mitigation |
|----|------|-----------|
| RK-1 | External API cost overrun | keyword cap + weekly default cadence + cost setting; monitor usage |
| RK-2 | Provider outage / quota | provider abstraction (§6.3) enables fallback to SerpApi |
| RK-3 | Rank volatility produces noisy trends | store raw + show smoothed/Δ; no alerting on single fluctuation in MVP |
| RK-4 | Scope creep into scoring | §0 guard; 0–100 score is approval-gated |
| RK-5 | Secret leakage (API key) | env-only, never client-side (NFR-11) |
| RK-6 | Silent fetch failures | record failed fetch + reason on snapshot/log (aligns BL-06, FR-24) |

---

## 8. Open Questions (resolve before/at implementation)

| ID | Question | Owner |
|----|----------|-------|
| OQ-11-1 | Final provider + contract tier (DataForSEO confirmed as primary?) | Product |
| OQ-11-2 | MVP default cadence (weekly recommended) and per-project keyword cap | Product |
| OQ-11-3 | Where do "improvement actions" live — new findings or page-local panel? | Eng/Product |
| OQ-11-4 | Should rankings feed the cross-axis "Site Health" overview (display only, no score)? | Product |

---

## 9. Next Steps (after approval of this plan)

1. Approve provider (DataForSEO) + cadence/cap defaults.
2. Add `TrackedKeyword` / `KeywordRankSnapshot` / `RankDevice` to Prisma schema; migration + RLS; regenerate types.
3. Implement `rank-tracker.ts` (provider-agnostic) + DataForSEO adapter.
4. API routes (§4) + `/api/cron/rank-fetch` (fail-closed).
5. Dashboard page + sidebar nav + trend chart + improvement-actions panel.
6. Verify (lint/build/E2E smoke); no change to existing axis logic.

---

## 10. Environment Variables

Set these in the deployment environment (Vercel) / local `.env.local`. **Never commit real
values or secrets** — names and purpose only are documented here. (`.env.example` is
protected from edits in this workspace, so the canonical list lives here.)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATAFORSEO_LOGIN` | yes (for live fetch) | DataForSEO API login (Basic auth). Provider credential. |
| `DATAFORSEO_PASSWORD` | yes (for live fetch) | DataForSEO API password (Basic auth). Provider credential. |
| `RANK_PROVIDER` | no (default `dataforseo`) | Active rank provider id. Swap providers without code changes. |
| `RANK_PLAN_TIER` | no (default `internal`) | Active plan tier: `internal` / `starter` / `pro` / `agency`. |
| `RANK_LIMIT_INTERNAL` | no (default `10`) | Max tracked keywords per project — internal tier. |
| `RANK_LIMIT_STARTER` | no (default `50`) | Max tracked keywords per project — starter tier. |
| `RANK_LIMIT_PRO` | no (default `200`) | Max tracked keywords per project — pro tier. |
| `RANK_LIMIT_AGENCY` | no (default `1000`) | Max tracked keywords per account — agency tier. |
| `RANK_FETCH_CADENCE_HOURS` | no (default `168`) | Cron fetch cadence in hours (168 = weekly). |
| `CRON_SECRET` | yes | Bearer secret for `/api/cron/rank-fetch` (shared with existing cron routes). |

> Credentials are read from env only and are never hardcoded; if `DATAFORSEO_*` are absent,
> the adapter throws a clear error (no silent failure).
