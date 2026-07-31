---
id: F-203
phase: 2
status: complete
---

# F-203 Pre-Push Code-Map Regeneration

## Summary

A warn-only hook that refreshes code-map artifacts before a `git push`, shipped natively as a Claude Code plugin hook and installable as a git pre-push hook for runtimes without hook support.

## User Need

Users push PRs with stale `docs/code-map/` artifacts because description-based skill triggers are unreliable and Codex has no hook system. Regeneration must happen deterministically at push time, without ever blocking the push.

## Use Cases

None yet.

## Scope

- `hooks/hooks.json`: Claude Code plugin PreToolUse hook intercepting Bash `git push` commands.
- `scripts/module-map/pre-push-regen.mjs`: dual-mode warn-only regeneration wrapper (Claude hook stdin mode and `--git-hook` mode).
- `scripts/module-map/install-git-hook.mjs`: idempotent, marker-delimited git pre-push installer and `--uninstall`.
- The `install-code-map-hook` skill and `commands/install-code-map-hook.md` entry point.
- Opt-out via `"prePushRegenerate": false` in `plan-product.config.json`.

## Out of Scope

- Blocking or failing pushes; the hook is warn-only by decision.
- Post-edit background regeneration — that is the existing `regen-if-source-changed.mjs` PostToolUse wrapper.
- CI-side enforcement of fresh artifacts.

## Inputs

- Claude Code PreToolUse JSON on stdin, or git pre-push invocation.
- `plan-product.config.json` (`prePushRegenerate` opt-out).
- `.plan-product/config.json` `paths.codeMap` for the artifact directory.
- The existing code-map and module-map generator scripts.

## Outputs

- Refreshed `docs/code-map/` artifacts before the push.
- A non-blocking warning when regenerated artifacts are uncommitted.
- An installed marker-delimited block in `.git/hooks/pre-push`.

## Acceptance

- The Claude Code plugin hook regenerates on `git push` Bash commands, warns on uncommitted artifact changes, and always exits without blocking.
- The git-hook installer is idempotent, preserves foreign hook content outside its markers, and uninstalls cleanly.
- Content-assertion tests cover the hook manifest, the push matcher, and the installer.
- The path contract matches `.plan-product/config.json`.

## Dependencies

- F-201 (product code map), F-202 (code map planning handoff).
