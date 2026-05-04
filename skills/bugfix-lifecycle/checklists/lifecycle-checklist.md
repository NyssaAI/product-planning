# bugfix lifecycle checklist

- [ ] bug_id exists OR bug-workflow completed
- [ ] detail file exists: docs/bugs/{bug_id}/{bug_id}-detail.md
- [ ] root cause investigated (systematic-debugging phase 1 complete)
- [ ] root-cause hypothesis written with evidence
- [ ] failing test added reproducing bug
- [ ] minimal fix implemented
- [ ] full suite executed and passing
- [ ] resolution file created: docs/bugs/{bug_id}/{bug_id}-resolution.md
- [ ] resolution committed separately from discovery
- [ ] completion report posted with shas + test evidence
