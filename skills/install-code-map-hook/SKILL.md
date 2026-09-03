---
name: install-code-map-hook
description: Install or verify the opt-in, warn-only git pre-push hook that regenerates code-map artifacts before a push. Use when the user wants the code map refreshed before pushing a PR, asks to install plan-product hooks, set up pre-push regeneration, or reports stale docs/code-map artifacts at review time.
---

# Install Code Map Hook

Make code-map regeneration run deterministically before `git push`, without relying on model-routed skill triggers. The hook is warn-only: it refreshes artifacts and reports a failed regeneration or uncommitted artifact changes, but never blocks a push.

## How the Hook Ships

- The plugin ships no runtime-level hook. In every runtime (Claude Code, Codex, Gemini, Cursor, plain terminals) the trigger is a git `pre-push` hook installed per repo; git itself then enforces it for every push, from any tool.
- The hook only acts in repos that have `.plan-product/config.json`. Installing it elsewhere is harmless: it exits without regenerating.
- The installed block calls `pre-push-regen.mjs` by absolute path inside the installed plugin directory. After a plugin upgrade that changes that directory, rerun the installer so the block points at the current path.

## Workflow

1. Work from the target project root, not from the plugin root.
2. Resolve the installed plugin root. Prefer `PLAN_PRODUCT_PLUGIN_ROOT`, then `PLUGIN_ROOT`, then `CLAUDE_PLUGIN_ROOT`, then `CURSOR_PLUGIN_ROOT`; otherwise use the installed plugin directory containing this skill. No harness sets a bare `PLUGIN_ROOT`, so substitute the resolved absolute path for `${PLUGIN_ROOT}` in the commands below before running them.
3. Confirm the target repo has `.plan-product/config.json`; if not, route the user to `plan-product` first, because the hook does nothing without it.
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
- A generator failure is reported as a failure on stderr, naming the generator; details land in `.temp/regen.log` in the target repo. That directory ignores itself through a generated `.temp/.gitignore`.
- After a successful regeneration, if the configured code-map directory (`paths.codeMap`, usually `docs/code-map`) has uncommitted changes, the hook warns so the user can commit the refreshed artifacts.
- The installer writes a marker-delimited block, is idempotent, preserves any existing pre-push hook content outside its markers, and `--uninstall` removes only the block.
- Opt out per repo with `"prePushRegenerate": false` in `plan-product.config.json`.
