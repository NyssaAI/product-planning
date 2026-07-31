---
description: Install or verify the warn-only pre-push code-map regeneration hook for the current runtime.
argument-hint: "[target repo path]"
---

# install-code-map-hook - regenerate the code map before push

Load the `install-code-map-hook` skill and follow its workflow. The skill owns runtime detection, the `${PLUGIN_ROOT}` substitution guidance, and the warn-only behavior contract; this command file is only the entry point.

In Claude Code the plugin's `hooks/hooks.json` PreToolUse hook is active automatically; installing the git hook adds coverage for pushes made outside Claude Code. In Codex, Gemini, Cursor, or a plain terminal, the git pre-push hook is the trigger mechanism.

## Run

Replace `${PLUGIN_ROOT}` with `PLAN_PRODUCT_PLUGIN_ROOT`, `PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or the installed plugin directory.

```bash
node "${PLUGIN_ROOT}/scripts/module-map/install-git-hook.mjs"
```

Remove with:

```bash
node "${PLUGIN_ROOT}/scripts/module-map/install-git-hook.mjs" --uninstall
```

## Behavior

Warn-only: the hook regenerates code-map artifacts before the push and warns when the configured code-map directory has uncommitted changes; it never blocks the push. Opt out with `"prePushRegenerate": false` in `plan-product.config.json`.
