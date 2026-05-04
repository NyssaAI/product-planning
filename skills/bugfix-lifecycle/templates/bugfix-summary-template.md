# bugfix lifecycle summary

bug_id: {bug_id}

discovery
- detail file: docs/bugs/{bug_id}/{bug_id}-detail.md
- discovery commit: {discovery_sha}

root cause
- statement: {root_cause}
- evidence: {evidence_summary}

fix + verification
- failing test added: {yes_no}
- test command: {test_command}
- full suite result: {result}
- resolution file: docs/bugs/{bug_id}/{bug_id}-resolution.md
- resolution commit: {resolution_sha}

risk notes
- {remaining_risks_or_none}
