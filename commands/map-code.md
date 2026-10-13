---
description: Generate or refresh the target repo's code-map context - symbol index, endpoint index, module graph, and module docs.
argument-hint: "[target repo path]"
---

# map-code - generate code-map context

Generate or refresh the target repo's code-map context: symbol index, endpoint index, module graph, and module docs.

**Agent workflow:** Load the `map-code` skill and follow its workflow — it owns the `${PLUGIN_ROOT}` substitution guidance and the two-config distinction, and it invokes `using-code-map` first for progressive disclosure and staleness rules.

## Prerequisites

- Product docs are optional. When present, configured product, feature, and tech-stack docs add planning context; source-only repositories can be mapped directly.
- Node.js 22 or later and npm are available.

## Run

Replace `${PLUGIN_ROOT}` with `PLAN_PRODUCT_PLUGIN_ROOT`, `PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or the installed plugin directory.

```bash
node "${PLUGIN_ROOT}/scripts/map-code/generate.mjs"
```

The public map-code script runs the code-map generator and then the module-map generator. Use `scripts/module-map/generate-module-map.mjs` directly only for module-map-only operations such as `--arch`, `--doctor`, or `--init`.

## Usage Capture

Runs append local usage events to `.plan-product/usage/events.jsonl` unless disabled with `"usage": { "enabled": false }` in `.jamaynor/plan-product/config.json` or `PLAN_PRODUCT_USAGE=0`. To inspect command execution health, run:

```bash
node "${PLUGIN_ROOT}/scripts/module-map/generate-module-map.mjs" --effectiveness
```
