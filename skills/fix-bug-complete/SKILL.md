---
name: fix-bug-complete
description: Internal sub-skill invoked by fix-bug only for the simple bug route. Verifies completion gates and posts final bug report. Do not invoke directly — use dev-tools:fix-bug.
user-invocable: false
disable-model-invocation: true
---

# Fix Bug — Complete

<INTERNAL-SUB-SKILL>
Invoked by `dev-tools:fix-bug` only for the simple bug route. Users should use **fix-bug**, not this skill directly.
</INTERNAL-SUB-SKILL>

Verify all completion gates after **fix-bug-resolve** and post the final report. This skill is not used for complex bugs routed through **design-spec** and **execute-plan**.

## Completion gates

Only mark complete when **all** are true:

- [ ] `bug_id` exists and detail file exists: `docs/agent-files/bugs/{bug_id}/{bug_id}-detail.md`
- [ ] Discovery committed separately (from fix-bug-log)
- [ ] Root cause investigated (fix-bug Step 2 / systematic-debugging completed with hypothesis + evidence)
- [ ] Full test suite passes
- [ ] Root cause addressed (not just symptom)
- [ ] Resolution file exists: `docs/agent-files/bugs/{bug_id}/{bug_id}-resolution.md`
- [ ] Resolution committed separately from discovery

Use `checklists/lifecycle-checklist.md` in the parent **fix-bug** skill folder as the operator checklist.

## Output contract

Report to your human partner:

```
## Fix bug complete

- **bug_id:** {bug_id}
- **Discovery commit:** {sha}
- **Resolution commit:** {sha}
- **Tests:** {command} — {pass count} passed, {fail count} failed
- **Remaining risks:** {none | list}
```

If any gate fails, stop and report exactly which gate failed. Do not claim completion.

## Optional summary

If useful, fill `templates/fix-bug-summary-template.md` from the parent fix-bug skill folder.

## PR enforcement

After all completion gates pass and the output report is printed:

**REQUIRED SUB-SKILL:** Invoke `dev-tools:execute-plan-finish` to push the branch and open a pull request.

> "Fix validated. Invoking **execute-plan-finish** to push the branch and open a pull request."

`execute-plan-finish` handles: environment detection, feature branch verification, base branch detection, `gh pr create` (including Bug section auto-detection from the branch name), and the worktree cleanup prompt. Do not duplicate any of these steps here.

**Prerequisite:** all completion gates above must be true before invoking `execute-plan-finish`. If any gate fails, stop at the gate — do not proceed to PR creation.

## Integration

- **dev-tools:fix-bug** — parent orchestrator, simple route only
- **dev-tools:fix-bug-log** / **systematic-debugging** (Step 2) / **fix-bug-resolve** — upstream steps
- **dev-tools:execute-plan-finish** — invoked after all gates pass (PR enforcement)
- **dev-tools:execute-plan** — after PR review, post-review closeout invokes internal merge-pr for regression checks and worktree cleanup
