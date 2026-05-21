---
description: "Explain Ralph Loop infrastructure (not a bug entry point)"
---

# Ralph Loop Help

Please explain the following to the user:

## What is Ralph Loop?

Ralph Loop implements the Ralph Wiggum technique — an iterative development methodology based on continuous AI loops, pioneered by Geoffrey Huntley.

**Core concept:**
```bash
while :; do
  cat PROMPT.md | claude-code --continue
done
```

The same prompt is fed to Claude repeatedly. The "self-referential" aspect comes from Claude seeing its own previous work in the files and git history, not from feeding output back as input.

**Each iteration:**
1. Claude receives the SAME prompt
2. Works on the task, modifying files
3. Tries to exit
4. Stop hook intercepts and feeds the same prompt again
5. Claude sees its previous work in the files
6. Iteratively improves until completion

## Not a workflow entry point

Ralph is **infrastructure** (Stop hook + `setup-ralph-loop.sh`), not a skill and not how you start bug work.

| Task | Entry | Ralph's role |
|------|-------|--------------|
| **Bug** | **`fix-bug`** | Used automatically inside **fix-bug-resolve** (Claude Code) |
| **Non-bug iterative task** | Your normal workflow, or optional `/ralph-loop` (advanced) | Manual loop via slash command |

**For bugs:** invoke **`fix-bug`** only. Do not use `/ralph-loop` — you skip log, analyze, and separate discovery/resolution commits.

## Available commands (Claude Code, advanced)

### /ralph-loop <PROMPT> [OPTIONS]

Optional iterative loop for **non-bug** tasks with clear success criteria. Hidden from default slash-command discovery.

**Usage:**
```
/ralph-loop "Refactor the cache layer for clarity" --max-iterations 20
/ralph-loop "Add integration tests for the export pipeline" --completion-promise "TESTS COMPLETE"
```

**Options:**
- `--max-iterations <n>` - Max iterations before auto-stop
- `--completion-promise <text>` - Promise phrase to signal completion

**How it works:**
1. Creates `.claude/ralph-loop.local.md` state file
2. You work on the task
3. When you try to exit, Stop hook intercepts
4. Same prompt fed back until promise detected or max iterations

---

### /cancel-ralph

Cancel an active Ralph loop (removes the loop state file).

**Usage:**
```
/cancel-ralph
```

---

## Key concepts

### Completion promises

To signal completion, Claude must output a `<promise>` tag:

```
<promise>TASK COMPLETE</promise>
```

The Stop hook looks for this tag. Without it (and without `--max-iterations`), Ralph can run until cancelled.

## Example (non-bug)

### Iterative refactor

```
/ralph-loop "Refactor src/cache/ to split read and write paths. Output <promise>REFACTOR DONE</promise> when all tests pass." --completion-promise "REFACTOR DONE" --max-iterations 10
```

## When to use `/ralph-loop`

**Good for (non-bug only):**
- Well-defined tasks with clear success criteria
- Iterative refinement where the same prompt should repeat
- Greenfield or refactor loops with objective completion checks

**Not for:**
- **Bugs** — use **`fix-bug`**
- Design or product decisions — use **brainstorming** / **plan-product**
- Tasks with unclear success criteria

## Learn more

- Original technique: https://ghuntley.com/ralph/
- Ralph Orchestrator: https://github.com/mikeyobrien/ralph-orchestrator
