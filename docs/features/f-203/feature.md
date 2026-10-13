---
id: F-203
phase: 2
status: complete
---

# F-203 Pre-Push Code-Map Regeneration

## Summary

An opt-in, warn-only git pre-push hook that refreshes code-map artifacts before a `git push` in repos that adopted plan-product, installable per repo from any runtime.

## User Need

Users push PRs with stale `docs/code-map/` artifacts because description-based skill triggers are unreliable and most runtimes have no hook system. Regeneration must happen deterministically at push time, without ever blocking the push, and only in repos that asked for it.

## Use Cases

None yet.

## Scope

- `scripts/module-map/pre-push-regen.mjs`: warn-only regeneration wrapper run by the git hook; exits early in repos without `.plan-product/config.json`.
- `scripts/module-map/regen-if-source-changed.mjs --run`: the synchronous regeneration pipeline; exits non-zero when a generator fails so the wrapper can report it.
- `scripts/module-map/install-git-hook.mjs`: idempotent, marker-delimited git pre-push installer and `--uninstall`.
- The `install-code-map-hook` skill and `commands/install-code-map-hook.md` entry point.
- Opt-out via `"prePushRegenerate": false` in `.jamaynor/plan-product/config.json`.
- The regeneration log at `.temp/regen.log`, self-ignored through `.temp/.gitignore`.

## Out of Scope

- A Claude Code plugin hook that fires in every repo where the plugin is enabled; removed in R-010 because it regenerated in repos that never adopted plan-product.
- Blocking or failing pushes; the hook is warn-only by decision.
- Post-edit background regeneration — that is the `regen-if-source-changed.mjs` PostToolUse wrapper written into a repo's `.claude/settings.json` by `--init --write-scripts`.
- CI-side enforcement of fresh artifacts.

## Inputs

- Git pre-push invocation.
- `.plan-product/config.json` (presence gate and `paths.codeMap` for the artifact directory).
- `.jamaynor/plan-product/config.json` (`prePushRegenerate` opt-out).
- The existing code-map and module-map generator scripts.

## Outputs

- Refreshed `docs/code-map/` artifacts before the push.
- A non-blocking warning naming the failing generator when regeneration fails, and a non-blocking warning when regenerated artifacts are uncommitted.
- `.temp/regen.log` in the target repo.
- An installed marker-delimited block in `.git/hooks/pre-push`.

## Acceptance

- The hook does nothing in a repo without `.plan-product/config.json`.
- A failing generator makes `regen-if-source-changed.mjs --run` exit non-zero, and the pre-push warning names it; the push still proceeds.
- The regeneration log lives under `.temp/`, never under the code-map directory.
- The git-hook installer is idempotent, preserves foreign hook content outside its markers, and uninstalls cleanly.
- Content-assertion tests cover the presence gate, the failure path, the log location, and the installer.
- The path contract matches `.plan-product/config.json`.

## Dependencies

- F-201 (product code map), F-202 (code map planning handoff).
