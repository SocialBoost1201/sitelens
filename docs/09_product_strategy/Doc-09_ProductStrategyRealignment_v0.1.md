# Doc-09: Product Strategy Realignment

**Project**: SiteLens  
**Version**: 0.1  
**Status**: ACTIVE — baseline alignment document  
**Last Updated**: 2026-04-10  
**Owner**: Product Strategy / Architecture

---

## 1. Product Definition

### 1.1 Short definition

SiteLens is a unified search visibility and site intelligence platform that
connects site quality signals with search and local visibility outcomes.

### 1.2 Expanded definition

SiteLens helps teams detect technical site issues, monitor search visibility, and
understand whether improvements are moving real outcomes. It starts from reliable
website health intelligence, layers in search visibility evidence (GSC + keyword
rankings), and adds local visibility and outcomes as supporting modules in a
phased, implementation-realistic roadmap.

### 1.3 What SiteLens is

- A decision-support product for SEO and visibility operations.
- A system linking `site health -> visibility movement -> outcome context`.
- A project-based intelligence workspace for agencies, consultants, and in-house teams.

### 1.4 What SiteLens is not

- Not an all-in-one growth suite or BI warehouse.
- Not a local rank tracker replacement on day one.
- Not an AI auto-remediation product.
- Not a GEO-first product in MVP.

### 1.5 Team framing and external positioning

- Internal framing: Core is website quality + search visibility intelligence.
  Local SEO (GBP) and outcomes (GA4) are extension layers. GEO is future.
- External positioning: One operating view for site health and search visibility
  so teams can show what changed, why it changed, and what to do next.

---

## 2. Product Pillars

| Pillar | Purpose | MVP Role | Core or Extension |
|---|---|---|---|
| Website Health | Detect technical issues and regressions | Primary MVP foundation | Core |
| Search Visibility | Track discoverability in search | Primary MVP differentiator (narrow) | Core |
| Local Visibility | Add local-intent support signals | Post-MVP | Extension |
| Impact / Outcomes | Connect visibility to business outcomes | Post-MVP | Extension |
| Reporting & Alerts | Cross-layer communication and monitoring | MVP-lite + iterative expansion | Core service |

### 2.1 Explicit placement

- Website Health: Core Web Vitals, SEO audit checks, security, broken links.
- Search Visibility: GSC and keyword ranking.
- Local Visibility: GBP data (support module, not MVP identity).
- Impact / Outcomes: GA4.
- Future advanced visibility: GEO / AI-search visibility.
- Cross-layer services: reporting, alerts, comparison views.

---

## 3. MVP vs Expansion

### 3.1 MVP included (strict)

- Site health core: audit runs, findings, CWV/SEO/security/broken links.
- Search visibility core (narrow): GSC daily metrics + tracked keywords +
  basic ranking snapshots.
- Core reporting baseline and in-app alerting baseline.

### 3.2 MVP excluded

- GA4 integration.
- GBP as a primary navigation pillar.
- Local map ranking and MEO ranking.
- GEO visibility analysis.
- Advanced causation-style comparison logic.
- Heavy automation and orchestration.

### 3.3 Post-MVP

- Full Local SEO extension (GBP module).
- Outcomes extension (GA4).
- Stronger comparison transforms above raw data.
- Notification channel maturation and hardened sharing.

### 3.4 Future

- GEO / AI-search visibility intelligence.
- Causality-oriented impact modeling.
- Multi-workspace enterprise governance.

---

## 4. Information Architecture

### 4.1 Top-level navigation

- Dashboard
- Projects
- Reports
- Alerts
- Settings

### 4.2 Per-project navigation baseline

- Overview
- Search Visibility
- Website Health
- Reports
- Extensions
- Settings

### 4.3 Extensions policy

- Extensions group is mandatory.
- Local SEO belongs under `Extensions > Local SEO`.
- GA4 belongs under `Extensions > Outcomes`.
- GEO belongs under `Extensions > GEO Lab` (future only).
- GBP must not appear as a top-level peer competing with core MVP sections.

---

## 5. Data Model Direction

### 5.1 Core models (MVP)

- `Project`, `AuditRun`, `Metric`, `Finding`, `AlertRule`, `AlertViolation`
- `TrackedKeyword`, `KeywordRankingSnapshot`, `SearchConsoleMetricDaily`

### 5.2 Extension models (post-MVP)

- `Ga4MetricDaily`, `GbpDailyMetric`

### 5.3 Operational support model

- Optional `IntegrationSyncRun` model for freshness and sync traceability.

### 5.4 Guardrails

- Do not overload `Metric`/`Finding` to store ranking, GSC, GA4, and GBP in an
  indistinguishable shape.
- Keep each data family answering one business question clearly.

---

## 6. Integration Strategy

| Source | Primary Use | MVP/Later | UI Positioning |
|---|---|---|---|
| PSI/Lighthouse | Technical baseline | MVP | Website Health |
| GSC | Search visibility evidence | MVP | Search Visibility |
| Ranking source | Target keyword position tracking | MVP (narrow) | Search Visibility |
| GBP | Local support signals | Post-MVP | Extensions > Local SEO |
| GA4 | Outcomes context | Post-MVP | Extensions > Outcomes |
| GEO / AI search | Emerging visibility intelligence | Future | Extensions > GEO Lab |

### 6.1 Clarifications

- GSC and ranking are complementary, not substitutes.
- GBP is support data, not the primary visibility source of truth.
- GA4 is outcomes data, not visibility data.
- GEO remains experimental until data contracts and interpretation quality mature.

---

## 7. Revenue / Packaging

### 7.1 Recommended tiering

- `Lite`: Website Health core.
- `Standard`: Website Health + Search Visibility core.
- `Pro`: Higher keyword/data limits and stronger comparison/reporting.
- `Agency`: Multi-project/team workflows and client reporting controls.

### 7.2 Usage and add-ons

- Usage levers: projects, tracked keywords, retention, sync frequency, seats.
- Add-ons: Local SEO Pack (GBP), Outcomes Pack (GA4), GEO Intelligence Pack (future).

### 7.3 Sales sentence

SiteLens replaces fragmented SEO reporting workflows by combining site quality
and search visibility evidence in one operating view.

---

## 8. Risks / Constraints

| Risk | Why it matters | Mitigation |
|---|---|---|
| Tool bloat | Loss of focus and build speed | Enforce core vs extension boundaries |
| Scope confusion | Teams build everything at once | Freeze MVP inclusion/exclusion list |
| GSC vs ranking confusion | Misread visibility signals | Separate modules and language |
| GBP vs MEO confusion | Overclaiming local capability | Keep GBP labeled as support-only |
| GEO immaturity | Low-trust outputs | Keep GEO in future experimental lane |
| Data freshness expectations | User trust erosion | Show source freshness metadata |
| Causation confusion | Misleading claims | Phrase as association, not causality |
| Multi-API complexity | Reliability risk | Add sync run observability and staged rollout |

---

## 9. Immediate Next Actions

1. UI/IA now: promote Search Visibility in project navigation and keep Local SEO
   under Extensions.
2. Docs now: update Doc-01/02/04 terminology and glossary distinctions.
3. Data model next: prioritize tracked keywords, ranking snapshots, GSC daily
   metrics, and optional sync-run traceability.
4. Technical next: implement GSC ingestion and basic search visibility views
   before GA4/GBP expansion.
5. Wait: GEO and advanced impact attribution until raw + transform layers stabilize.

