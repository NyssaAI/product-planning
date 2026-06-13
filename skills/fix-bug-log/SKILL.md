---
name: fix-bug-log
description: Internal sub-skill for fix-bug contexts when a newly discovered bug needs a docs/agent-files/bugs/ entry before analysis.
user-invocable: false
disable-model-invocation: true
---

# Fix Bug — Log

<INTERNAL-SUB-SKILL>
Invoked by `dev-tools:fix-bug` at Step 1 (log). Users should use **fix-bug**, not this skill directly.
</INTERNAL-SUB-SKILL>

Formally document a newly-discovered bug, conforming to `standards/bug-workflow.md` (bundled in dev-tools). Produces a dated directory and a detail file for downstream fix-bug steps.

**Always use AskUserQuestion** when asking the user anything. One question at a time.

**Standard rule (non-negotiable):** discovery and resolution are separate commits. This skill handles discovery only. Do NOT combine with the resolution commit.

## Checklist

You MUST complete these steps in order:

1. **Gather bug info** — symptom, root cause (if known), contributing factors, short slug
2. **Generate paths** — canonical timestamp + slug → `bug_id`
3. **Write detail file**
4. **Commit and push** (discovery commit)
5. **Confirm logged** — return `bug_id` to parent fix-bug skill

## Step 1: Gather bug info

Ask these questions one at a time:

1. **Symptom** — what was observed. Specific and factual. ("Login returns 500 after submitting valid credentials" beats "Login is broken".)
2. **Root cause** — why it's happening, if known. If not known, answer "unknown" or "under investigation" and move on; root cause is determined in fix-bug Step 2 (systematic-debugging).
3. **Contributing factors** — environment (OS, browser, runtime version), configuration, recent changes, or code that contributed. If nothing known beyond the symptom, answer "none known".
4. **Short slug** — 3–6 dash-separated words that describe the bug, for the directory name. Example: `login-500-after-valid-credentials`. The agent may propose a slug based on the symptom; confirm with the user.

## Step 2: Generate paths

Use the `YYYY.MM.DD-HHMMSS` variant from `standards/timestamp-format.md`. Use 24-hour local time at the moment of creation. Example: `2026.04.24-094512`.

Construct paths using full `bug_id` = `{timestamp}-{slug}`:

- Directory: `docs/agent-files/bugs/{bug_id}/`
- Detail file: `docs/agent-files/bugs/{bug_id}/{bug_id}-detail.md`

Example `bug_id`: `2026.04.24-094512-login-500-after-valid-credentials`

## Step 3: Write detail file

Create the directory if missing. Write the detail file using this template:

```markdown
# Bug: {slug}

**Discovered:** {timestamp in canonical format}

## Symptom

{from Step 1.1 — be factual and specific}

## Root cause

{from Step 1.2 — or "Unknown at time of writing (investigate during fix-bug Step 2)"}

## Contributing factors

{from Step 1.3 — or "None known at time of writing"}
```

## Step 4: Commit and push

Stage only the new file, commit, and push. Do NOT stage or commit unrelated changes.

Commit message format:

```
docs(bug): discover {bug_id}

{one-sentence symptom summary}
```

If the repo has a remote configured, push immediately. If no remote, note it in Step 5.

## Step 5: Confirm logged

Tell the user:

> Bug logged and committed:
>
> - `docs/agent-files/bugs/{bug_id}/{bug_id}-detail.md`
> - Commit: `{sha}`
> - Pushed: yes / no (no remote configured)
>
> Continuing to **fix-bug Step 2** (analyze via systematic-debugging).

Return `bug_id` to the parent **fix-bug** skill. Do not invoke fix-bug-resolve, fix-bug-complete, or systematic-debugging directly — the parent orchestrator handles the next step.

## Integration

- **standards/bug-workflow.md** — artifact layout
- **standards/timestamp-format.md** — `bug_id` format
- **dev-tools:fix-bug** — parent orchestrator; Step 2 invokes systematic-debugging
