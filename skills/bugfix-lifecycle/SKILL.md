---
name: bugfix-lifecycle
description: Single canonical entrypoint for bug handling. Orchestrates discovery, root-cause investigation, fix loop, and resolution commit by invoking bug-workflow + systematic-debugging + bugfix in sequence.
---

# Bugfix Lifecycle (single entrypoint)

Use this skill as the ONLY user-facing path for bug work.

## Purpose

Reduce surface area and enforce one canonical lifecycle:
1) discover/document bug
2) investigate root cause
3) fix with evidence
4) resolve with separate commit

## Hard policy

- Do not run ad-hoc bugfixing without a documented bug id.
- Do not skip root-cause investigation.
- Do not combine discovery and resolution in one commit.

## Required sub-skills

- dev-tools:bug-workflow
- dev-tools:systematic-debugging
- dev-tools:bugfix

## Execution steps

### Step 1: Discovery gate

If user does not already have `bug_id`:
- invoke `dev-tools:bug-workflow`
- produce `docs/bugs/{bug_id}/{bug_id}-detail.md`
- commit discovery artifact

If `bug_id` exists:
- verify detail file exists before continuing.

### Step 2: Debugging discipline gate

Before proposing or implementing fixes:
- invoke `dev-tools:systematic-debugging`
- complete root-cause investigation phase
- explicitly state root-cause hypothesis and evidence

### Step 3: Fix loop

Invoke `dev-tools:bugfix` using the same `bug_id`.
Enforce:
- failing test first
- minimal fix
- full test suite
- critique phase
- resolution file and separate resolution commit

### Step 4: Completion gate

Only complete when all are true:
- full suite passes
- root cause addressed (not just symptom)
- `docs/bugs/{bug_id}/{bug_id}-resolution.md` exists
- resolution committed separately

## Files in this skill

- `checklists/lifecycle-checklist.md` — operator checklist
- `templates/bugfix-summary-template.md` — optional end-of-run summary template
- `references/policy.md` — one-way-in policy text

## Output contract

At end, report:
- bug_id
- discovery commit sha
- resolution commit sha
- tests run + pass/fail counts
- remaining risks (if any)

If any gate fails, stop and report exactly which gate failed.
