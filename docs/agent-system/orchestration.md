# Agent System — Orchestration

## Roles

- **ChatGPT** — planning, ideation, cross-repo strategy. No direct file writes in this repo.
- **Claude Code** — implementation, refactoring, test writing, documentation.
- **Codex** — implementation, final verification, browser/DOM checks, MCP-driven validation.
- **Antigravity** — high-level orchestration, multi-step planning. Never performs final verification.
- **Audit agent** — review-only. Produces findings, not fixes.
- **Explorer agent** — read-only investigation. Produces evidence, not changes.

## Collaboration Rules

- One agent owns one task at a time; no parallel writes to the same file
- Handoff must include: current state, files touched, open questions, next step
- Picking up another agent's work requires running the repo's validation commands first
- No silent undo of another agent's changes — document the reason
- Approval gate in AGENTS.md applies equally to all agents

## Decision Authority

- User approves execution
- Implementation agent executes
- Audit agent validates
- Codex performs final verification
- No agent self-approves its own final verification

## Conflict Resolution

If two agents disagree on an approach, the one with direct evidence (file contents, command output) wins. Opinion-only arguments lose.

## Handoff Triggers

Handoff is required when:
- Session ends mid-task
- Task type changes and a different agent is better suited
- Context budget is exhausted
- User explicitly switches agents
