---
name: using-code-map
description: Use when implementation planning needs scoped repo context from generated code-map artifacts, module graphs, or module docs.
---

# Using Code Map

Repository-agnostic code map and module graph for implementation planning. Generated artifacts live in the target repository, not inside the plugin.

Announce at start: "I'm using the code-map context to scope this work."

## Capabilities

- `map-code`: generate or refresh the code map, module graph, and module docs.
- `map-architecture`: generate or refresh the system architecture handoff.
- `find-code-patterns`: generate or refresh module-rooted code pattern reviews.

## When To Use

- Before implementation planning in a repo that already has generated code-map artifacts.
- When a repo has source roots and the user asks to understand module boundaries, endpoints, symbols, or code ownership.
- When a plan needs concrete module context rather than broad repository summaries.

Do not use for greenfield repos with no source yet. Start with `plan-product`, `plan-feature`, or `plan-use-case` instead.

## Progressive Disclosure

Load context in levels; never inject the whole generated output at once.

| Level | Inject | When |
|-------|--------|------|
| L0 | The task, feature guide, use case, or bug prompt | Always |
| L1 | In-scope module doc(s), usually one file | During planning |
| L2 | Configured product, features, or tech-stack docs, usually `docs/product.md`, `docs/features.md`, or `docs/tech-stack.md` | When product or stack context matters |
| L3 | Configured code-map artifact, usually `docs/code-map/code-map.json` | After the plan names symbols or files |

Use the generated index to pick the minimum in-scope module docs. Add directly coupled modules only when the work crosses their boundary.

## Planning Evidence

When producing an implementation plan, record the code-map context used:

- Planning module path.
- Selected module id and responsibility.
- Relevant dependencies or used-by edges.
- Any named code-map slice, symbol, endpoint, or file that the plan depends on.

If this context is missing, regenerate or rewrite the plan before implementation.

## Generate Or Refresh

From the target project root:

```bash
node "${PLUGIN_ROOT}/scripts/map-code/generate.mjs"
```

Replace `${PLUGIN_ROOT}` with the installed plugin root. Prefer `PLAN_PRODUCT_PLUGIN_ROOT`, then `PLUGIN_ROOT`, then runtime-specific plugin root variables.

## Staleness Gate

Run `map-code` before planning when:

- the generated index is missing,
- the needed module file is missing,
- source files are newer than the generated index,
- `map-architecture` was requested and the module graph is missing,
- `find-code-patterns` was requested and the code map or module graph is missing.

Tell the user when you regenerated stale context before planning.
