# CLAUDE.md — repository agent instructions

## AI planning context

Use progressive disclosure when planning features:

1. Task / backlog / bug detail (L0)
2. **One** `docs/ai-plan/scopes/<module>.md` (L1)
3. Optional `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` (L2)
4. `docs/ai-plan/CODE_MAP.json` only after the plan names symbols (L3)

Regenerate planning context: `devjoy ai-plan` or `npm run ai-plan`.

Validate setup: `devjoy ai-plan doctor`.

## Project structure

- Source under `src/` (feature folders per dev-tools `standards/project-structure.md`)
- Tests under `test/` mirroring `src/`
- Docs under `docs/` including product, roadmap, tech-stack

## Workflow

- Backlog items: `docs/backlog/{timestamp-slug}/`
- Bugs: `docs/bugs/{timestamp-slug}/` with detail + resolution files
