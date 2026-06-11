# fix-bug checklist

- [ ] bug_id exists OR fix-bug-log completed
- [ ] detail file exists: docs/agent-files/bugs/{bug_id}/{bug_id}-detail.md
- [ ] analyze completed via systematic-debugging (root-cause hypothesis + evidence)
- [ ] failing test added reproducing bug
- [ ] minimal fix implemented
- [ ] full suite executed and passing
- [ ] resolution file created: docs/agent-files/bugs/{bug_id}/{bug_id}-resolution.md
- [ ] resolution committed separately from discovery
- [ ] fix-bug-complete report posted with shas + test evidence
- [ ] PR opened via execute-plan-finish (Bug section auto-detected from branch name)
