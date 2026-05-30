# Agent System — Conventions

## Naming
- Files use kebab-case
- Rule files: `NN-topic.md` (numbered for load order)
- Skill directories: `verb-object` form (e.g., `commit-writer`)
- Doc files: noun phrase (e.g., `execution-contract.md`)

## Structure
- 1 file = 1 responsibility
- Markdown only; no HTML, no diagrams unless essential
- Start with `## <section>` — no large intros
- Prefer bullets over prose
- No tables unless they materially improve clarity
- No code examples in meta-layer docs

## Duplication
- Never repeat a rule across files
- If a rule applies to two files, put it in the thinner one and link from the thicker
- If the same rule appears twice, delete one immediately

## When to Split a File
Split when any of:
- File exceeds 80 lines of durable content
- Two distinct concerns have emerged
- One section is loaded by one agent, another by a different agent

## Language
- Imperative voice ("Do not modify X")
- Present tense
- No hedging ("try to", "usually", "when possible")
- No meta-commentary about the file itself

## Durability
- Keep only durable rules in checked-in docs
- Temporary notes go to memory or session scratchpads, never into rule files
