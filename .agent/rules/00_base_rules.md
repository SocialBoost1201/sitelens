# Agent Base Rules — SiteLens

These rules apply to all agents working in this repository.

## Scope

- Work only inside this repository.
- Do not modify global config files or other projects.

## Before Writing Code

- For complex or multi-file changes: produce an Implementation Plan first.
- For large architectural changes: get explicit user approval before writing any code.

## During Implementation

- Prefer minimal-diff edits. Do not refactor unrelated code.
- Do not create unnecessary files or directories.
- Do not overengineer. Choose the simplest viable solution.
- Never hardcode secrets. Use `.env.local` (not committed).

## Documentation

- When architecture changes, update the relevant doc in `docs/`.
- Keep `docs/00_index/Doc-00_DocumentIndex_v1.0.md` current with all new documents.
- Mark placeholder documents with `[WIP]` or `[DRAFT]`.

## After Changes

Report:
1. Files created or modified (explicit list)
2. Verification performed (build, lint, type-check)
3. Risks or assumptions made

## Current Phase

Foundation / Setup. Do not build dashboard UI, fake analytics, or business logic
until architecture is approved and documented.
