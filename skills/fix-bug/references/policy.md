# One-way-in bug policy

This repository uses a single user-facing entrypoint for bug handling: **`fix-bug`**.

## Allowed flow

1. **fix-bug-log** — document bug in `docs/agent-plan/bugs/{bug_id}/`, discovery commit
2. **Analyze** — root-cause investigation via `systematic-debugging`
3. **Classify route** — simple one-file bug or complex bug requiring design
4. **Simple route:** `fix-bug-resolve` — failing test, fix, resolution file, resolution commit, then `fix-bug-complete`
5. **Complex route:** `design-spec` — bug detail file becomes design input, then implementation proceeds and finishes through `execute-plan`

Simple bugs may skip design-spec only when all simple-bug criteria are satisfied.

## Disallowed flow

- Direct ad-hoc fixes without `bug_id`
- Invoking `fix-bug-log`, `fix-bug-resolve`, or `fix-bug-complete` without `fix-bug`
- Invoking `systematic-debugging` directly for bugs (use fix-bug Step 2 instead)
- Using `/ralph-loop` for bugs (bypasses log, analyze, and separate commits)
- Skipping root-cause investigation
- Combining discovery + resolution in one commit
- Using the simple route for schema, migration, auth/security, API contract, cross-module, or product behavior changes
