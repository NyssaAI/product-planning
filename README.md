# plan-product

plan-product helps users define a product, organize features and use cases, and generate code-map context for implementation by agents.

## Capabilities

| Capability | Skill | Command doc |
|------------|-------|-------------|
| Product definition | `plan-product` | `commands/plan-product.md` |
| Feature guide interview | `plan-feature` | `commands/plan-feature.md` |
| Use-case interview | `plan-use-case` | `commands/plan-use-case.md` |
| Implementation roadmap | `plan-roadmap` | `commands/plan-roadmap.md` |
| Roadmap build loop | `build-roadmap` | `commands/build-roadmap.md` |
| Code-map generation | `map-code` | `commands/map-code.md` |
| Architecture handoff | `map-architecture` | `commands/map-architecture.md` |
| Module-rooted pattern review | `find-code-patterns` | `commands/find-code-patterns.md` |
| Pre-push hook install | `install-code-map-hook` | `commands/install-code-map-hook.md` |
| Generated context guidance | `using-code-map` | skill only |

## plan-product Structure

plan-product stores its path contract in `.plan-product/config.json`.

Core product files:

```text
.jamaynor/plan-product/config.json
docs/product.md
docs/features.md
docs/tech-stack.md
docs/roadmap.md
docs/plans/R-NNN-yyyy.mm.dd-step-slug.md
docs/features/f-nxx/feature.md
docs/features/f-nxx/uc-nnn-short-slug.md
docs/code-map/
.plan-product/patterns/library.json
.plan-product/patterns/expectations.json
.plan-product/usage/events.jsonl
```

`STRATEGY.md` and `CONCEPTS.md` are optional context. When present, plan-product skills read them and use their direction, vocabulary, priorities, and boundaries.

## Pattern Library

The pattern files support `find-code-patterns`: `.plan-product/patterns/library.json` defines candidate patterns and detection rules, while `expectations.json` selects relevant families to inspect based on module tags. For example, a persistence module may prompt a search for Repository examples. Results go to `docs/code-map/patterns.md` and `patterns.json`. They are source-navigation aids, not architecture grades or instructions to add a pattern; candidate matches need source verification. Edit the library or expectations to tune detection; generated reports are not the source of truth.

## Codex Usage

Codex loads bundled skills from `.codex-plugin/plugin.json`; it does not load plugin `commands/` as bare slash commands. Use the bundled skills:

```text
plan-product:plan-product
plan-product:plan-feature
plan-product:plan-use-case
plan-product:plan-roadmap
plan-product:build-roadmap
plan-product:map-code
plan-product:map-architecture
plan-product:find-code-patterns
plan-product:install-code-map-hook
plan-product:using-code-map
```

Command-capable runtimes can use the matching markdown files under `commands/`.

## Gemini Usage

The Gemini extension (`gemini-extension.json`) loads repository context through `GEMINI.md`, which imports `AGENTS.md`. Gemini CLI extensions expose slash commands from `commands/*.toml`, and this plugin ships markdown commands only, so Gemini receives the plan-product context but not the workflows as native slash commands. Drive the workflows by asking Gemini to follow the capability described in `AGENTS.md` (for example, "plan this product" or "map this repo's code").

## Code-Map Commands

The exposed capability names are plan-product names. The current implementation still uses the existing generator scripts under `scripts/code-map/` and `scripts/module-map/`.

