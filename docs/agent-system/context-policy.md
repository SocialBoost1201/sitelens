# Agent System — Context Policy

## Always-Read
- AGENTS.md (repo root)
- Global agent contract (user / org-level)

## On-Demand
- `.claude/rules/NN-*.md` — load only the file matching current task type
- `.claude/skills/<skill>/` — load when the skill is invoked
- `docs/ai/*` — load when referenced by AGENTS.md or a rule file
- `docs/agent-system/*` — load only when editing the agent system itself
- Domain docs (`docs/design-spec-*`, `docs/seo-geo-meo/*`) — load only for matching work

## Progressive Disclosure

1. Read AGENTS.md
2. Identify task type
3. Load the single matching rule file
4. Load at most 3 skills relevant to that rule
5. Load domain docs only if the task actually touches that domain

## Never in AGENTS.md
- Library-specific patterns (belongs in `.claude/rules/`)
- Workflow step-by-step (belongs in `.claude/skills/`)
- Historical context or rationale (belongs in decision log)
- Code examples (belongs in rule file if essential, otherwise omit)
- Temporary project state (belongs in memory)

## Context Budget
- Max 3 rule files loaded simultaneously
- Max 3 skills active at once
- Domain docs loaded one at a time, unloaded when task changes
