# CLAUDE.md — repository agent instructions

## code-indexer context

Follow **AGENTS.md** in this repo for code-indexer progressive disclosure (L0–L3), regenerate commands, and required product docs.

With the code-indexer plugin installed, invoke **code-indexer:using-code-indexer** for the canonical workflow (module scope selection and staleness).

## Project structure

- Source under `src/` (feature folders)
- Tests under `test/` mirroring `src/`
- Docs under `docs/` including product, roadmap, tech-stack

## Workflow

- Backlog items: `docs/code-index/backlog/{timestamp-slug}/`
- Plans: `docs/code-index/plans/`
- Bugs: `docs/code-index/bugs/{timestamp-slug}/`
