---
name: execute-plan
description: Use when a written implementation plan exists, PR review feedback needs follow-up, or approved planned work is ready for PR closeout.
---

# Execute Plan (single entrypoint)

Use this skill as the ONLY user-facing path for implementing a written plan, handling PR review feedback on that work, and closing out an approved PR created by that plan.

## Purpose

One canonical lifecycle:

1. **Verify** — feature branch + worktree (`using-git-worktrees`)
2. **Run** — implement plan tasks (`execute-plan-run` default, or `execute-plan-run-inline` fallback)
3. **Finish** — verify tests, push, open PR (`execute-plan-finish`)
4. **Review feedback follow-up** — before approval, evaluate requested changes (`receiving-code-review`), fix, verify, push updates
5. **Post-review closeout** — after review approval, regression-check and merge PR (`merge-pr`)

## Hard policy

- Do not implement plan tasks without a written plan in `docs/agent-plan/plans/` (unless your human partner explicitly points at another plan path).
- Do not invoke `execute-plan-run`, `execute-plan-run-inline`, or `execute-plan-finish` directly — only via this skill.
- Do not invoke `merge-pr` directly — use **execute-plan** for post-review closeout.
- Do not apply PR review feedback or requested changes blindly — invoke **receiving-code-review** first.
- Do not skip worktree verification (Step 1).
- Default to subagent execution when the platform supports it.

## Required sub-skills

- dev-tools:using-git-worktrees (Step 1 — verify; shared gate, not an execute-plan sub-skill)
- dev-tools:execute-plan-run (Step 2 default)
- dev-tools:execute-plan-run-inline (Step 2 fallback only)
- dev-tools:execute-plan-finish (Step 3)
- dev-tools:receiving-code-review (Step 4, PR review feedback follow-up)
- dev-tools:merge-pr (Step 5, post-review closeout only)

## Execution steps

### Step 0: Entrypoint gate — confirm a plan exists

This skill is the entrypoint for implementing a plan. **Before any worktree or code work**, resolve intent and the plan:

1. **Route by request type first:**
   - merge / land / close out an already reviewed PR → skip to **Step 5: Post-review closeout** (no plan load needed).
   - address PR review feedback / requested changes → go to **Step 4: Review feedback follow-up** after worktree verification (works off the existing branch — no new plan required).
   - otherwise (implement work) → continue this gate.
2. **Resolve the plan path:** an explicit path your human partner or a handoff gave you, else the single plan file under `docs/agent-plan/plans/`.
3. **HARD GATE — no plan, no run.** If no plan file exists and none was provided: **STOP here.** Do NOT invoke `using-git-worktrees`, do NOT create a branch, do NOT leave `main`, do NOT start implementing. Tell your human partner there is no plan to execute and route them to `dev-tools:design-spec` (which produces a spec → plan), or ask them to point at a specific plan path.
4. **Ambiguity:** if multiple plans exist and none was specified, do NOT silently pick the latest — list them and ask which to run.
5. **HARD GATE — ai-plan evidence.** If `docs/agent-plan/context/index.md` exists in the repo, read the resolved plan before Step 1 and verify it contains:
   - `**Planning module:** docs/agent-plan/context/modules/<module-id>.md`
   - `## Planning context`
   - a `**Module:** <module-id>` entry matching the planning module path
   If any field is missing or inconsistent, **STOP here.** Do NOT invoke `using-git-worktrees`, do NOT invoke `execute-plan-run`, and do NOT implement from the plan. Tell your human partner the plan is missing enforced ai-plan context and route back to `dev-tools:design-spec` / `write-plan` to regenerate it.
6. Carry the resolved plan path into Steps 1–2.

### Step 1: Verify

Before executing tasks (plan path already resolved in Step 0):

- invoke `dev-tools:using-git-worktrees` if not already on the plan's feature branch/worktree
- confirm current branch is not `main`/`master`
- match plan header **Branch** and **Worktree** to current directory

### Step 2: Run

Load the plan path resolved in Step 0. Do NOT re-resolve to "latest" here — if Step 0 did not yield a single plan, you should not have reached Step 2.

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

Stop after the PR is opened unless your human partner explicitly says the PR has already been reviewed and approved. The merge decision happens after review.

### Step 4: Review feedback follow-up

Use this when your human partner provides PR review comments, says reviewers requested changes, or asks to address review feedback before approval.

- invoke `dev-tools:receiving-code-review` before changing code
- evaluate each comment against the codebase and plan; clarify unclear or conflicting feedback before implementation
- implement accepted feedback on the existing feature branch/worktree
- use `dev-tools:test-driven-development` for behavior changes
- run targeted verification, then invoke `dev-tools:execute-plan-finish` to verify and push the updated branch
- stop after updates are pushed; wait for review approval before post-review closeout

### Step 5: Post-review closeout

Use this only when your human partner says the PR has been reviewed and approved, or asks to merge/land/close out the PR after review.

- invoke `dev-tools:merge-pr`
- pass the PR number or URL if provided; otherwise merge-pr resolves the PR from the current branch
- do not merge without the regression report and confirmation required by merge-pr

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

For post-review closeout, report the merge result via merge-pr:

- PR number / URL
- merge strategy
- regression-check verdict
- cleanup status

If any gate fails, stop and report exactly which step failed.
