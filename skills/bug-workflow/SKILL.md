---
name: bug-workflow
description: Use when a bug is discovered and needs to be formally documented before being worked on. Creates docs/bugs/{timestamp}-{slug}/{timestamp}-{slug}-detail.md per the bug-workflow standard, commits, and pushes. The resolution file is written later (typically by the bugfix skill) in a separate commit.
---

# Bug Workflow — Discovery

Formally document a newly-discovered bug, conforming to the dev-standards bug-workflow. Produces a dated directory and a detail file so the bug can be worked on systematically by the `bugfix` skill (or manually).

**Always use AskUserQuestion** when asking the user anything. One question at a time.

**Standard rule (non-negotiable):** discovery and resolution are separate commits. This skill handles discovery only. Do NOT combine with the resolution commit.

## Checklist

You MUST complete these steps in order:

1. **Gather bug info** — symptom, root cause (if known), contributing factors, short slug
2. **Generate paths** — canonical timestamp + slug
3. **Write detail file**
4. **Commit and push** (discovery commit)
5. **Confirm next step**

## Step 1: Gather bug info

Ask these questions one at a time:

1. **Symptom** — what was observed. Specific and factual. ("Login returns 500 after submitting valid credentials" beats "Login is broken".)
2. **Root cause** — why it's happening, if known. If not known, answer "unknown" or "under investigation" and move on; root cause is determined during the fix loop.
3. **Contributing factors** — environment (OS, browser, runtime version), configuration, recent changes, or code that contributed. If nothing known beyond the symptom, answer "none known".
4. **Short slug** — 3–6 dash-separated words that describe the bug, for the directory name. Example: `login-500-after-valid-credentials`. The agent may propose a slug based on the symptom; confirm with the user.

## Step 2: Generate paths

Use the `YYYY.MM.DD-HHMMSS` variant of the dev-standards `timestamp-format` standard — the time-component variant, used for artifacts that may be filed multiple times per day (bugs, backlog items). Use 24-hour local time at the moment of creation. Example: `2026.04.24-094512`. (Specs and plans use the date-only `YYYY-MM-DD` variant instead.)

Construct the directory and file paths:

- Directory: `docs/bugs/{timestamp}-{slug}/`
- Detail file: `docs/bugs/{timestamp}-{slug}/{timestamp}-{slug}-detail.md`

Example with slug `login-500-after-valid-credentials` and timestamp `2026.04.24-094512`:
- `docs/bugs/2026.04.24-094512-login-500-after-valid-credentials/`
- `docs/bugs/2026.04.24-094512-login-500-after-valid-credentials/2026.04.24-094512-login-500-after-valid-credentials-detail.md`

Capture the full `{timestamp}-{slug}` identifier — it will be the slug input to the `bugfix` skill later.

## Step 3: Write detail file

Create the directory if missing. Write the detail file using this template:

```markdown
# Bug: {slug}

**Discovered:** {timestamp in canonical format}

## Symptom

{from Step 1.1 — be factual and specific}

## Root cause

{from Step 1.2 — or "Unknown at time of writing (investigate during fix)"}

## Contributing factors

{from Step 1.3 — or "None known at time of writing"}
```

Substitute `{slug}` with the human-readable slug (without timestamp prefix in the heading for readability), and `{timestamp}` with the canonical format.

## Step 4: Commit and push

Stage only the new file, commit, and push. Do NOT stage or commit unrelated changes — the discovery commit must stay scoped.

Commit message format:

```
docs(bug): discover {timestamp}-{slug}

{one-sentence symptom summary}
```

If the repo has a remote configured (`git remote -v` shows output), push immediately after the commit. If no remote is configured, skip the push and note it in Step 5.

## Step 5: Confirm next step

Tell the user:

> Bug documented and committed:
>
> - `docs/bugs/{timestamp}-{slug}/{timestamp}-{slug}-detail.md`
> - Commit: `{sha}`
> - Pushed: yes / no (no remote configured)
>
> **Next step:** invoke the `bugfix` skill with this slug to start the fix loop:
>
> ```
> bugfix {timestamp}-{slug}
> ```
>
> Resolution will be committed separately per the bug-workflow standard (no batching).

## Tips

- **Symptom first, theories second.** Keep the Symptom section strictly observational; speculation belongs in Root cause.
- **"Unknown" is a valid root cause answer** at discovery time. The point of the discovery step is to capture what's visible; investigation is the fix step's job.
- **Short slug, descriptive slug.** Long enough that anyone reading a `git log` entry knows what the bug is; short enough to be a usable directory name.
- **Do not combine with the fix commit.** The standard explicitly requires separate discovery and resolution commits so each stays scoped and reviewable.

## Integration

- **bug-workflow standard** — from `dev-standards`; defines directory structure, file contents, and the "no batching" rule.
- **timestamp-format standard** — from `dev-standards`; defines both the `YYYY.MM.DD-HHMMSS` time-component variant (used here) and the `YYYY-MM-DD` date-only variant (used by specs and plans).
- **dev-tools:bugfix** — the follow-on skill that reads the detail file, runs the fix loop, and writes the resolution file in a separate commit.
