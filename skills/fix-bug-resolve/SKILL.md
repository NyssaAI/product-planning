---
name: fix-bug-resolve
description: Internal sub-skill for fix-bug contexts when an analyzed bug_id is ready for repair.
user-invocable: false
disable-model-invocation: true
---

# Fix Bug — Resolve

<INTERNAL-SUB-SKILL>
Invoked by `dev-tools:fix-bug` for the simple bug route. Users should use **fix-bug**, not this skill directly.
</INTERNAL-SUB-SKILL>

Fix a documented and analyzed bug through an iterative Ralph loop. Each iteration examines the current state, works toward a fix, runs tests, and critiques the result. The loop continues until the fix is verified and all tests pass.

<HARD-GATE>
A bug detail file MUST exist at `docs/agent-files/bugs/{bug_id}/{bug_id}-detail.md`, where `{bug_id}` is the full `{timestamp}-{short-slug}` from **fix-bug-log** (e.g., `2026.04.13-143207-broken-auth`). Parent **fix-bug** must have completed Step 2 (analyze via systematic-debugging) before this skill runs. If not documented yet, stop — parent should run fix-bug-log first.
</HARD-GATE>

## Checklist

You MUST complete these steps in order:

1. **Get bug_id** — from parent fix-bug (same id through the lifecycle)
2. **Validate bug file** — confirm `docs/agent-files/bugs/{bug_id}/{bug_id}-detail.md` exists. If not, stop.
3. **Read bug detail and analyze findings** — symptom, root-cause hypothesis from fix-bug Step 2
4. **Detect test runner** — identify the project's test command by checking for `package.json` (npm test), `pyproject.toml`/`pytest.ini` (pytest), `*.csproj` (dotnet test), `go.mod` (go test ./...), `Makefile` (make test), or ask the user.
5. **Start Ralph loop** — execute the setup script with the constructed prompt, `--max-iterations 20`, and `--completion-promise "BUG FIXED"`.
6. **Work the loop** — follow the Ralph loop prompt each iteration.

## Step 5: Constructing the Ralph Loop

Run the setup script via Bash. The prompt must be fully self-contained since it is fed back verbatim each iteration. Construct it by filling in the template below with the actual bug_id and test command, then pass it as the first argument.

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralph-loop.sh" \
  "$(cat <<'PROMPT_EOF'
{FILLED_PROMPT_TEMPLATE}
PROMPT_EOF
)" \
  --max-iterations 20 \
  --completion-promise "BUG FIXED"
```

### Prompt Template

Fill `{BUG_ID}` and `{TEST_COMMAND}` before passing to the setup script. Everything else stays verbatim.

```
You are fixing bug {BUG_ID}.

## State Check

Before doing anything, assess where you are:
- Read docs/agent-files/bugs/{BUG_ID}/{BUG_ID}-detail.md for the bug description
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

1. Write docs/agent-files/bugs/{BUG_ID}/{BUG_ID}-resolution.md with:
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

- **standards/bug-workflow.md** — resolution artifact layout
- **standards/timestamp-format.md** — `bug_id` format
- **dev-tools:fix-bug-log** — produces detail file
- **dev-tools:systematic-debugging** — root-cause investigation in fix-bug Step 2, before this step
- **dev-tools:fix-bug-complete** — parent invokes after resolve
- **dev-tools:fix-bug** — parent orchestrator
- **dev-tools:verification-before-completion** — evidence-before-claims in Phase 4–6
- **dev-tools:test-driven-development** — failing test first in Phase 3
