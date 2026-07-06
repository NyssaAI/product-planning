# plan-product Code Map

Maintainer reference for the code-map and module-map generator scripts bundled with plan-product. End users should start with the plugin skills:

- `plan-product:using-code-map`
- `plan-product:map-code`
- `plan-product:map-architecture`
- `plan-product:find-code-patterns`

The implementation still lives under `scripts/code-map/` and `scripts/module-map/`.

## Required Product Docs

Defaults prefer docs-based plan-product files:

| Document | Default candidates |
|----------|--------------------|
| Product | `docs/product.md` |
| Features | `docs/features.md` |
| Tech stack | `docs/tech-stack.md` |

Feature context should use `docs/features.md`.

## Generated Artifacts

| Output | Purpose |
|--------|---------|
| `docs/code-map/code-map.json` | Symbol and endpoint index. |
| `docs/code-map/module-map.json` | Module graph with dependency edges. |
| `docs/code-map/modules/<id>.md` | Primary scoped module context. |
| `docs/code-map/index.md` | Progressive disclosure guide. |
| `docs/code-map/system-architecture.md` | Optional architecture handoff from `map-architecture`. |
| `docs/code-map/patterns.md` / `patterns.json` | Optional module-rooted code pattern review from `find-code-patterns`. |
| `docs/code-map/effectiveness.md` | Optional usage and effectiveness report from `--effectiveness`. |

## Repo-Local Configuration

`--init` creates `.plan-product/config.json`, `.plan-product/schema.json`, and editable templates under `.plan-product/templates/`. Pattern review tuning lives in:

| File | Purpose |
|------|---------|
| `.plan-product/patterns/library.json` | Canonical pattern families and language detectors. |
| `.plan-product/patterns/expectations.json` | Module-tag rules for expected pattern families. |

`plan-product.config.json` is the optional generator settings file for module discovery, scan roots, test commands, and extra pattern catalogs.

Usage capture is local and enabled by default. Raw JSONL events write to `.plan-product/usage/events.jsonl`, which should stay ignored by git. Disable with `"usage": { "enabled": false }` or `PLAN_PRODUCT_USAGE=0`.

## CLI

Replace `${PLUGIN_ROOT}` with `PLAN_PRODUCT_PLUGIN_ROOT`, `PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or the installed plugin directory.

```bash
node "${PLUGIN_ROOT}/scripts/module-map/generate-module-map.mjs" --init --write-scripts
node "${PLUGIN_ROOT}/scripts/module-map/generate-module-map.mjs" --doctor
node "${PLUGIN_ROOT}/scripts/map-code/generate.mjs"
node "${PLUGIN_ROOT}/scripts/module-map/generate-module-map.mjs" --arch
node "${PLUGIN_ROOT}/scripts/code-map/generate-patterns.mjs"
node "${PLUGIN_ROOT}/scripts/module-map/generate-module-map.mjs" --effectiveness
node "${PLUGIN_ROOT}/scripts/module-map/generate-module-map.mjs" --pin <module-id>
node "${PLUGIN_ROOT}/scripts/module-map/generate-module-map.mjs" --unpin <module-id>
```

`--init --write-scripts` adds npm scripts named `map-code`, `map-architecture`, and `find-code-patterns` to consumer repos.

## Planning Workflow

```text
L0  Task, feature guide, use case, or bug prompt
L1  docs/code-map/modules/<module>.md
L2  docs/product.md, docs/features.md, docs/tech-stack.md
L3  docs/code-map/code-map.json
```

Do not inject every module file or the full code map during planning.
