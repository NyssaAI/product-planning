---
name: fix-bug-complete
description: Internal sub-skill invoked by fix-bug only. Verifies completion gates and posts final bug report. Do not invoke directly — use dev-tools:fix-bug.
user-invocable: false
disable-model-invocation: true
---

# Fix Bug — Complete

<INTERNAL-SUB-SKILL>
Invoked by `dev-tools:fix-bug` at Step 4 (complete). Users should use **fix-bug**, not this skill directly.
</INTERNAL-SUB-SKILL>

Verify all completion gates after **fix-bug-resolve** and post the final report.

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

## Integration

- **dev-tools:fix-bug** — parent orchestrator
- **dev-tools:fix-bug-log** / **systematic-debugging** (Step 2) / **fix-bug-resolve** — upstream steps
