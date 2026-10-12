---
description: Generate or refresh the system architecture handoff from the persisted module graph.
argument-hint: "[target repo path]"
---

# map-architecture - generate architecture handoff

Generate or refresh the system architecture handoff from the persisted module graph.

**Agent workflow:** Load the `map-architecture` skill and follow its workflow — it owns the `${PLUGIN_ROOT}` substitution guidance and applies `using-code-map` staleness rules. If generated context is missing or stale, run `map-code` first.

## Run

Replace `${PLUGIN_ROOT}` with `PLAN_PRODUCT_PLUGIN_ROOT`, `PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or the installed plugin directory.

```bash
node "${PLUGIN_ROOT}/scripts/module-map/generate-module-map.mjs" --arch
```

Machine-readable result:

```bash
node "${PLUGIN_ROOT}/scripts/module-map/generate-module-map.mjs" --arch --json
```

## Effectiveness Report

Architecture runs are included in the local usage ledger. Generate the command health report with:

```bash
node "${PLUGIN_ROOT}/scripts/module-map/generate-module-map.mjs" --effectiveness
```
