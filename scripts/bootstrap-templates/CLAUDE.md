# CLAUDE.md — repository agent instructions

## AI planning context

Follow **AGENTS.md** in this repo for ai-plan progressive disclosure (L0–L3), regenerate commands, and required product docs.

With the dev-tools plugin installed, invoke **dev-tools:using-ai-plan** for the canonical workflow (module scope selection and staleness).

## Project structure

- Source under `src/` (feature folders)
- Tests under `test/` mirroring `src/`
- Docs under `docs/` including product, roadmap, tech-stack

## Workflow

- Backlog items: `docs/agent-plan/backlog/{timestamp-slug}/`
- Plans: `docs/agent-plan/plans/`
- Bugs: `docs/agent-plan/bugs/{timestamp-slug}/`
