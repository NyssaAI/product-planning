# map-code - generate code-map context

Generate or refresh the target repo's code-map context: symbol index, endpoint index, module graph, and module docs.

**Agent workflow:** Invoke `using-code-map` first for progressive disclosure and staleness rules.

## Prerequisites

- Product docs are present, usually `docs/product.md`, `docs/features.md`, and `docs/tech-stack.md`, or explicit doc paths are configured.
- Node.js and npm are available.

## Run

Replace `${PLUGIN_ROOT}` with `PLAN_PRODUCT_PLUGIN_ROOT`, `PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or the installed plugin directory.

```bash
node "${PLUGIN_ROOT}/scripts/map-code/generate.mjs"
```

The public map-code script runs the code-map generator and then the module-map generator. Use `scripts/module-map/generate-module-map.mjs` directly only for module-map-only operations such as `--arch`, `--doctor`, or `--init`.

## Usage Capture

Runs append local usage events to `.plan-product/usage/events.jsonl` unless disabled with `"usage": { "enabled": false }` in `plan-product.config.json` or `PLAN_PRODUCT_USAGE=0`. To analyze effectiveness, run:

```bash
node "${PLUGIN_ROOT}/scripts/module-map/generate-module-map.mjs" --effectiveness
```
