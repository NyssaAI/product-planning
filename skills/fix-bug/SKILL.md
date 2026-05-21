---
name: fix-bug
description: Use when a bug is discovered, documented, or needs fixing. Single canonical entrypoint for all bug work — orchestrates log, analyze, resolve, and complete steps.
---

# Fix Bug (single entrypoint)

Use this skill as the ONLY user-facing path for bug work.

## Purpose

One canonical lifecycle:

1. **fix-bug-log** — document the bug (discovery commit)
2. **Analyze** — root-cause investigation via `systematic-debugging` (before any fix)
3. **fix-bug-resolve** — failing test, fix, resolution commit
4. **fix-bug-complete** — verify gates and report

## Hard policy

- Do not run ad-hoc bugfixing without a documented `bug_id`.
- Do not skip root-cause investigation (Step 2).
- Do not combine discovery and resolution in one commit.
- Do not invoke `fix-bug-log`, `fix-bug-resolve`, or `fix-bug-complete` directly — only via this skill.
- Do not invoke `systematic-debugging` directly for bugs — Step 2 runs it in bug context.

## Required sub-skills

- dev-tools:fix-bug-log
- dev-tools:systematic-debugging (Step 2 — analyze; shared method, not a fix-bug sub-skill)
- dev-tools:fix-bug-resolve
- dev-tools:fix-bug-complete

## Execution steps

### Step 1: Log

If user does not already have `bug_id`:

- invoke `dev-tools:fix-bug-log`
- produce `docs/bugs/{bug_id}/{bug_id}-detail.md`
- commit discovery artifact

If `bug_id` exists:

- verify detail file exists before continuing.

### Step 2: Analyze

Before proposing or implementing fixes:

1. Read `docs/bugs/{bug_id}/{bug_id}-detail.md` (symptom, any known root cause, contributing factors)
2. **REQUIRED SUB-SKILL:** invoke `dev-tools:systematic-debugging` — complete at least Phase 1; continue through Phase 3 (Hypothesis and Verification) before resolve
3. Explicitly state **root-cause hypothesis** and **evidence** (reproduction, logs, trace, recent changes)
4. Report **confidence** (confirmed / likely / needs more data). If needs more data, stay in analyze — do not proceed to resolve
5. Do NOT propose or implement fixes — that is Step 3

### Step 3: Resolve

- invoke `dev-tools:fix-bug-resolve` with the same `bug_id`
- enforce: failing test first, minimal fix, full test suite, critique phase, resolution file, separate resolution commit

### Step 4: Complete

- invoke `dev-tools:fix-bug-complete` with the same `bug_id`
- verify all completion gates (see fix-bug-complete skill)
- post output contract report

## Files in this skill

- `checklists/lifecycle-checklist.md` — operator checklist
- `templates/fix-bug-summary-template.md` — optional end-of-run summary template
- `references/policy.md` — one-way-in policy text

## Output contract

At end, report (via fix-bug-complete):

- bug_id
- discovery commit sha
- resolution commit sha
- tests run + pass/fail counts
- remaining risks (if any)

If any gate fails, stop and report exactly which step failed.
