---
name: execute-plan
description: Use when a written implementation plan exists and work should be implemented through PR. Single canonical entrypoint for plan execution — orchestrates verify, run, and finish steps.
---

# Execute Plan (single entrypoint)

Use this skill as the ONLY user-facing path for implementing a written plan.

## Purpose

One canonical lifecycle:

1. **Verify** — feature branch + worktree (`using-git-worktrees`)
2. **Run** — implement plan tasks (`execute-plan-run` default, or `execute-plan-run-inline` fallback)
3. **Finish** — verify tests, push, open PR (`execute-plan-finish`)

## Hard policy

- Do not implement plan tasks without a written plan in `docs/agent-files/plans/` (unless your human partner explicitly points at another plan path).
- Do not invoke `execute-plan-run`, `execute-plan-run-inline`, or `execute-plan-finish` directly — only via this skill.
- Do not skip worktree verification (Step 1).
- Default to subagent execution when the platform supports it.

## Required sub-skills

- dev-tools:using-git-worktrees (Step 1 — verify; shared gate, not an execute-plan sub-skill)
- dev-tools:execute-plan-run (Step 2 default)
- dev-tools:execute-plan-run-inline (Step 2 fallback only)
- dev-tools:execute-plan-finish (Step 3)

## Execution steps

### Step 1: Verify

Before loading or executing tasks:

- invoke `dev-tools:using-git-worktrees` if not already on the plan's feature branch/worktree
- confirm current branch is not `main`/`master`
- match plan header **Branch** and **Worktree** to current directory

### Step 2: Run

Load the plan from `docs/agent-files/plans/` (path from handoff, user, or latest if unambiguous).

**Default (subagents available):**

- invoke `dev-tools:execute-plan-run`
- pass full plan path; do not re-read plan ad hoc between orchestrator and run skill

**Fallback only** — platform lacks Task/subagent support **or** your human partner explicitly requests inline execution:

- invoke `dev-tools:execute-plan-run-inline`

Do not ask which mode unless fallback conditions apply.

### Step 3: Finish

After Step 2 completes all plan tasks:

- invoke `dev-tools:execute-plan-finish`
- verify tests, push feature branch, open PR with `gh pr create`

## Files in this skill

- `checklists/lifecycle-checklist.md` — operator checklist
- `references/policy.md` — one-way-in policy text

## Output contract

At end, report (via execute-plan-finish):

- plan path
- branch name
- PR URL
- tests run + pass/fail counts
- remaining risks (if any)

If any gate fails, stop and report exactly which step failed.
