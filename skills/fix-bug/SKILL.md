---
name: fix-bug
description: Use when a bug is discovered, documented, reproduced, or ready for repair.
---

# Fix Bug (single entrypoint)

Use this skill as the ONLY user-facing path for bug work.

## Purpose

One canonical lifecycle:

1. **fix-bug-log** — document the bug (discovery commit)
2. **Analyze** — root-cause investigation via `systematic-debugging` (before any fix)
3. **Classify route** — simple one-file bug or complex bug requiring design
4. **Simple bug route** — `fix-bug-resolve` with failing test, minimal fix, resolution commit
5. **Complex bug route** — route to `dev-tools:design-spec`, then implement via `dev-tools:execute-plan`
6. **Complete** — simple route uses `fix-bug-complete`; complex route finishes through `execute-plan`

## Hard policy

- Do not run ad-hoc bugfixing without a documented `bug_id`.
- Do not skip root-cause investigation (Step 2).
- Do not combine discovery and resolution in one commit.
- Do not invoke `fix-bug-log`, `fix-bug-resolve`, or `fix-bug-complete` directly — only via this skill.
- Do not invoke `systematic-debugging` directly for bugs — Step 2 runs it in bug context.
- Do not use the simple bug route for schema, migration, auth/security, API contract, cross-module, or product behavior changes.

## Required sub-skills

- dev-tools:fix-bug-log
- dev-tools:systematic-debugging (Step 2 — internal analysis sub-skill)
- dev-tools:fix-bug-resolve (simple bug route only)
- dev-tools:design-spec (complex bug route only)
- dev-tools:fix-bug-complete

## Execution steps

### Step 1: Log

If user does not already have `bug_id`:

- invoke `dev-tools:fix-bug-log`
- produce `docs/agent-plan/bugs/{bug_id}/{bug_id}-detail.md`
- commit discovery artifact

If `bug_id` exists:

- verify detail file exists before continuing.

### Step 2: Analyze

Before proposing or implementing fixes:

1. Read `docs/agent-plan/bugs/{bug_id}/{bug_id}-detail.md` (symptom, any known root cause, contributing factors)
2. **REQUIRED SUB-SKILL:** invoke `dev-tools:systematic-debugging` — complete at least Phase 1; continue through Phase 3 (Hypothesis and Verification) before resolve
3. Explicitly state **root-cause hypothesis** and **evidence** (reproduction, logs, trace, recent changes)
4. Report **confidence** (confirmed / likely / needs more data). If needs more data, stay in analyze — do not proceed to resolve
5. Do NOT propose or implement fixes — that is Step 3

### Step 3: Classify route

Classify the bug after analysis, before any fix. The simple bug route is allowed only when all criteria are satisfied. In short: one production file, clear behavior, no design decision, minimal risk.

| Criterion | Requirement |
|-----------|-------------|
| One production file | The likely fix is contained in one production source file. Test files and bug docs do not count. |
| Clear behavior | The symptom is specific and reproducible or already evidenced. |
| No design decision | No product choice, architecture choice, API contract change, schema change, migration, auth/security change, or cross-module behavior. |
| Minimal risk | The fix can be protected by one focused failing regression test. |

If any simple-bug criterion fails, use the complex bug route.

### Step 4A: Simple bug route

- invoke `dev-tools:fix-bug-resolve` with the same `bug_id`
- enforce: failing test first, minimal fix, full test suite, critique phase, resolution file, separate resolution commit

### Step 4B: Complex bug route

- invoke `dev-tools:design-spec` with the bug detail file at `docs/agent-plan/bugs/{bug_id}/{bug_id}-detail.md` as input
- carry the analyzed root-cause hypothesis and evidence into the design discussion
- after the spec and plan are approved, implementation proceeds through `dev-tools:execute-plan`
- do not invoke `fix-bug-resolve` for the same bug unless the design process narrows it back to the simple bug route and your human partner explicitly agrees
- do not invoke `fix-bug-complete`; `execute-plan` handles verification, push, and PR for the complex route

### Step 5: Complete simple route

- invoke `dev-tools:fix-bug-complete` with the same `bug_id`
- verify all completion gates (see fix-bug-complete skill)
- post output contract report
- fix-bug-complete then invokes `dev-tools:execute-plan-finish` to push the branch and open a pull request (PR enforcement — bug work integrates through review, same as plan work)

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
- PR URL (via execute-plan-finish)

If any gate fails, stop and report exactly which step failed.
