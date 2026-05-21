# fix-bug summary

bug_id: {bug_id}

log (fix-bug-log)
- detail file: docs/bugs/{bug_id}/{bug_id}-detail.md
- discovery commit: {discovery_sha}

analyze (systematic-debugging via fix-bug Step 2)
- root cause: {root_cause}
- evidence: {evidence_summary}

resolve (fix-bug-resolve)
- failing test added: {yes_no}
- test command: {test_command}
- full suite result: {result}
- resolution file: docs/bugs/{bug_id}/{bug_id}-resolution.md
- resolution commit: {resolution_sha}

complete (fix-bug-complete)
- remaining risks: {remaining_risks_or_none}
