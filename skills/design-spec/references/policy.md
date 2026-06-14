# One-way-in design policy

This repository uses a single user-facing entrypoint for spec-before-code work: **`design-spec`**.

## Allowed flow

1. **Explore & design** — context, standards, clarifying questions, approved design
2. **Write spec** — `docs/agent-plan/specs/…-design.md`, user review gate
3. **Worktree** — `using-git-worktrees` (feature branch + worktree, never main/master)
4. **Plan** — `write-plan` (internal; design-spec Step 11)
5. **Implement** — **execute-plan** when your human partner is ready (hand off after plan; do not auto-start unless they already said go)

## Disallowed flow

- Invoking `write-plan` without **design-spec** (or without approved spec + worktree)
- Invoking `execute-plan-run`, `execute-plan-run-inline`, or `execute-plan-finish` directly
- Auto-starting **execute-plan** from design-spec or write-plan without explicit go-ahead
- Skipping spec approval or worktree before planning
- Writing code or invoking implementation skills during design-spec
