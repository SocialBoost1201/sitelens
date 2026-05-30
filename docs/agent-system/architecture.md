# Agent System — Architecture

## Layers (thin → thick)

1. **README.md** — human orientation
2. **AGENTS.md** — always-read execution contract (repo-wide, thin)
3. **docs/agent-system/** — meta-layer: rules about rules (this directory)
4. **docs/ai/** — operating documents (execution-contract, handoff, runtime-shelf, decision-log)
5. **docs/** — domain docs (design-spec, seo-geo-meo, etc.)
6. **.claude/rules/** — scoped operating rules loaded on demand per task type
7. **.claude/skills/** — workflow skills invoked per task
8. **.codex/** — Codex-specific allowlists and rules
9. **memory/** — persistent preferences and feedback

## Flow

User prompt → agent reads AGENTS.md → routes task → loads matching rule file and skill → executes → reports.

## Rule of Thumb

- AGENTS.md answers: "what must never happen."
- `.claude/rules/` answers: "how to do this task type."
- `.claude/skills/` answers: "step-by-step for this workflow."
- `docs/agent-system/` answers: "how the above is organized."

## Boundary

No layer duplicates another. If a rule fits two layers, it belongs in the thinner one only referenced from the thicker one.
