# CLAUDE.md — repository agent instructions

## AI planning context

Follow **AGENTS.md** in this repo for ai-plan progressive disclosure (L0–L3), regenerate commands, and required product docs.

With the dev-tools plugin installed, invoke **dev-tools:using-ai-plan** for the canonical workflow (module scope selection, staleness, integration with **write-plan** via **design-spec**).

## Project structure

- Source under `src/` (feature folders per dev-tools `standards/project-structure.md`)
- Tests under `test/` mirroring `src/`
- Docs under `docs/` including product, roadmap, tech-stack

## Workflow

- Backlog items: `docs/agent-plan/backlog/{timestamp-slug}/`
- Plans: `docs/agent-plan/plans/` — use **dev-tools:execute-plan** to implement (not internal execute-plan-run / execute-plan-run-inline / execute-plan-finish)
- Bugs: `docs/agent-plan/bugs/{timestamp-slug}/` — use **dev-tools:fix-bug** (not internal fix-bug-log / fix-bug-resolve / fix-bug-complete)
