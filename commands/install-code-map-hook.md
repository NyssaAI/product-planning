---
description: Install, verify, remove, or diagnose the opt-in, warn-only git pre-push hook that regenerates code-map artifacts before a push.
argument-hint: "[target repo path]"
---

# install-code-map-hook - regenerate the code map before push

Load the `install-code-map-hook` skill and follow its workflow. The skill owns the `${PLUGIN_ROOT}` substitution guidance, the plan-product-repo precondition, and the warn-only behavior contract; this command file is only the entry point.

For a one-time refresh or stale map report, use `map-code`. Verification inspects the effective hook path and marker block without executing the hook or installing it. Removal does not require `.plan-product/config.json`.

The plugin ships no runtime-level hook. In every runtime the trigger is a git pre-push hook installed per repo, and it only acts in repos that have `.plan-product/config.json`.

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

Warn-only: the plan-product block regenerates code-map artifacts before the push, reports a failed generator by name, and warns when the configured code-map directory has uncommitted changes without blocking the push. Existing hook content retains its own behavior. Regeneration logs to `.temp/regen.log`. Opt out with `"prePushRegenerate": false` in `plan-product.config.json`.
