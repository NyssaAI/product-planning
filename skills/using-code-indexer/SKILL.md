---
name: using-code-indexer
description: Use when implementation planning needs scoped repo context from docs/code-index module graphs or code maps
---

# Using code-indexer

**Canonical source** for code-indexer behavior. The `/ci` command, the `/code-indexer` alias, `scripts/bootstrap-templates/AGENTS.md`, `.cursor/rules/code-indexer.mdc`, and the embedded module-map table in `CLAUDE.md` / `AGENTS.md` are thin wrappers that must stay in sync with this skill - update this skill first when rules change.

Repository-agnostic **code map + module graph** for planning. Outputs live under `docs/code-index/` in the **target repository** (not inside the plugin).

**Announce at start:** "I'm using the using-code-indexer skill to load planning context."

## When to Use

- **Before planning implementation work** in a repo that has `docs/code-index/` artifacts, or has `package.json` / polyglot source roots — load the in-scope module file(s) for the area you are about to change.
- When `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` exist and you need module boundaries for an existing codebase.

Do **not** use for greenfield repos with no source yet (skip until code exists).

Use `docs/code-index/system-architecture.md` only for repo onboarding, cross-module architecture review, or human handoff. Routine implementation planning still starts with `docs/code-index/index.md` and the minimum in-scope module files.

## Progressive Disclosure (mandatory)

**Primary code-indexer artifact:** `docs/code-index/modules/<module-id>.md` — a self-contained architectural description of one code module (boundaries, `dependsOn` / `usedBy`, routes, test roots, sample symbols). This is not a duplicate of `docs/code-index/specs/` or `docs/code-index/plans/`; those are *work-item* docs. Module files are *module* docs.

Load context in levels — never inject everything at once:

| Level | Inject | When |
|-------|--------|------|
| L0 | The task / feature description (and a design doc if feature work) | Always |
| L1 | **In-scope** `docs/code-index/modules/<module-id>.md` set | When planning — read the minimum in-scope module set now (Read tool). Do not defer or summarize. |
| L2 | `docs/product.md`, `docs/roadmap.md`, or `docs/tech-stack.md` | When product context needed |
| L3 | `docs/code-index/code-map.json` | **After** the plan names symbols — implementation only |

`module-map.json` informs task ordering; do not paste the whole file into context.

Read the minimum in-scope module set — usually one module file; add a directly-coupled module (via its `dependsOn` / `usedBy` edges) only when the work crosses that module's boundary. Never inject all module files or the full code map.

## Planning context evidence

When you produce an implementation plan for a repo with code-indexer artifacts, record the module context you planned against so the plan stays reproducible:

- `**Planning module:** docs/code-index/modules/<module-id>.md` in the plan header
- A `## Planning context` section with the selected module id, description, capabilities, and does-not-own facts copied from the module file
- Task ordering that respects `module-map.json` dependency edges when multiple modules are in scope

If those fields are missing, regenerate or rewrite the plan before implementation rather than inferring the module context later.

## Generate (target repo)

Requires in the **project repo** (not the plugin):

1. `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` (or paths in `code-indexer.config.json`)

**@ast-grep/cli** is provided by the code-indexer plugin (`node_modules` under the plugin root). On first `code-map` run it auto-installs there if missing — **do not** add `@ast-grep/cli` to the project repo.

From the **project root**, using scripts bundled in the code-indexer plugin:

```bash
# One-time bootstrap (creates docs, configs, AGENTS.md stubs)
node "${PLUGIN_ROOT}/scripts/module-map/generate.mjs" --init --write-scripts

# Regenerate map + module files (run code-map first internally via npm script, or both):
node "${PLUGIN_ROOT}/scripts/code-map/generate-code-map.mjs"
node "${PLUGIN_ROOT}/scripts/module-map/generate.mjs"
```

