# CLAUDE.md — repository agent instructions

## AI planning context

Follow **AGENTS.md** in this repo for ai-plan progressive disclosure (L0–L3), regenerate commands, and required product docs.

With the dev-tools plugin installed, invoke **dev-tools:using-ai-plan** for the canonical workflow (module scope selection, staleness, integration with **writing-plans**).

## Project structure

- Source under `src/` (feature folders per dev-tools `standards/project-structure.md`)
- Tests under `test/` mirroring `src/`
- Docs under `docs/` including product, roadmap, tech-stack

## Workflow

- Backlog items: `docs/backlog/{timestamp-slug}/`
- Bugs: `docs/bugs/{timestamp-slug}/` — use **dev-tools:bugfix-lifecycle** (not internal bug-workflow/bugfix skills)
