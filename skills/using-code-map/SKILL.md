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

- During implementation planning when existing maps help identify relevant files or dependencies.
- When a repo has source roots and the user asks to understand module boundaries, endpoints, symbols, or code ownership.
- When a plan needs concrete module context rather than broad repository summaries.

Do not use for greenfield repos with no source yet. Start with `plan-product`, `plan-feature`, or `plan-use-case` instead.

## Progressive Disclosure

Load context in levels; never inject the whole generated output at once.

| Level | Inject | When |
|-------|--------|------|
| L0 | The task, feature guide, use case, or bug prompt | Always |
| L1 | In-scope module doc(s), usually one file | When they help orient the task |
| L2 | Configured product, features, or tech-stack docs, usually `docs/product.md`, `docs/features.md`, or `docs/tech-stack.md` | When product or stack context matters |
| L3 | A bounded symbol, module, or dependency query | When the plan names symbols or files |

Use the generated index to pick the minimum in-scope module docs. Add directly coupled modules only when the work crosses their boundary.

## Planning Evidence

When maps inform an implementation plan, record the context used:

- Planning module path.
- Selected module id and responsibility.
- Relevant dependencies or used-by edges.
- Any named code-map slice, symbol, endpoint, or file that the plan depends on.

Maps are optional evidence. Targeted file search and source reading are sufficient when they answer the task. Verify relevant source before relying on generated relationships; missing edges are not evidence that a dependency does not exist.

Use bounded queries instead of loading the full JSON. Replace `<term>` with a symbol, module id, or repo-relative file as appropriate:

```bash
node "${PLUGIN_ROOT}/scripts/map-code/query.mjs" symbol <term> --limit 20
node "${PLUGIN_ROOT}/scripts/map-code/query.mjs" module <term> --limit 20
node "${PLUGIN_ROOT}/scripts/map-code/query.mjs" callers <term> --limit 20
node "${PLUGIN_ROOT}/scripts/map-code/query.mjs" coverage --limit 20
```

Results include `total`, `omitted`, and `nextOffset`. Continue the same query with `--offset <nextOffset>` until it is null; keep the map unchanged between pages. `callers` means incoming static file dependencies, not symbol calls.

## Generate Or Refresh

From the target project root:

```bash
node "${PLUGIN_ROOT}/scripts/map-code/generate.mjs"
```

Replace `${PLUGIN_ROOT}` with the installed plugin root. Prefer `PLAN_PRODUCT_PLUGIN_ROOT`, then `PLUGIN_ROOT`, then `CLAUDE_PLUGIN_ROOT`, then `CURSOR_PLUGIN_ROOT`; otherwise use the installed plugin directory containing this skill.

## Freshness

Before relying on existing maps, run the shared content check:

```bash
node "${PLUGIN_ROOT}/scripts/map-code/check-freshness.mjs"
```

Exit 0 means the core symbol index, module graph, index and module docs match the last completed scan. Exit 1 reports missing or stale context. The fingerprint includes source contents and inventory, configuration, resolver metadata, planning docs and generator identity; file modification times do not determine freshness. CRLF and LF line endings are equivalent in UTF-8 text; other content changes still invalidate the scan.

If maps would help and are stale, run `map-code`. Otherwise continue with targeted source reading and state that map evidence was unavailable or stale. Do not block implementation merely because a map is absent.

This check does not certify optional architecture or pattern reports. Regenerate the requested report from fresh core maps when using it. Tell the user when context was refreshed.
