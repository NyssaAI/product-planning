# Features

## Inventory

- [x] F-001: Code map generation
- [x] F-002: Module map generation
- [x] F-003: Per-module architecture files
- [x] F-004: Progressive-disclosure planning workflow
- [x] F-005: Module discovery
- [x] F-006: Endpoint surface detection
- [x] F-007: Bootstrap & init
- [x] F-008: Module-map embedding
- [x] F-009: Doctor & staleness checks
- [x] F-010: Multi-harness packaging
- [x] F-011: `/ai-plan` command

## Definitions

### F-001: Code map generation

`scripts/code-map/` scans the repo with `@ast-grep/cli` and writes
`docs/agent-plan/context/code-map.json` — a symbol index (functions, classes, types) plus an
endpoint index, each with file and line. The L3 artifact, loaded only after a plan names symbols.

### F-002: Module map generation

`scripts/ai-plan/` writes `docs/agent-plan/context/module-map.json` — a graph of modules with
`dependsOn` / `usedBy` edges. Consumed for task ordering, not pasted wholesale into context.

### F-003: Per-module architecture files

The primary artifact: one `docs/agent-plan/context/modules/<id>.md` per module describing its
boundaries, capabilities, `dependsOn` / `usedBy`, public API, routes, and test roots. This is the
L1 context an agent reads before planning a change in that module.

### F-004: Progressive-disclosure planning workflow

The `using-ai-plan` skill defines the L0–L3 disclosure model (L0 task → L1 in-scope module file →
L2 product docs → L3 code map) so agents load the minimum relevant context instead of the whole
codebase, plus the staleness gate that triggers regeneration before planning.

### F-005: Module discovery

Auto-detection of modules from npm workspaces, language-adapter cohesion (Newman modularity, e.g.
C#), stack profiles, or `src/`/`packages/` children — with `manual`, `glob`, and `workspaces`
overrides and module pinning (eject a derived module into config to freeze and adjust it).

### F-006: Endpoint surface detection

The code map indexes HTTP route handlers and MCP tools / resources / prompts across supported
languages, so the module files and code map expose a repo's external surface, not just symbols.

### F-007: Bootstrap & init

`generate.mjs --init --write-scripts` scaffolds the required product docs, an optional
`ai-plan.config.json`, the `docs/agent-plan/` layout, and project `npm run ai-plan` scripts —
turning a fresh repo into one ai-plan can generate against.

### F-008: Module-map embedding

Generation embeds a module-map table (with a freshness timestamp) into the repo's `CLAUDE.md` and
`AGENTS.md` between managed markers, giving agents an always-visible entry point to the module set.

### F-009: Doctor & staleness checks

`generate.mjs --doctor` reports per-runtime readiness (required docs, ast-grep availability,
generated artifacts), and the staleness gate flags when source is newer than the generated context.

### F-010: Multi-harness packaging

One generator, five runtimes: Claude Code, Cursor, Codex, OpenCode, and Gemini each load the same
`skills/`, `commands/`, and `scripts/` via their own adapter (`.claude-plugin`, `.cursor-plugin`,
`.codex`, `.opencode`, `gemini-extension.json`).

### F-011: `/ai-plan` command

A one-step command that runs code-map + ai-plan generation in the current project repo, wrapping the
underlying `scripts/` entry points so users don't invoke Node paths by hand.
