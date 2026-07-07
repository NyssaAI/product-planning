---
name: map-architecture
description: Generate the code-map system architecture handoff for the current repo. Use when the user asks for architecture overview, repo onboarding, cross-module review, or system handoff context.
---

# Map Architecture

Generate the system architecture artifact from the persisted module graph.

## Workflow

1. If `using-code-map` is not already loaded, read `../using-code-map/SKILL.md` first.
2. Work from the target project root, not from the plugin root. If the user does not provide a target path, use the current workspace root.
3. Apply the code-map staleness gate. If the index or module graph is missing or stale, run `map-code` first.
4. Resolve the installed plugin root. Prefer `PLAN_PRODUCT_PLUGIN_ROOT`, then `PLUGIN_ROOT`, then `CLAUDE_PLUGIN_ROOT`, then `CURSOR_PLUGIN_ROOT`; otherwise use the installed plugin directory containing this skill. No harness sets a bare `PLUGIN_ROOT`, so substitute the resolved absolute path for `${PLUGIN_ROOT}` in the commands below before running them.
5. Generate the architecture artifact:

```bash
node "${PLUGIN_ROOT}/scripts/module-map/generate-module-map.mjs" --arch
```

Use `--arch --json` when the caller needs a machine-readable result.

## Output

This writes `system-architecture.md` beside the configured module graph. The component tree lists modules by ascending direct dependency count, with module id as the stable tie-breaker, and preserves agent-authored content between system overview markers.

Architecture runs are included in the local usage ledger when usage capture is enabled. Use `--effectiveness` on `generate-module-map.mjs` for the effectiveness report.
