# Agent System — File Roles

One-line responsibility per layer. If a file's purpose doesn't fit, it doesn't belong in that layer.

- **README.md** — human-facing project orientation. Not read by agents for operating rules.
- **AGENTS.md** — always-read execution contract. Thin, durable, imperative.
- **docs/agent-system/** — meta-layer defining how the agent system itself is organized.
- **docs/ai/** — operating documents referenced by agents (execution-contract, handoff-protocol, runtime-shelf, skills-selection-policy, decision-log).
- **docs/** — domain documentation (design, SEO, architecture). Loaded only when the task touches that domain.
- **.claude/rules/** — scoped operating rules. One file per task type (core, git, architecture, UI, data, testing, reporting, skill-loading, multi-agent).
- **.claude/skills/** — workflow skills. One directory per reusable workflow. Invoked when triggered.
- **.claude/skills-runtime/** — task-scoped skills loaded per session, unloaded when done.
- **.agent/skills/** — legacy skill vault. Reference only. Do not bulk-load.
- **.codex/** — Codex-specific allowlists, rules, and agent profiles.
- **memory/** — persistent user preferences and feedback (out of repo when personal).

## Off-Limits Cross-Layer Patterns

- Rules must not contain workflows (those go to skills)
- Skills must not contain permanent policy (that goes to rules)
- AGENTS.md must not contain library patterns (those go to rules)
- docs/ must not contain execution rules (those go to AGENTS.md or rules)
