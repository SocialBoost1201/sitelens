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
# Install dependencies and generate Prisma client
npm run setup

# Start development server
npm run dev

# Lint
npm run lint

# Build (production check)
npm run build

# Optional: validate repo-local MCP Figma wiring
npm run mcp:figma:doctor
npm run mcp:figma:test
```

The app runs at `http://localhost:3000` by default.

Environment variables: copy `.env.example` → `.env.local` and fill in values.

---

## MCP Figma Workflow

SiteLens includes a repo-local MCP Figma workflow for VS Code, aimed at keeping
the setup honest and minimal:

- Workspace defaults live in `.vscode/settings.json`
- Quick validation tasks live in `.vscode/tasks.json`
- CLI checks live in `scripts/mcp-figma.mjs`

### Verified in this repository

| Capability | Status | Notes |
|---|---|---|
| Workspace-level `mcpFigma.*` settings | ✅ Included | Shared in `.vscode/settings.json` |
| Repo-local connection checks | ✅ Included | `npm run mcp:figma:doctor` and `npm run mcp:figma:test` |
| Node.js requirement (18+) | ✅ Met locally | Current machine is already above the minimum |

### Not implemented by this repository

| Capability | Status | Notes |
|---|---|---|
| One-click assistant config in home directories | Manual / external | This repo does not edit `~/.cursor`, Claude Desktop, or Windsurf config files |
| WebSocket server lifecycle from VS Code | External extension feature | The server is managed by the MCP Figma extension, not by SiteLens |
| Figma plugin installation | Manual / external | Follow the extension or Figma Community install flow |
| Status bar / explorer UI | External extension feature | Provided by the extension when installed in VS Code |

See `docs/08_operations/Doc-08_OperationsDesign_v0.1.md` for the project-specific runbook.

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
