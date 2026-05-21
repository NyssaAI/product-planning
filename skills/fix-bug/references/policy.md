# One-way-in bug policy

This repository uses a single user-facing entrypoint for bug handling: **`fix-bug`**.

## Allowed flow

1. **fix-bug-log** — document bug in `docs/bugs/{bug_id}/`, discovery commit
2. **Analyze** — root-cause investigation via `systematic-debugging`
3. **fix-bug-resolve** — failing test, fix, resolution file, resolution commit
4. **fix-bug-complete** — verify gates and report

## Disallowed flow

- Direct ad-hoc fixes without `bug_id`
- Invoking `fix-bug-log`, `fix-bug-resolve`, or `fix-bug-complete` without `fix-bug`
- Invoking `systematic-debugging` directly for bugs (use fix-bug Step 2 instead)
- Using `/ralph-loop` for bugs (bypasses log, analyze, and separate commits)
- Skipping root-cause investigation
- Combining discovery + resolution in one commit
