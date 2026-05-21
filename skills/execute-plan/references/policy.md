# One-way-in execute policy

This repository uses a single user-facing entrypoint for plan implementation: **`execute-plan`**.

## Allowed flow

1. **Verify** — `using-git-worktrees` (feature branch + worktree)
2. **Run** — `execute-plan-run` (default) or `execute-plan-run-inline` (fallback)
3. **Finish** — `execute-plan-finish` (tests, push, PR)

Plan authoring is **`write-plan`**, invoked from **design-spec** — not from execute-plan.

## Disallowed flow

- Invoking `execute-plan-run`, `execute-plan-run-inline`, or `execute-plan-finish` without `execute-plan`
- Implementing tasks directly on `main`/`master`
- Skipping PR unless project CLAUDE.md/AGENTS.md explicitly overrides
