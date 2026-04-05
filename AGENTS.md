<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# AGENTS.md — SiteLens Project

## Repository Identity

This repository is **SiteLens** — a unified website analysis and audit dashboard.

## Scope Boundary

- All work must stay within this repository.
- Do not modify other projects or global configuration files.
- External network requests must have explicit user approval.

## Workflow Requirements

- **Complex or multi-file changes** require an Implementation Plan before execution.
- **Large architectural changes** require explicit user approval before any code is written.
- **Minimal-diff edits** are preferred. Avoid refactoring unrelated code.
- Do not create unnecessary files or directories.
- Do not overengineer. Prefer the simplest viable solution.

## Documentation Rules

- When architecture changes, update the relevant document in `docs/`.
- Keep `docs/00_index/Doc-00_DocumentIndex_v1.0.md` current with all new documents.
- Placeholder documents should be marked with `[WIP]` or `[DRAFT]` status.

## Reporting Requirements

After every significant change, report:
1. Files created or modified (explicit list)
2. Verification performed (build, lint, dev server check)
3. Risks or assumptions made

## Stack Context

- Next.js 16 (App Router) + TypeScript
- Planned integrations: Vercel, Supabase, Prisma, Playwright, Lighthouse CI, Sentry, PostHog
- Environment variables are documented in `.env.example` — never hardcode secrets

## Current Phase

**Foundation / Setup** — Full feature implementation has not started.
Do not build dashboard UI, fake analytics widgets, or business logic until architecture is approved.