Replace `${PLUGIN_ROOT}` with `PLAN_PRODUCT_PLUGIN_ROOT`, `PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or the installed plugin directory.

```bash
node "${PLUGIN_ROOT}/scripts/map-code/generate.mjs"
node "${PLUGIN_ROOT}/scripts/module-map/generate-module-map.mjs" --arch
node "${PLUGIN_ROOT}/scripts/code-map/generate-patterns.mjs"
node "${PLUGIN_ROOT}/scripts/module-map/generate-module-map.mjs" --effectiveness
```

Generator options: `generate-code-map.mjs` accepts `--include-comments` (or `CODE_MAP_INCLUDE_COMMENTS=1`) to embed file header comments and `-o <path>` to override the output file; `generate-patterns.mjs` accepts `--output-dir <dir>`. Run any generator with `--help` for its full flag list; `scripts/module-map/README.md` documents the module-map config keys.

## Mapping Evidence and Limits

Generator settings live in `.jamaynor/plan-product/config.json`. New initialization uses this location; existing root-level `plan-product.config.json` files remain supported. Move an existing file into the new directory to migrate, keeping its repo-relative path values unchanged. When both exist, the namespaced file wins. Planning-document paths and templates are configured separately in `.plan-product/config.json`.

Mapping works without product-planning documents. With no explicit `roots`, it inventories the repository with shared exclusions for dependencies, generated output and fixtures. All configured supported source files are retained, including files without recognized symbols; enabled language adapters contribute to one dependency graph. Scanners receive the explicit shared inventory: configure `roots` and `languages` to bound it; `.gitignore` and external ignore rules do not change that boundary.

Code-map schema `2.0` stores symbols once in `files[].symbols`. Ownership is `files[].moduleId`; join it to `modules[]` for names, roots and module-doc paths. The old top-level `symbols[]` and repeated per-symbol module fields are removed. `fileDependencies[]` preserves resolved source-file edges. Coverage lists unsupported, disabled, unowned and zero-symbol files plus unresolved dependency evidence. These are static references, not a runtime call graph.

Use small queries from the target repository:

```bash
node "${PLUGIN_ROOT}/scripts/map-code/query.mjs" symbol run --limit 20
node "${PLUGIN_ROOT}/scripts/map-code/query.mjs" module code-map --limit 20
node "${PLUGIN_ROOT}/scripts/map-code/query.mjs" callers scripts/lib/endpoint-extractor.mjs --limit 20
node "${PLUGIN_ROOT}/scripts/map-code/query.mjs" coverage --limit 20
node "${PLUGIN_ROOT}/scripts/map-code/check-freshness.mjs"
```

`callers` returns incoming file dependencies, not symbol calls. Query results report omitted rows and `nextOffset`; use `--offset <nextOffset>` for another page of the same unchanged map (at most 200 rows per page). Maps are optional orientation: verify relevant source, and use ordinary search directly when it answers the question.

The public generator writes `scan-state.json` only after both core mapping stages complete. Freshness checks source contents and inventory, configuration, resolver metadata, generator identity and core artifact hashes. A timestamp change alone does not invalidate maps. Architecture and pattern reports have separate generation steps; the core stamp does not certify them. Direct internal generator calls do not complete a core scan.

## Pre-Push Regeneration

An opt-in, warn-only git pre-push hook regenerates code-map artifacts before `git push` and warns when the configured code-map directory has uncommitted changes. It never blocks the push, and it only acts in repos that have `.plan-product/config.json`. The plugin ships no Claude Code plugin hook; install the git hook per repo, from any runtime:

```bash
node "${PLUGIN_ROOT}/scripts/module-map/install-git-hook.mjs"
node "${PLUGIN_ROOT}/scripts/module-map/install-git-hook.mjs" --uninstall
```

Opt out per repo with `"prePushRegenerate": false` in `.jamaynor/plan-product/config.json`. Regeneration logs to `.temp/regen.log` in the target repo; the directory ignores itself through a generated `.temp/.gitignore`.

## Command Health

Generator commands append local usage events to `.plan-product/usage/events.jsonl` by default. The raw JSONL ledger is ignored by git; set `"usage": { "enabled": false }` in `.jamaynor/plan-product/config.json` or `PLAN_PRODUCT_USAGE=0` to disable capture.

Run `generate-module-map.mjs --effectiveness` to write `docs/code-map/effectiveness.md`, which summarizes command success rates, warnings, current artifact health, doctor checks, and recent runs. This is command health, not evidence of agent accuracy, time savings, or map usefulness. The historical flag and filename remain supported; `--usage-report` is an alias.

## Install

For local Codex development, register this checkout in your personal plugin marketplace as `plan-product`, then install:

```bash
codex plugin add plan-product@personal
```

Verify:

```bash
codex plugin list --json
```

## Development

Run tests:

```bash
npm test
```
