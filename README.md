# SiteLens

> Unified website analysis and audit dashboard.

---

## Current Phase

**Foundation / Setup** — Architecture definition and initial project scaffolding only.
Full feature implementation has not started.

---

## Purpose

SiteLens is a unified platform for website quality analysis, integrating tools such as:

- Google PageSpeed Insights / Lighthouse
- Google Search Console
- Rich Results validation
- Structured data auditing
- Custom reporting and audit workflows

The goal is to provide a single, clean interface for monitoring and improving website performance, SEO health, and technical quality.

---

## Expected Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Database | Supabase (PostgreSQL) + Prisma ORM |
| Auth | Supabase Auth |
| Deployment | Vercel |
| E2E Testing | Playwright |
| Performance CI | Lighthouse CI |
| Error Tracking | Sentry |
| Analytics | PostHog |
| Cache | Upstash Redis |

---

## Planned Integrations

- **PageSpeed Insights API** — Core Web Vitals, performance scoring
- **Google Search Console API** — Impressions, clicks, query data
- **Lighthouse CI** — Automated audit pipelines
- **Rich Results Test** — Structured data validation
- **Sentry** — Runtime error tracking
- **PostHog** — Product analytics and session replay

---

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Lint
npm run lint

# Build (production check)
npm run build
```

The app runs at `http://localhost:3000` by default.

Environment variables: copy `.env.example` → `.env.local` and fill in values.

---

## Documentation

All design and architecture documents are located in `docs/`:

| Directory | Content |
|---|---|
| `docs/00_index/` | Document index |
| `docs/01_requirements/` | Requirements definition |
| `docs/02_basic_design/` | System basic design |
| `docs/03_detail_design/` | Database detail design |
| `docs/04_technical_design/` | Technical architecture |
| `docs/05_test_design/` | Test design |
| `docs/06_security/` | Security design |
| `docs/07_performance/` | Performance design |
| `docs/08_operations/` | Operations design |

---

## Operating Principles

- Work must stay within this repository.
- Complex changes require an Implementation Plan before execution.
- Large architectural changes require explicit user approval.
- Never hardcode secrets. Use `.env.local` (not committed).
- Minimal-diff edits are preferred.
- See `AGENTS.md` for agent-specific rules.

---

## Repository Structure

```
SiteLens/
├── src/
│   └── app/              # Next.js App Router
│       ├── layout.tsx
│       ├── page.tsx
│       └── globals.css
├── public/               # Static assets
├── docs/                 # Design documents
├── .agent/               # Agent operation files
│   ├── rules/
│   ├── skills/
│   ├── memory/
│   └── workflows/
├── AGENTS.md             # Agent operating rules
├── .env.example          # Environment variable template
└── README.md             # This file
```
