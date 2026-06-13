---
name: add-bug
description: Use when documenting a newly discovered bug for later without analyzing, debugging, or fixing it in the current session.
---

# Add Bug

Formally document a newly discovered bug as a planning artifact, conforming to `standards/bug-workflow.md` (bundled in dev-tools). This is parallel to `add-backlog`: it captures work for later and stops.

**Announce at start:** "I'm using the add-bug skill to document this bug."

**Always use AskUserQuestion** when asking the user anything. One question at a time.

Do NOT analyze, debug, resolve, fix, implement, or invoke systematic-debugging.

## Checklist

You MUST complete these steps in order:

1. **Gather bug info** - symptom, root cause if already known, contributing factors, short slug
2. **Generate paths** - canonical timestamp + slug to form `bug_id`
3. **Write detail file**
4. **Commit and push**
5. **Confirm completion**

## Step 1: Gather Bug Info

Ask these questions one at a time:

1. **Symptom** - what was observed. Specific and factual. ("Login returns 500 after valid credentials" beats "login is broken".)
2. **Root cause** - why it is happening, if already known. If not known, write "Unknown at time of writing".
3. **Contributing factors** - environment, configuration, recent changes, related logs, or known triggering conditions. If nothing is known beyond the symptom, write "None known at time of writing".
4. **Short slug** - 3-6 dash-separated words that describe the bug. Example: `login-500-valid-credentials`. The agent may propose a slug based on the symptom; confirm with the user.

Do not investigate unknown root cause during this skill. Capture what is known and stop.

## Step 2: Generate Paths

Use the `YYYY.MM.DD-HHMMSS` variant from `standards/timestamp-format.md`. Use 24-hour local time at the moment of creation. Example: `2026.04.24-094512`.

Construct paths using full `bug_id` = `{timestamp}-{slug}`:

- Directory: `docs/agent-files/bugs/{bug_id}/`
- Detail file: `docs/agent-files/bugs/{bug_id}/{bug_id}-detail.md`

Example `bug_id`: `2026.04.24-094512-login-500-valid-credentials`

## Step 3: Write Detail File

Create the directory if missing. Write the detail file using this template:

```markdown
# Bug: {slug}

**Discovered:** {timestamp in canonical format}

## Symptom

{from Step 1.1}

## Root cause

{from Step 1.2, or "Unknown at time of writing"}

## Contributing factors

{from Step 1.3, or "None known at time of writing"}
```

If the user's input for any field is bulletable, format it as a Markdown bullet list. If it is narrative, render it as paragraphs.

## Step 4: Commit and Push

Stage only the new file, commit, and push. Do NOT stage or commit unrelated changes - the bug logging commit must stay scoped.

Commit message format:

```text
docs(bug): add {bug_id}

{one-sentence symptom summary}
```

If the repo has a remote configured (`git remote -v` shows output), push immediately. If no remote is configured, skip the push and note it in Step 5.

## Step 5: Confirm Completion

Tell the user:

> Bug documented and committed:
>
> - `docs/agent-files/bugs/{bug_id}/{bug_id}-detail.md`
> - Commit: `{sha}`
> - Pushed: yes / no (no remote configured)
>
> The bug is now documented. When ready to fix it, invoke `dev-tools:fix-bug` with this `bug_id`.

Stop after confirmation. Do not continue into analysis or implementation.

## Integration

- **bug-workflow** - `standards/bug-workflow.md`
- **timestamp-format** - `standards/timestamp-format.md`
- **dev-tools:fix-bug** - start here later when the bug should be analyzed and fixed
