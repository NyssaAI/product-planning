# Product

**code-indexer** is a repository-agnostic code/module-graph generator for coding agents. It scans a
repository and produces scoped planning context under `docs/code-index/`: a **code map** (symbol +
endpoint index), a **module map** (dependency graph), and a **per-module architecture file** for
each detected module. Agents load the minimum context they need to plan a change, instead of the
whole codebase.

## Problem

Coding agents plan better when they load the minimum relevant context, not the entire repository.
But the artifacts that make scoped planning possible — module boundaries, dependency edges, public
API and endpoint surfaces, test roots — don't exist in most repos, and hand-maintaining them rots
the moment the code changes. Without them, an agent either floods its context with irrelevant files
or guesses at structure it can't see.

code-indexer closes that gap: it derives the structure mechanically from the source, so the planning
context is always regenerable and always matches the code.

## Solution

code-indexer runs two deterministic generators over any repo:

- **code-map** (`scripts/code-map/`) scans the source with `@ast-grep/cli` structural rules and emits
  `code-map.json` — a per-file symbol index (functions, classes, types, with signatures and
  doc-comments) plus an endpoint index (HTTP routes and MCP tools / resources / prompts), each with
  file and line.
- **module-map** (`scripts/module-map/`) auto-detects module boundaries, derives `dependsOn` /
  `usedBy` edges, and writes one architecture file per module plus the module dependency graph and a
  guide index.

Module detection is language-agnostic: it derives boundaries from a file dependency graph by choosing
the directory depth per top-level area that maximizes cohesion (Newman modularity), with fallbacks to
directory structure for sparse graphs. Repos can override detection — `manual`, `glob`, or
`workspaces` strategies — and **pin** a derived module into `code-indexer.config.json` to freeze and
hand-edit it. The only required inputs are three product docs (`docs/product.md`, `docs/roadmap.md`,
`docs/tech-stack.md`); everything else is auto-detected.

## Progressive disclosure

The generated artifacts are organized so an agent loads context in levels, never all at once. The
`using-code-indexer` skill is the canonical guide to this model:

- **L0** — the task / feature description
- **L1** — the in-scope `modules/<id>.md` file(s) for the area being changed (the primary artifact)
- **L2** — the product docs, when product intent or stack constraints matter
- **L3** — `code-map.json`, only after the plan names specific symbols

A staleness gate tells the agent to regenerate before planning when source is newer than the
generated index, so plans are never built against stale structure.

## What it produces

Outputs land under `docs/code-index/` in the target repository:

| Output | Purpose |
|--------|---------|
| `modules/<id>.md` | **Primary artifact** — one module's architecture: boundaries, capabilities, `dependsOn` / `usedBy`, public API, routes, test roots, sample symbols |
| `module-map.json` | Module dependency graph, consumed for task ordering (not pasted wholesale into context) |
| `code-map.json` | Symbol index + endpoint index, with file and line for every entry |
| `index.md` | Progressive-disclosure guide to the module set |

Generation also **embeds** a freshness-stamped module-map table into the repo's `CLAUDE.md` and
`AGENTS.md` between managed markers, giving agents an always-visible entry point to the module set.

## Who it's for

Engineers using AI coding agents (Claude Code, Cursor, Codex, Gemini) who want those agents to plan
against accurate, scoped repository structure rather than a wall of files or a hallucinated map. One
generator backs all four runtimes via per-harness adapters.

## How it's used

- **Bootstrap once** — `generate.mjs --init --write-scripts` scaffolds the required docs, an optional
  `code-indexer.config.json`, the `docs/code-index/` layout, and `npm run code-indexer` scripts.
- **Regenerate** — `npm run code-indexer` (or the `/code-indexer` command) after module structure
  changes; `--doctor` reports per-runtime readiness and staleness.

`@ast-grep/cli` is bundled with the plugin and auto-installs into the plugin root on first code-map
run — it is never added to the consumer repo.

## Design principles

- **Deterministic and regenerable** — the context is derived from source, never hand-curated, so it
  can be rebuilt at any time and shared via git.
- **Repository-agnostic** — no assumptions about language or framework beyond what the ast-grep rule
  set and stack profiles cover; structure is inferred, not configured.
- **Honest about limits** — ast-grep matches structure, not intent, so the index covers what is
  structurally unambiguous and says so rather than over-claiming.
