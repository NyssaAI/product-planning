# fix-bug checklist

- [ ] bug_id exists OR fix-bug-log completed
- [ ] detail file exists: docs/agent-files/bugs/{bug_id}/{bug_id}-detail.md
- [ ] analyze completed via systematic-debugging (root-cause hypothesis + evidence)
- [ ] route classified: simple one-file bug OR complex bug requiring design
- [ ] simple route only: all simple-bug criteria satisfied
- [ ] simple route only: failing test added reproducing bug
- [ ] simple route only: minimal fix implemented
- [ ] complex route only: design-spec invoked with bug detail file as input
- [ ] complex route only: execute-plan handles implementation
- [ ] full suite executed and passing
- [ ] resolution file created: docs/agent-files/bugs/{bug_id}/{bug_id}-resolution.md
- [ ] resolution committed separately from discovery
- [ ] simple route only: fix-bug-complete report posted with shas + test evidence
- [ ] simple route only: PR opened via execute-plan-finish (Bug section auto-detected from branch name)
- [ ] complex route only: PR opened via execute-plan
