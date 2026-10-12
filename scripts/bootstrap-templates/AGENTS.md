# Agent Context

Use plan-product context when it helps implementation planning; targeted search and source reading are also valid evidence.

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
| L1 | Minimum module set from `docs/code-map/modules/<module>.md` | When useful for orientation |
| L2 | `docs/product.md`, `docs/features.md`, or `docs/tech-stack.md` | When product or stack context matters |
| L3 | Bounded queries from `scripts/map-code/query.mjs` in the plugin | After the plan names symbols or files |

Never inject every module file or the full code map during planning.

## Regenerate Code Map

Before relying on maps, run `node "<PLUGIN_ROOT>/scripts/map-code/check-freshness.mjs"`. It checks content, inventory, configuration and generator fingerprints, including missing core artifacts. Exit 1 means stale or unavailable context. Regenerate when maps would help, or use targeted source reading instead. Modification times are not a freshness signal. Optional architecture and pattern reports require their own regeneration.

Pre-flight checks:

1. `"autoRegenerate": false` in `plan-product.config.json` means skip regeneration; the team manages it manually.
2. Node 22+ must be available.
3. Product docs are useful when planning needs product context. Mapping still works when these docs are absent.
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
