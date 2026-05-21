---
name: backlog-workflow
description: Use when adding a new planned work item to the backlog. Creates docs/backlog/{timestamp}-{slug}/{timestamp}-{slug}-detail.md per the backlog-workflow standard, commits, and pushes.
---

# Backlog Workflow

Formally document a new backlog item (planned work, not a current bug or in-flight feature), conforming to `standards/backlog-workflow.md` (bundled in dev-tools).

**Always use AskUserQuestion** when asking the user anything. One question at a time.

## Checklist

You MUST complete these steps in order:

1. **Gather backlog-item info** — summary, context, scope, acceptance criteria, short slug
2. **Generate paths** — canonical timestamp + slug
3. **Write detail file**
4. **Commit and push**
5. **Confirm completion**

## Step 1: Gather backlog-item info

Ask these questions one at a time:

1. **Summary** — one line describing the work. ("Add SSO login via Okta" beats "auth stuff".)
2. **Context** — why this work matters, what it unblocks, who asked for it, any related bugs or customer asks. If purely internal / tech-debt, describe the cost of not doing it.
3. **Scope — in:** what's included in this work item.
4. **Scope — out:** what's explicitly excluded (deliberate non-goals for this item, so it doesn't drift into adjacent work).
5. **Acceptance criteria** — how to know it's done. Testable assertions, demo-able outcomes, or a measurable threshold. Bulleted list is typical.
6. **Short slug** — 3–6 dash-separated words that describe the item. Example: `add-sso-via-okta`. The agent may propose a slug based on the summary; confirm with the user.

## Step 2: Generate paths

Use the `YYYY.MM.DD-HHMMSS` variant from `standards/timestamp-format.md` — the time-component variant, used for artifacts that may be filed multiple times per day (bugs, backlog items). Use 24-hour local time at the moment of creation. Example: `2026.04.24-102847`. (Specs and plans use the date-only `YYYY-MM-DD` variant instead.)

Construct the directory and file paths:

- Directory: `docs/backlog/{timestamp}-{slug}/`
- Detail file: `docs/backlog/{timestamp}-{slug}/{timestamp}-{slug}-detail.md`

Example:
- `docs/backlog/2026.04.24-102847-add-sso-via-okta/`
- `docs/backlog/2026.04.24-102847-add-sso-via-okta/2026.04.24-102847-add-sso-via-okta-detail.md`

## Step 3: Write detail file

Create the directory if missing. Write the detail file using this template:

```markdown
# Backlog: {slug}

**Added:** {timestamp in canonical format}

## Summary

{from Step 1.1}

## Context

{from Step 1.2}

## Scope

**In scope:**

{from Step 1.3}

**Out of scope:**

{from Step 1.4}

## Acceptance criteria

{from Step 1.5}
```

Substitute `{slug}` with the human-readable slug (without timestamp prefix in the heading for readability), and `{timestamp}` with the canonical format.

If the user's input for any field is bulletable (multiple items), format as a Markdown bullet list in the output. If it's narrative, render as paragraphs.

## Step 4: Commit and push

Stage only the new file, commit, and push. Do NOT stage or commit unrelated changes — the backlog commit must stay scoped.

Commit message format:

```
docs(backlog): add {timestamp}-{slug}

{summary line from Step 1.1}
```

If the repo has a remote configured (`git remote -v` shows output), push immediately. If no remote is configured, skip the push and note it in Step 5.

## Step 5: Confirm completion

Tell the user:

> Backlog item documented and committed:
>
> - `docs/backlog/{timestamp}-{slug}/{timestamp}-{slug}-detail.md`
> - Commit: `{sha}`
> - Pushed: yes / no (no remote configured)
>
> The item is now in the backlog. When you're ready to work on it, read the detail file and use the `writing-plans` skill to turn it into an implementation plan, or the `brainstorming` skill if more design discussion is needed.

## Tips

- **Acceptance criteria are the deal.** Fuzzy acceptance criteria produce fuzzy work. Prefer testable assertions ("all existing unit tests still pass, plus a new integration test verifying X") over vague intent ("it works well").
- **Scope — out is as important as Scope — in.** Explicitly listing non-goals prevents the item from silently growing into something else during planning.
- **Context answers "why now" / "why at all".** Future you will appreciate knowing why this item was worth writing down.
- **Short slug, descriptive slug.** Long enough to be meaningful in a `git log`; short enough to be a usable directory name.

## Integration

- **backlog-workflow** — `standards/backlog-workflow.md`
- **timestamp-format** — `standards/timestamp-format.md`
- **dev-tools:writing-plans** — turns a backlog item into a bite-sized implementation plan when work starts.
- **dev-tools:brainstorming** — for design-heavy backlog items that need exploration before planning.
