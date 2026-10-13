---
name: install-code-map-hook
description: Install, verify, remove, or diagnose the opt-in, warn-only git pre-push hook that regenerates code-map artifacts before a push. Use when the user explicitly requests automatic pre-push regeneration or asks to install, inspect, repair, or remove the plan-product hook. For a one-time refresh or stale map report, use map-code.
---

# Install Code Map Hook

Make code-map regeneration run deterministically before `git push`, without relying on model-routed skill triggers. The plan-product block is warn-only: it refreshes artifacts and reports a failed regeneration or uncommitted artifact changes without blocking a push. Existing hook content retains its own behavior.

## How the Hook Ships

- The plugin ships no runtime-level hook. In every runtime (Claude Code, Codex, Gemini, Cursor, plain terminals) the trigger is a git `pre-push` hook installed per repo; git itself then enforces it for every push, from any tool.
- The hook only acts in repos that have `.plan-product/config.json`. Installing it elsewhere is harmless: it exits without regenerating.
- The installed block calls `pre-push-regen.mjs` by absolute path inside the installed plugin directory. After a plugin upgrade that changes that directory, rerun the installer so the block points at the current path.

## Workflow

1. Work from the target project root, not from the plugin root. For a one-time refresh or stale map report without a request for automatic regeneration, use `map-code` instead.
2. Resolve the installed plugin root. Prefer `PLAN_PRODUCT_PLUGIN_ROOT`, then `PLUGIN_ROOT`, then `CLAUDE_PLUGIN_ROOT`, then `CURSOR_PLUGIN_ROOT`; otherwise use the installed plugin directory containing this skill. No harness sets a bare `PLUGIN_ROOT`, so substitute the resolved absolute path for `${PLUGIN_ROOT}` in the commands below before running them.
3. Choose the requested operation:
   - **Verify or diagnose:** run `git rev-parse --git-path hooks` from the target root and inspect its `pre-push` file. Resolve relative output against the target root; this lookup respects worktrees and `core.hooksPath`. Check the `# >>> plan-product pre-push hook >>>` / `# <<< plan-product pre-push hook <<<` markers and whether the referenced `pre-push-regen.mjs` exists at the current plugin path. Report a missing block, stale path, missing `.plan-product/config.json`, or `prePushRegenerate: false` as applicable. Do not execute the hook or run the installer merely to verify it.
   - **Install or repair:** confirm `.plan-product/config.json` exists; if missing, route to `plan-product` because regeneration needs it. Then run the installer below.
   - **Remove:** run the uninstall command below, even if `.plan-product/config.json` is absent.

Install or repair:

```bash
node "${PLUGIN_ROOT}/scripts/module-map/install-git-hook.mjs"
```

Remove it with:

```bash
node "${PLUGIN_ROOT}/scripts/module-map/install-git-hook.mjs" --uninstall
```

4. Report the inspection findings or what was installed, updated, or removed, using the installer's output for mutations.

## Behavior Contract

- Warn-only: the plan-product block never blocks a push when regeneration fails; existing hook content retains its own behavior.
- A generator failure is reported as a failure on stderr, naming the generator; details land in `.temp/regen.log` in the target repo. That directory ignores itself through a generated `.temp/.gitignore`.
- After a successful regeneration, if the configured code-map directory (`paths.codeMap`, usually `docs/code-map`) has uncommitted changes, the hook warns so the user can commit the refreshed artifacts.
- The installer writes a marker-delimited block, is idempotent, preserves any existing pre-push hook content outside its markers, and `--uninstall` removes only the block.
- Opt out per repo with `"prePushRegenerate": false` in `plan-product.config.json`.