Replace `${PLUGIN_ROOT}` with `CODE_INDEXER_PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or the installed code-indexer plugin directory.

**Validate:** `node "${PLUGIN_ROOT}/scripts/module-map/generate.mjs" --doctor`

Add `--json` to any command for machine-readable output (used by agents; emits a single JSON object to stdout).

### `/ci arch` system architecture

Use `/ci arch` when the user asks for a system-level architecture document, repo onboarding view, cross-module review, or handoff artifact. Do not load `system-architecture.md` as default context for routine feature planning.

From the **project root**:

1. Apply the staleness gate below.
2. If the index is stale or missing, run normal `/ci` first.
3. Generate or refresh the architecture artifact:

```bash
node "${PLUGIN_ROOT}/scripts/module-map/generate.mjs" --arch
# Machine-readable result:
node "${PLUGIN_ROOT}/scripts/module-map/generate.mjs" --arch --json
```

The low-level `--arch` command reads the persisted module map from the configured output directory (`docs/code-index/module-map.json` by default) and writes `system-architecture.md` alongside it. It preserves the agent-authored content between `code-index:system-overview` markers. After generation, enrich that preserved overview from the module docs and product docs when the user asked for narrative architecture prose.

### `/ci patterns` structural patterns

Use `/ci patterns` for architecture/style discovery and codebase consistency review. Do not load `patterns.md` or `patterns.json` as default context for routine feature planning.

From the **project root**:

1. Apply the staleness gate below.
2. If the index is stale or missing, run normal `/ci` first.
3. Generate or refresh the pattern artifacts:

```bash
node "${PLUGIN_ROOT}/scripts/code-map/generate-patterns.mjs"
# Machine-readable result:
node "${PLUGIN_ROOT}/scripts/code-map/generate-patterns.mjs" --json
```

The low-level patterns command reads the configured code-map output and persisted module map (`docs/code-index/code-map.json` and `docs/code-index/module-map.json` by default), scans source files with bundled and repo-configured JSON pattern catalogs, and writes `patterns.md` plus `patterns.json` in the configured output directory. Headline coverage is based on pattern-eligible files and excludes `intent-only` signals. Use `--json` to get a structured result object (includes `ok`, `wrote`, `warnings`, `errors`, `coveragePercent`).

**Project `package.json` scripts** (after `--init --write-scripts`):

```json
{
  "scripts": {
    "code-map": "node scripts/code-map/generate-code-map.mjs",
    "code-indexer": "npm run code-map && node scripts/module-map/generate.mjs"
  }
}
```

If `--write-scripts` copied tooling into the repo, prefer `npm run code-indexer` from the project root.

## Pick the Module File(s) (when planning)

1. Read `docs/code-index/index.md` — module table links to `modules/<id>.md`
2. Match the task / roadmap item to its **Primary modules** — the minimum set needed for the behavior (ask if ambiguous)
3. Read each in-scope `docs/code-index/modules/<id>.md` now (use the Read tool). Do not summarize or skip — capabilities, boundaries, `dependsOn` / `usedBy`, Public API, routes, test roots. Read the minimum in-scope module set — usually one module file; add a directly-coupled module (via its `dependsOn` / `usedBy` edges) only when the work crosses that module's boundary. Never inject all module files or the full code map
4. Use `docs/code-index/module-map.json` only for dependency ordering between tasks (do not paste the whole file into context)

Record in the plan header:

```markdown
**Planning module:** `docs/code-index/modules/<module-id>.md`
```

## Staleness

Regenerate when:

- Module folders added/removed/renamed
- Public API or route structure changed materially
- Module file missing for the module you need
- `docs/code-index/system-architecture.md` is requested and `docs/code-index/module-map.json` is missing or stale
- `docs/code-index/patterns.md` is requested and `docs/code-index/code-map.json` or `docs/code-index/module-map.json` is missing or stale

**Staleness gate:** run `npm run code-indexer` (or `node scripts/module-map/generate.mjs`) **before any planning step** when any of these hold — do not proceed with stale context:

- `docs/code-index/index.md` is missing
- any source file is newer than `index.md`
- the embedded module-map section in `CLAUDE.md` / `AGENTS.md` is missing, or its generated timestamp is older than `index.md` (the generator stamps that section when it writes it)

Tell your human partner: "Module graph was stale — regenerated before planning."

## Repo layout

Generated artifacts live under `docs/code-index/` in the target repository. Do not invent alternate paths.

See `scripts/module-map/README.md` in the plugin for generator and config details.
