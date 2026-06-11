# PR Enforcement and Merge-PR Skill

**Date:** 2026-06-11
**Status:** Approved
**Target repo:** `jamaynor/dev-tools` plugin

## Summary

Extend PR enforcement to the `fix-bug` workflow (currently only enforced in `execute-plan-finish`) and add a new `merge-pr` skill that performs a two-layer regression check — git history + feature inventory and spec acceptance criteria — before merging any PR. The merge step also handles worktree cleanup that `execute-plan-finish` previously deferred to the user.

## Scope

**In scope:**
- Add `execute-plan-finish` invocation to `fix-bug-complete` after fix validation passes
- Add a **Bug** section to the PR body template used for bug-fix PRs (links to bug detail file)
- New `merge-pr` skill: PR input resolution, regression check (a) and (b), merge execution, worktree cleanup

**Out of scope:**
- Changing the PR enforcement in `execute-plan-finish` (already correct)
- Automated regression testing (the check is AI-assisted analysis of the diff, not test execution)
- Git history rewrites or force-push handling
- PR review assignment, labels, or GitHub Actions integration

---

## Section 1: PR Enforcement in `fix-bug-complete`

### 1.1 Insertion point

`fix-bug-complete` currently ends after validating that the bug detail file, resolution file, and tests are all in order. A new final step invokes `execute-plan-finish`:

> "Fix validated. Invoking **execute-plan-finish** to push the branch and open a pull request."

`execute-plan-finish` handles: environment detection (Step 1.5), feature branch verification (Step 2), base branch detection (Step 3), push and `gh pr create` (Step 4), and worktree cleanup prompt (Step 5). No duplication.

### 1.2 Bug-fix PR body addition

The standard PR body template (Summary + Test Plan) gains a **Bug** section for bug-fix PRs:

```markdown
## Summary
<1-3 bullets>

## Bug
`docs/agent-files/bugs/{bug_id}/{bug_id}-detail.md`

## Test plan
[Checklist]
```

`execute-plan-finish` detects the Bug section automatically: at Step 4 (PR creation), it checks whether a bug detail file exists under `docs/agent-files/bugs/` whose slug matches the current branch name (e.g. branch `fix/2026.06.11-143000-null-pointer` → `docs/agent-files/bugs/2026.06.11-143000-null-pointer/`). If found, it adds the Bug section to the PR body. No parameter passing required — the branch name is the shared key.

---

## Section 2: `merge-pr` Skill — Invocation and Inputs

### 2.1 Naming and invocation

Skill name: `merge-pr` (consistent with `fix-bug`, `add-backlog`, `plan-product` verb-noun convention). Invoked manually by the user after a PR has been reviewed on GitHub. Not auto-started by any other skill.

### 2.2 PR resolution

Accepts an optional PR number or URL as argument. If none provided, runs:

```bash
gh pr list --head $(git branch --show-current)
```

If multiple PRs are found, lists them and asks the user to select one. If the PR is not in `OPEN` or `APPROVED` state, warns and asks whether to proceed.

### 2.3 Context gathering

Three inputs are gathered before any analysis:

**PR diff and metadata:**
```bash
gh pr view <PR>       # title, description, status
gh pr diff <PR>       # full unified diff
```

**Spec file:** Extracted from the PR description body — `execute-plan-finish` writes `**Spec:** <path>` into every PR body. If not found in the PR description, the skill searches `docs/agent-files/plans/` for a plan file whose name matches the branch name and reads its `**Spec:**` header. If neither is found, asks the user for the spec path. If the user has no spec (ad-hoc work), check (b) is skipped and noted in the report.

**Feature inventory:** Reads `docs/features.md` if present. If absent, check (a) is skipped and noted in the report.

---

## Section 3: Regression Check Logic

Two checks run sequentially. Both produce findings. Neither automatically aborts — the final merge decision always requires user confirmation or acknowledgement.

### 3.1 Check (a): Feature reversion via git history + features.md

1. Read `docs/features.md` and collect features with status `active` or `complete` — the protected set.
2. Scan the diff for deleted files (`--diff-filter=D`) and large deletion blocks (20+ consecutive `-` lines in a single file).
3. For each deletion, run `git log --oneline main -- <path>` to retrieve commit history on `main`.
4. Cross-reference: if any commit message for a deleted path references a name from the protected feature set, flag as a potential reversion with feature name, file path, and matching commit.
5. Secondary heuristic: if a deleted path or filename contains a keyword from the features list (e.g. `auth.ts` for feature "Authentication"), flag as advisory.

### 3.2 Check (b): Spec acceptance criteria consistency

1. Read the spec file. Extract the acceptance criteria (checkbox list under `## Acceptance criteria` or `## Success criteria`).
2. For each criterion: check whether the diff *removes* code that would have previously satisfied it. Deleted lines matching criterion intent are flagged as potential regressions.
3. For each criterion: check whether the diff *adds* code consistent with implementing it. Criteria with no corresponding additions are flagged as unimplemented (not regressed — distinct severity).

### 3.3 Report format

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

Verdicts:
- **SAFE TO MERGE** — no findings or only unimplemented-criterion notes
- **REVIEW REQUIRED** — advisory findings only; user acknowledges and confirms
- **BLOCKING** — confirmed deletion of protected feature code; requires explicit user override with stated reason

---

## Section 4: Merge Execution and Worktree Cleanup

### 4.1 Merge strategy

Configurable via `"mergeStrategy": "squash" | "merge" | "rebase"` in `ai-plan.config.json`. Default: `squash` (keeps `main` history linear). The skill announces the strategy before executing.

### 4.2 Merge execution

```bash
gh pr merge <PR> --squash --delete-branch
```

`--delete-branch` removes the remote branch immediately after merge. If merge fails (conflicts, failing checks, unresolved review requests), the skill reports the `gh` error verbatim and stops — no retry logic.

### 4.3 Worktree cleanup

After successful merge:

```bash
git worktree remove <worktree-path>
git branch -d <local-branch>
```

Worktree path resolved from `git worktree list` matched against the merged branch name. If the worktree no longer exists (removed manually), silently skipped.

### 4.4 Final output

```
✓ PR #42 merged (squash) into main.
✓ Remote branch deleted.
✓ Worktree removed: .worktrees/feature-auth
✓ Local branch deleted: feature/auth
```

---

## Module scope

**Primary module:** `main` (`docs/agent-files/context/modules/main.md`)

**Affected modules:** none (single-module plugin repo)

---

## Standards Applied

| Standard | Key constraint for this design |
|----------|-------------------------------|
| `design-patterns` | `merge-pr` is a single-responsibility skill — regression check and merge execution are distinct steps, not interleaved |
| `testing-principles` | Regression check logic unit-testable against fixture diffs and features.md snapshots; merge execution not unit-tested (requires live GitHub) |
| `bug-workflow` | `fix-bug-complete` must reach a passing-tests state before PR enforcement fires — tests-first rule unchanged |
