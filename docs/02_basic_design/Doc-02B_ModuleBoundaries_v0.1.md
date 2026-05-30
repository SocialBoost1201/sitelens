# Doc-02B: Core vs Extension Module Boundaries

**Project**: SiteLens  
**Version**: 0.1  
**Status**: ACTIVE  
**Last Updated**: 2026-04-10  
**Owner**: Product + Architecture

---

## Purpose

This one-page note defines non-negotiable module boundaries to prevent scope
drift and preserve MVP buildability.

When conflicts exist, this document overrides module naming and IA decisions in
older drafts.

---

## Core MVP Modules

### Website Health (Core)

- Includes: audit runs, findings, CWV, SEO audit checks, security checks, broken links.
- Primary question: what is broken or regressing on the site?
- Must not include: keyword rankings, GSC aggregate performance, GA4 outcomes, GBP local metrics.

### Search Visibility (Core)

- Includes: GSC daily metrics and tracked keyword/ranking snapshots.
- Primary question: is search visibility improving for important queries and pages?
- Must not include: technical audit findings or GA4 conversion reporting.

### Reporting & Alerts (Core Service)

- Includes: project summary, trend views, threshold violation surfacing, basic report export.
- Primary question: what changed and what needs attention now?
- Must not include: causal claims about business outcomes.

---

## Extension Modules (Post-MVP)

### Local SEO (Extension)

- Includes: GBP locations and local support signals.
- Positioning: support context for local visibility, not primary MVP identity.
- Must not be labeled as MEO ranking truth.

### Outcomes (Extension)

- Includes: GA4 outcome/behavior metrics.
- Positioning: impact context after visibility and site-health interpretation.
- Must not be shown as search visibility source of truth.

### GEO Intelligence (Future)

- Includes: AI-search/GEO experimental visibility analysis.
- Positioning: future advanced module only.
- Must not be introduced into MVP scoring or promises.

---

## IA Enforcement Rules

1. `Search Visibility` must be a first-class project section.
2. `Local SEO` must appear under `Extensions`, not as a peer to core sections.
3. `GA4` must appear under `Extensions > Outcomes`.
4. `GEO` must be explicitly marked as future/experimental.
5. Core navigation labels must avoid “GBP-first” product identity.

---

## Delivery Guardrails

- MVP changes may expand depth inside core modules, but may not add new primary
  pillars without product-owner approval.
- Extension modules can ship incrementally without changing core product promise.
- Product messaging must preserve the sequence:
  `Website Health -> Search Visibility -> Local/Outcome context`.

