---
name: install-code-map-hook
description: Install or verify the warn-only pre-push code-map regeneration hook for the current runtime. Use when the user wants the code map refreshed before pushing a PR, asks to install plan-product hooks, set up pre-push regeneration, or reports stale docs/code-map artifacts at review time.
---

# Install Code Map Hook

Make code-map regeneration run deterministically before `git push`, without relying on model-routed skill triggers. The hook is warn-only: it refreshes artifacts and reports uncommitted changes, but never blocks a push.

## How the Hook Ships

- **Claude Code:** the plugin ships `hooks/hooks.json`, a PreToolUse hook on Bash that runs `scripts/module-map/pre-push-regen.mjs` when the command is a `git push`. It is active automatically once the plugin is installed — nothing to set up. The user can confirm with `/hooks`.
- **Codex, Gemini, Cursor, and plain terminals:** no native hook system. Install a git `pre-push` hook instead; git itself then enforces the trigger for every push, from any tool.

## Workflow

1. Work from the target project root, not from the plugin root.
2. Resolve the installed plugin root. Prefer `PLAN_PRODUCT_PLUGIN_ROOT`, then `PLUGIN_ROOT`, then `CLAUDE_PLUGIN_ROOT`, then `CURSOR_PLUGIN_ROOT`; otherwise use the installed plugin directory containing this skill. No harness sets a bare `PLUGIN_ROOT`, so substitute the resolved absolute path for `${PLUGIN_ROOT}` in the commands below before running them.
3. Identify the runtime. In Claude Code, report that the plugin hook is already active and only install the git hook if the user also wants coverage for pushes made outside Claude Code.
4. Install the git pre-push hook:

```bash
node "${PLUGIN_ROOT}/scripts/module-map/install-git-hook.mjs"
```

Remove it with:

```bash
node "${PLUGIN_ROOT}/scripts/module-map/install-git-hook.mjs" --uninstall
```

5. Report what was installed, updated, or removed, using the installer's output.

## Behavior Contract

- Warn-only: the push always proceeds, even when regeneration fails.
- After regeneration, if the configured code-map directory (`paths.codeMap`, usually `docs/code-map`) has uncommitted changes, the hook warns so the user can commit the refreshed artifacts.
- The installer writes a marker-delimited block, is idempotent, preserves any existing pre-push hook content outside its markers, and `--uninstall` removes only the block.
- Opt out per repo with `"prePushRegenerate": false` in `plan-product.config.json`.
