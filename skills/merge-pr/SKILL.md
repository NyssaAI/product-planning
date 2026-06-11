---
name: merge-pr
description: Use after a pull request has been reviewed and approved on GitHub. Performs a two-layer regression check (feature reversion + spec acceptance criteria) then merges and cleans up the worktree. Single canonical entrypoint for all PR merge work.
---

# Merge PR

Merge a reviewed pull request with regression safety checks.

**Announce at start:** "I'm using the merge-pr skill to check for regressions and merge."

## Purpose

One canonical merge lifecycle:

1. **Resolve PR** — identify which PR to merge
2. **Gather context** — PR diff, spec file, feature inventory
3. **Check (a)** — feature reversion via git history + `docs/features.md`
4. **Check (b)** — spec acceptance criteria consistency
5. **Report and confirm** — show findings, get your human partner's confirmation
6. **Merge** — squash merge and delete the remote branch
7. **Cleanup** — remove local worktree and branch

## Hard policy

- Do not merge without running both regression checks first.
- Do not merge a BLOCKING verdict without an explicit override from your human partner with a stated reason.
- Do not skip the confirmation step regardless of verdict.
- Do not `git push --force` or rewrite history.

## Step 1: Resolve the PR

Accept an optional PR number or URL as argument. If none provided:

```bash
gh pr list --head "$(git branch --show-current)"
```

- One PR found → proceed with it.
- Multiple PRs found → list them and ask which one.
- Zero PRs found → report that no open PR exists for this branch and stop.
- PR state is not `OPEN` (or review state not `APPROVED`) → warn and ask whether to proceed.

## Step 2: Gather context

Gather all three inputs before any analysis:

**PR diff and metadata:**

```bash
gh pr view <PR>     # title, description, body, state
gh pr diff <PR>     # full unified diff
```

**Spec file** — resolved in this order:

1. The PR description's `**Spec:** <path>` line (written by execute-plan-finish)
2. A plan file under `docs/agent-files/plans/` (or legacy `docs/plans/`) whose name matches the branch slug — read its `**Spec:**` header
3. Ask your human partner for the spec path
4. No spec exists (ad-hoc work) → skip check (b) and note it in the report

**Feature inventory:** read `docs/features.md` if present. If absent → skip check (a) and note it in the report.

## Step 3: Check (a) — Feature reversion

1. Read `docs/features.md`. Collect features with status `active` or `complete` — the **protected set**.
2. Scan the diff for deleted files and large deletion blocks (20+ consecutive `-` lines in a single file):
   ```bash
   gh pr diff <PR> --name-only          # full file list
   git diff <base>...<head> --diff-filter=D --name-only   # deletions (when branch is local)
   ```
3. For each deletion, retrieve its history on the base branch:
   ```bash
   git log --oneline main -- <path>
   ```
4. Cross-reference: a commit message for a deleted path that references a protected feature name → flag as **potential reversion** (feature name, file path, matching commit).
5. Secondary heuristic: a deleted path or filename containing a keyword from the protected feature names (e.g. `auth.ts` for "Authentication") → flag as **advisory**.

## Step 4: Check (b) — Spec acceptance criteria

1. Read the spec file. Extract the checkbox list under `## Acceptance criteria` or `## Success criteria`.
2. For each criterion, check whether the diff **removes** code that previously satisfied it. Deleted lines matching the criterion's intent → flag as **potential regression**.
3. For each criterion, check whether the diff **adds** code consistent with implementing it. Criteria with no corresponding additions → flag as **unimplemented** (distinct severity — not a regression).

## Step 5: Report and confirm

Present the regression check report in exactly this format:

```
## Regression check

### (a) Feature reversion
✓ No protected features appear deleted.
  — or —
⚠ Potential reversion: "Authentication" (active)
  Deleted: src/auth/jwt.ts  ← "feat: add JWT signing" (a3f91b2)

### (b) Spec acceptance criteria
✓ 3/4 criteria have corresponding additions.
⚠ Unimplemented: "Invalid credentials return 401"
  No diff additions match this criterion.

### Verdict
SAFE TO MERGE — no confirmed regressions. 1 advisory warning above.
  — or —
REVIEW REQUIRED — potential reversion flagged. Confirm to proceed.
  — or —
BLOCKING — confirmed regression. Explicit confirmation required to override.
```

**Verdicts:**

| Verdict | Condition | Required confirmation |
|---------|-----------|----------------------|
| **SAFE TO MERGE** | No findings, or only unimplemented-criterion notes | Confirm merge |
| **REVIEW REQUIRED** | Advisory findings only | Acknowledge findings, then confirm |
| **BLOCKING** | Confirmed deletion of protected feature code | Explicit override with a stated reason |

**Never merge without confirmation from your human partner, regardless of verdict.**

## Step 6: Merge execution

After confirmation, read `"mergeStrategy"` from `ai-plan.config.json` if present (`"squash" | "merge" | "rebase"`). Default: `squash` (keeps `main` history linear).

Announce the strategy before executing: "Merging PR #42 with squash strategy."

```bash
gh pr merge <PR> --squash --delete-branch
```

(Replace `--squash` with `--merge` or `--rebase` per `mergeStrategy`.)

`--delete-branch` removes the remote branch after merge. If the merge fails (conflicts, failing checks, unresolved review requests): report the `gh` error verbatim and stop — no retry logic.

## Step 7: Worktree cleanup

After a successful merge:

1. Resolve the worktree path — match `git worktree list` output against the merged branch name.
2. Remove it: `git worktree remove <worktree-path>`. If the worktree no longer exists (removed manually), silently skip.
3. Delete the local branch: `git branch -d <local-branch>` (run from outside the removed worktree, e.g. the main checkout).

## Final output

```
✓ PR #42 merged (squash) into main.
✓ Remote branch deleted.
✓ Worktree removed: .worktrees/feature-auth
✓ Local branch deleted: feature/auth
```

Report any skipped steps (e.g. "worktree already removed", "check (b) skipped — no spec").

## Common Mistakes

**Merging on a green verdict without confirmation**
- **Problem:** The verdict is advisory; the merge decision belongs to your human partner
- **Fix:** Always present the report and wait for confirmation

**Treating unimplemented criteria as regressions**
- **Problem:** Blocks merges over scope decisions already made during review
- **Fix:** Unimplemented is a note, not a blocker — distinct severity from deletion of working code

**Deleting the worktree before the merge succeeds**
- **Problem:** A failed merge leaves no workspace to fix conflicts in
- **Fix:** Cleanup only runs after `gh pr merge` succeeds

## Integration

- **dev-tools:execute-plan-finish** — creates the PR this skill later merges (writes the `**Spec:**` line and Bug section it reads)
- **dev-tools:fix-bug-complete** — invokes execute-plan-finish for bug-fix PRs
- **dev-tools:using-git-worktrees** — created the worktree this skill cleans up
