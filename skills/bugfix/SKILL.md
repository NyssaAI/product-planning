---
name: bugfix
description: Use when fixing a documented bug that has a detail file in docs/bugs/. Reads the bug description, starts a Ralph loop that examines, plans, implements, tests, and critiques the fix iteratively until all tests pass.
---

# Bugfix

Fix a documented bug through an iterative Ralph loop. Each iteration examines the current state, works toward a fix, runs tests, and critiques the result. The loop continues until the fix is verified and all tests pass.

<HARD-GATE>
A bug detail file MUST exist at `docs/bugs/{slug}/{slug}-detail.md` before this skill can run. If no bug is documented yet, tell the user to create the bug detail file first per the bug-workflow standard, then re-invoke this skill.
</HARD-GATE>

## Checklist

You MUST complete these steps in order:

1. **Get bug slug** — ask the user which bug to fix, or accept it as an argument. The slug follows the format `{timestamp}-{description}` (e.g., `2026-04-13-broken-auth`).
2. **Validate bug file** — confirm `docs/bugs/{slug}/{slug}-detail.md` exists. If not, stop.
3. **Read bug detail** — read the full bug description (symptom, root cause if known, contributing factors).
4. **Detect test runner** — identify the project's test command by checking for `package.json` (npm test), `pyproject.toml`/`pytest.ini` (pytest), `*.csproj` (dotnet test), `go.mod` (go test ./...), `Makefile` (make test), or ask the user.
5. **Start Ralph loop** — execute the setup script with the constructed prompt and `--completion-promise "BUG FIXED"`.
6. **Work the loop** — follow the Ralph loop prompt each iteration.

## Step 5: Constructing the Ralph Loop

Run the setup script via Bash. The prompt must be fully self-contained since it is fed back verbatim each iteration. Construct it by filling in the template below with the actual bug slug and test command, then pass it as the first argument.

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralph-loop.sh" \
  "$(cat <<'PROMPT_EOF'
{FILLED_PROMPT_TEMPLATE}
PROMPT_EOF
)" \
  --completion-promise "BUG FIXED"
```

### Prompt Template

Fill `{BUG_SLUG}` and `{TEST_COMMAND}` before passing to the setup script. Everything else stays verbatim.

```
You are fixing bug {BUG_SLUG}.

## State Check

Before doing anything, assess where you are:
- Read docs/bugs/{BUG_SLUG}/{BUG_SLUG}-detail.md for the bug description
- Run: git log --oneline -10
- Run: {TEST_COMMAND}

Use the results to determine your phase.

## Phase 1: Examine (no fix commits yet)

1. Read the bug description carefully — symptom, root cause, contributing factors
2. Reproduce the bug. Find the failing behavior. If there is a root cause listed, verify it. If not, investigate:
   - Read error messages and stack traces completely
   - Check recent changes (git log, git diff)
   - Trace the data flow to find where it breaks
3. State the root cause clearly before proceeding

DO NOT propose fixes until you can state the root cause.

## Phase 2: Plan

1. Design the minimal fix that addresses the root cause — not symptoms
2. Identify which files need to change
3. Plan a failing test that proves the bug exists

## Phase 3: Implement

1. Write a failing test that reproduces the bug
2. Run {TEST_COMMAND} to confirm it fails
3. Implement the minimal fix
4. Run {TEST_COMMAND} to confirm the new test passes

## Phase 4: Test

Run the FULL test suite:
{TEST_COMMAND}

Read the complete output. Count failures. Do not skip or summarize.

## Phase 5: Critique

Review your fix critically:
- Does it address the root cause, not just the symptom?
- Could it introduce regressions?
- Are there edge cases not covered?
- Is the test meaningful — would it catch the bug if reintroduced?
- Are all tests passing?

If ANY issues remain, fix them. Do NOT output the completion promise.

## Phase 6: Resolve (only when ALL tests pass and fix is solid)

1. Write docs/bugs/{BUG_SLUG}/{BUG_SLUG}-resolution.md with:
   - Fix applied: what was changed and why
   - Status: resolved
   - Commits: list the commit SHAs that contain the fix
2. Commit the resolution file
3. Output EXACTLY: <promise>BUG FIXED</promise>

CRITICAL: Do NOT output the promise unless ALL of these are true:
- All tests pass (verified by running {TEST_COMMAND} in THIS iteration)
- The fix addresses the root cause
- The resolution file is written and committed
- You have evidence, not assumptions
```

## Integration

**References:**
- **bug-workflow standard** — bug detail and resolution file format
- **superpowers:systematic-debugging** — root cause investigation principles used in Phase 1
- **superpowers:verification-before-completion** — evidence-before-claims principle used in Phase 4-6
- **superpowers:test-driven-development** — failing test first in Phase 3
