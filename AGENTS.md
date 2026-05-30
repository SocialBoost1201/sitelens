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

## Core rules

- Plan-first
- Minimal diff
- No unrelated refactor

## Logic protection

- DO NOT change scoring logic without approval.
- DO NOT modify data parsing rules broadly.
- DO NOT alter evaluation thresholds.

## Data integrity

- DO NOT introduce fake/mock data.
- DO NOT ignore error states.
- DO NOT silently fail API calls.

## Agent boundaries

- implementation -> coding only.
- audit -> analysis only.
- explorer -> investigation only.

## Context isolation

- Repo-only scope.
- No cross-project references.

## Stop conditions (STRICT)

- Scoring logic change required.
- Data interpretation unclear.
- API behavior uncertain.
- Multiple modules impacted.
- Requirements unclear.

When any stop condition is met: STOP and ask before proceeding.

## Hard safety rules

- ZERO incorrect data interpretation allowed.
- ZERO scoring inconsistency allowed.
- ZERO silent failure allowed.

---

## Multi-Agent Workflows

> 追記: 2026-04-14

- `.agent/rules/multi-agent-operating-rules.md` — エージェント役割・禁止事項
- `.agent/workflows/task-intake-and-routing.md` — タスクルーティング
- `.agent/workflows/artifact-first-large-task.md` — 大規模タスク手順
- `.agent/workflows/freeze-prevention-check.md` — フリーズ防止チェック
## Retrieval Priority

Always minimize context usage.

Use retrieval tools in the following order:

1. mgrep
2. serena-slim
3. serena
4. claude-mem

Rules:
- Never load unnecessary context
- Avoid broad semantic searches
- Prefer surgical retrieval
- Read only required files
- Use docs as source-of-truth
- Avoid injecting entire histories or unrelated memories

Use:
- mgrep for exact structure/pattern search
- serena-slim for lightweight semantic navigation
- serena for deep relationship/code understanding
- claude-mem only for long-term rationale/history lookup

Preferred workflow:
mgrep -> serena-slim -> serena -> claude-mem

Never start with claude-mem unless historical reasoning is explicitly required.


<claude-mem-context>
# Memory Context

# [SiteLens] recent context, 2026-05-26 11:02pm GMT+9

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 26 obs (7,119t read) | 665,152t work | 99% savings

### May 25, 2026
9240 4:44p 🔵 WEBアプリ開発に必要な要素の分析
9252 4:49p 🔴 Fix React hook rule violation in score-ring.tsx
9253 " ✅ Build process completes successfully
9254 " ✅ Animation tests pass with ESM warnings
9255 " 🔴 Fix E2E test failure due to port binding error
### May 26, 2026
9264 12:48a 🔵 SiteLens project directory confirmed
9266 " ✅ Codex IDE assistant mode initialized for SiteLens project
9270 " 🔵 No project-specific memories found for SiteLens
9277 12:49a 🔵 Project documentation and configuration files identified
9296 " 🔵 Key technologies and concepts identified in SiteLens project files
9323 " 🔵 Modified and untracked files identified in SiteLens repository
9360 " 🔵 Recent Git commits analyzed
9274 " ✅ Project and Environment Initialization
9281 " ✅ Project Activation
9432 " 🔵 SiteLens project setup status and remaining tasks identified
9462 " 🔵 SiteLens implementation plan and technical architecture details
9517 " 🔵 Vercel project configuration identified
9284 " ✅ ScoreRing Component Implementation
9310 " ✅ Project Dashboard Page Implementation
9329 " ✅ Refactor ScoreRing Component State Management
9354 12:50a ✅ Remove Unused Button Import
S55 Refactor project detail page and fix linting errors (May 26 at 12:51 AM)
S54 Refactor project detail page and fix linting errors (May 26 at 12:51 AM)
S56 Fix P0 E2E blocker related to public path handling and Supabase configuration. (May 26 at 12:51 AM)
S57 Fix P0 E2E blocker: Public route handling and Supabase client initialization. (May 26 at 12:55 AM)
S65 Standardize cron endpoint authentication to fail-closed. (May 26 at 12:55 AM)
10918 1:03a ✅ User input processed
10953 " ✅ Project activated
10993 " 🔵 Uptime cron job logic inspected
11007 " 🔵 Audit cron job logic inspected
11035 " 🔵 Weekly report cron job logic inspected
S66 Prioritize and plan upcoming development tasks. (May 26 at 1:04 AM)
S64 Standardize cron endpoint authentication to fail-closed. (May 26 at 1:04 AM)
S67 Prioritize and plan upcoming development tasks. (May 26 at 1:06 AM)
**Investigated**: A prioritized list of upcoming development tasks was presented, categorized into P0 (critical) and P1 (next). The P0 items include implementing SSRF protection for external URL inputs, clarifying the status and implementation of the Public Share feature, ensuring webhook secrets follow a fail-closed approach, and updating the README and root page to reflect current implementation status.

**Learned**: It was learned that several critical security vulnerabilities (SSRF) need to be addressed, particularly for features that interact with external URLs. The handling of the Public Share feature requires a decision on whether to include it in the MVP or hide it. Consistency in fail-closed security practices across different endpoints (webhooks, notifications) is important. Additionally, documentation and E2E tests need to be updated to match the actual implementation status.

**Completed**: The previous P0 task of standardizing cron endpoint authentication to fail-closed has been completed. Linting and build commands were successful after these changes.

**Next Steps**: The recommended next step is to address the P0 item: "URL入力の安全対策" (URL input safety measures), which involves implementing SSRF protection for features that fetch external URLs. Other P0 items, such as clarifying the Public Share feature's status and ensuring webhook secret fail-closed behavior, are also high priorities.


Access 665k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>