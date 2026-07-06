# Agent Context

Use plan-product context before implementation planning.

## Required Product Docs

The repo should provide these docs files:

- `docs/product.md` - product purpose, audience, problem, and solution.
- `docs/features.md` - feature inventory, phases, status, and links to feature guides.
- `docs/tech-stack.md` - runtime stack, core services, infrastructure, and conventions.

Feature guides live under `docs/features/f-nxx/feature.md`. Use cases live beside the feature guide as `uc-nnn-short-slug.md`.

## Progressive Disclosure

| Level | Inject | When |
|-------|--------|------|
| L0 | Task, feature guide, use case, or bug prompt | Always |
| L1 | Minimum module set from `docs/code-map/modules/<module>.md` | During planning |
| L2 | `docs/product.md`, `docs/features.md`, or `docs/tech-stack.md` | When product or stack context matters |
| L3 | `docs/code-map/code-map.json` | After the plan names symbols or files |

Never inject every module file or the full code map during planning.

## Regenerate Code Map

Regenerate only when needed: if `docs/code-map/index.md` is missing, a needed module file is missing, or source files are newer than the generated index.

Pre-flight checks:

1. `"autoRegenerate": false` in `plan-product.config.json` means skip regeneration; the team manages it manually.
2. Node 18+ must be available.
3. Required docs present: `docs/product.md`, `docs/features.md`, and `docs/tech-stack.md`, or explicit doc paths in `plan-product.config.json`.
4. ast-grep is bundled by the plugin and installs into the plugin root on first use.

From the project root, replace `<PLUGIN_ROOT>` with the installed plan-product plugin directory:

```bash
node "<PLUGIN_ROOT>/scripts/map-code/generate.mjs"
```

If this repo was initialized with `--write-scripts`, the npm wrapper is also available:

```bash
npm run map-code
```

On failure, report the named error code and continue with whatever context is available.
