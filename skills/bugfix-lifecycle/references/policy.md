# one-way-in bug policy

this repository uses a single user-facing entrypoint for bug handling: `bugfix-lifecycle`.

allowed flow
1) discovery via bug-workflow semantics
2) root-cause-first diagnostics via systematic-debugging
3) fix loop via bugfix semantics
4) separate resolution commit

disallowed flow
- direct ad-hoc fixes without bug_id
- skipping root-cause investigation
- combining discovery+resolution in one commit
