---
name: map-code
description: "Generate code-map context for the current repo: symbol index, endpoint index, module graph, and module docs. Use when the user asks to map code, refresh code context, generate module context, or prepare implementation planning context."
---

# Map Code

Generate code-map planning context for a target repository. This is the public workflow that refreshes the symbol/endpoint code map and then regenerates the module map.

## Two Config Files

A target repo can hold two distinct plan-product configs. Do not confuse them:

- `.plan-product/config.json` — the path map read by the planning skills (`plan-product`, `plan-feature`, `plan-use-case`, `plan-roadmap`). It says where docs, templates, and artifacts live.
- `plan-product.config.json` — the generator/usage config read by the code-map generators. It sets source roots, module discovery, output directory, and usage capture.

Doc and template paths belong in `.plan-product/config.json`; generator roots, module discovery, and usage settings belong in `plan-product.config.json`.

## Workflow

1. If `using-code-map` is not already loaded, read `../using-code-map/SKILL.md` first for staleness rules and planning-context rules.
2. Work from the target project root, not from the plugin root. If the user does not provide a target path, use the current workspace root.
3. Confirm the target project has the configured product docs, usually `docs/product.md`, `docs/features.md`, and `docs/tech-stack.md`, or has explicit doc paths in `plan-product.config.json`.
4. Resolve the installed plugin root. Prefer `PLAN_PRODUCT_PLUGIN_ROOT`, then `PLUGIN_ROOT`, then `CLAUDE_PLUGIN_ROOT`, then `CURSOR_PLUGIN_ROOT`; otherwise use the installed plugin directory containing this skill. No harness sets a bare `PLUGIN_ROOT`, so substitute the resolved absolute path for `${PLUGIN_ROOT}` in the commands below before running them.
5. Run the public generator from the target project root:

```bash
node "${PLUGIN_ROOT}/scripts/map-code/generate.mjs"
```

Use `scripts/module-map/generate-module-map.mjs` directly only for module-map-only operations such as `--arch`, `--doctor`, `--init`, `--pin`, or `--unpin`.

## Output

Report the generated files, warnings, and errors. Generated artifacts must live under the configured output directory.

Runs append local usage events when usage capture is enabled. If the user asks whether plan-product is working well, run:

```bash
node "${PLUGIN_ROOT}/scripts/module-map/generate-module-map.mjs" --effectiveness
```
