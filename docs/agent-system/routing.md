# Agent System — Routing

## Task → Agent

- **Implementation** (code edits, feature work, bug fix) → Claude Code or Codex
- **Audit** (review, regression check, security, architecture) → Audit agent or Codex audit profile
- **Explorer** (read-only investigation, tracing, evidence gathering) → Explorer agent
- **Planning / orchestration** (multi-step design, cross-repo coordination) → Antigravity or ChatGPT
- **Browser / DOM / console / network verification** → Codex with isolated Chrome DevTools MCP
- **Final verification** → Codex only

## Hard Boundaries

- Antigravity does not perform final verification
- Explorer does not modify files
- Audit does not implement fixes in the same pass as review
- Chrome DevTools MCP requires explicit user approval per session
- No agent may bypass the approval gate defined in AGENTS.md

## Escalation

If the task type is ambiguous, stop and ask rather than guess. Misrouting costs more than a clarifying question.
