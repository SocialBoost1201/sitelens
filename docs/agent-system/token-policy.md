# Agent System — Token Policy

## Compactness Rules

- AGENTS.md ≤ 50 lines
- Each `.claude/rules/NN-*.md` ≤ 120 lines
- Each `docs/agent-system/*.md` ≤ 60 lines
- Skill `SKILL.md` ≤ 150 lines; longer content goes in sub-files loaded on demand
- No redundant intros, no meta-commentary

## Relocate When
- AGENTS.md grows a library-specific rule → move to `.claude/rules/`
- A rule file grows step-by-step procedure → move to `.claude/skills/`
- A skill grows reference material → split into `REFERENCE.md` loaded on demand
- Any file grows examples → keep one canonical example, delete the rest

## Avoid
- Long prose explanations in always-read files
- Quoting code that is already in the repo
- Repeating the same constraint in multiple sections
- Tables with fewer than 3 meaningful rows
- Lists of "things not to do" that restate the obvious

## Prefer
- Short imperative bullets
- References (`see docs/ai/execution-contract.md`) over inlined content
- Deleting over rewriting
- One canonical source per rule

## Review Trigger

Any file exceeding its line budget triggers a split or relocation — not a tightening pass.
