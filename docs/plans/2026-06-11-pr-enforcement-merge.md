# PR Enforcement and Merge-PR Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use **dev-tools:execute-plan** to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend PR enforcement to the `fix-bug` workflow (currently only in `execute-plan-finish`) and add a new `merge-pr` skill that performs a two-layer regression check before merging any PR. The merge step also handles worktree cleanup that `execute-plan-finish` previously deferred to the user.

**Architecture:** `fix-bug-complete` gains a final step that invokes `execute-plan-finish`. `execute-plan-finish` gains branch-name-as-key bug section detection. New `merge-pr` skill with PR input resolution, two regression checks (feature reversion + spec acceptance criteria), merge execution, and worktree cleanup.

**Planning module:** `docs/ai-plan/modules/main.md`

**Spec:** `docs/specs/2026-06-11-pr-enforcement-and-merge-skill-design.md`

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `skills/fix-bug-complete/SKILL.md` | Bug fix completion | Add execute-plan-finish invocation after gates pass |
| `skills/execute-plan-finish/SKILL.md` | PR creation | Add Bug section auto-detection in Step 4 |
| `skills/merge-pr/SKILL.md` | New: PR merge with regression check | Create new skill |

---

### Task 1: Add `execute-plan-finish` invocation to `fix-bug-complete`

**Files:**
- Modify: `skills/fix-bug-complete/SKILL.md`

`fix-bug-complete` currently ends after validating completion gates and printing the output report. Add a final step that invokes `execute-plan-finish` to push the branch and open a PR.

- [ ] **Step 1: Read fix-bug-complete/SKILL.md in full**

Read `skills/fix-bug-complete/SKILL.md` (54 lines). Note the Completion gates section (lines 16–28), the Output contract section (lines 30–44), and the Integration section (lines 50–54).

- [ ] **Step 2: Add the execute-plan-finish invocation step**

Append a new `## PR enforcement` section after the Integration section (after line 54):

```markdown
## PR enforcement

After all completion gates pass and the output report is printed:

**REQUIRED SUB-SKILL:** Invoke `dev-tools:execute-plan-finish` to push the branch and open a pull request.

> "Fix validated. Invoking **execute-plan-finish** to push the branch and open a pull request."

`execute-plan-finish` handles: environment detection, feature branch verification, base branch detection, `gh pr create`, and worktree cleanup prompt. Do not duplicate any of these steps here.

**Prerequisite:** All completion gates above must be true before invoking `execute-plan-finish`. If any gate fails, stop at the gate — do not proceed to PR creation.
```

- [ ] **Step 3: Update the Integration section to list execute-plan-finish**

In the Integration section (lines 50–54), add `execute-plan-finish` to the list:

```markdown
## Integration

- **dev-tools:fix-bug** — parent orchestrator
- **dev-tools:fix-bug-log** / **systematic-debugging** (Step 2) / **fix-bug-resolve** — upstream steps
- **dev-tools:execute-plan-finish** — invoked after all gates pass (Step 5 — PR enforcement)
```

- [ ] **Step 4: Verify the change is coherent**

Read the full updated file. Confirm:
- The PR enforcement section appears after Integration
- The gate prerequisite is explicit — gates must pass before `execute-plan-finish` fires
- No duplication of steps that `execute-plan-finish` already owns (push, base branch detection, etc.)

- [ ] **Step 5: Commit**

```bash
git add skills/fix-bug-complete/SKILL.md
git commit -m "feat(fix-bug-complete): add execute-plan-finish invocation for PR enforcement

Bug fix workflow now ends with a pull request, matching the enforcement
already in place for execute-plan. All completion gates must pass before
PR creation fires."
```

---

### Task 2: Add Bug section detection to `execute-plan-finish`

**Files:**
- Modify: `skills/execute-plan-finish/SKILL.md`

The standard PR body template (Summary + Test Plan) gains a **Bug** section for bug-fix PRs. `execute-plan-finish` auto-detects the bug via branch-name-as-key lookup.

- [ ] **Step 1: Read execute-plan-finish/SKILL.md**

Read `skills/execute-plan-finish/SKILL.md` in full (207 lines). Locate Step 4 (Push and Create Pull Request, lines 100–114) — specifically the `gh pr create` body template.

- [ ] **Step 2: Update the PR body template in Step 4**

Replace the current PR body template:

```markdown
## Summary
<2-3 bullets of what changed>

## Test Plan
- [ ] <verification steps>
```

With:

```markdown
## Summary
<2-3 bullets of what changed>

## Bug *(include only if this PR closes a bug — see detection below)*
`docs/agent-files/bugs/{bug_id}/{bug_id}-detail.md`

## Test Plan
- [ ] <verification steps>
```

Add a detection instruction directly below the template:

```markdown
**Bug section detection (Step 4 only):** Before calling `gh pr create`, check whether a bug detail file exists whose slug matches the current branch name:

1. Get current branch: `git branch --show-current`
2. Extract the slug: strip any leading `fix/`, `bugfix/`, or `bug/` prefix. The remainder is the slug.
3. Check for `docs/agent-files/bugs/{slug}/` (or legacy `docs/bugs/{slug}/`). If the directory exists, include the Bug section in the PR body with the path `docs/agent-files/bugs/{slug}/{slug}-detail.md`.
4. If the directory does not exist, omit the Bug section entirely.

No parameter passing is required — the branch name is the shared key between the bug lifecycle and the PR.
```

- [ ] **Step 3: Verify the template is coherent**

Read the updated Step 4. Confirm:
- The Bug section is marked as conditional (include only if detected)
- The detection logic is unambiguous (strip prefix → check directory)
- The legacy `docs/bugs/` fallback is present (for repos not yet on the new layout)
- The rest of the template (Summary, Test Plan) is unchanged

- [ ] **Step 4: Commit**

```bash
git add skills/execute-plan-finish/SKILL.md
git commit -m "feat(execute-plan-finish): add Bug section auto-detection to PR body

Bug-fix PRs now include a ## Bug section linking to the detail file.
Detection uses branch-name-as-key: slug from current branch matched against
docs/agent-files/bugs/{slug}/ directory. No parameter passing required."
```

---

### Task 3: Create the `merge-pr` skill

**Files:**
- Create: `skills/merge-pr/SKILL.md`

New user-facing skill for merging a PR after review. Two-layer regression check (feature reversion + spec acceptance criteria) before merge execution. Handles worktree cleanup after successful merge.

- [ ] **Step 1: Check that skills/merge-pr/ does not exist**

```bash
ls skills/merge-pr/ 2>$null
```

Confirm the directory does not exist before creating.

- [ ] **Step 2: Create the skill directory and SKILL.md**

Create `skills/merge-pr/SKILL.md`:

```markdown
---
name: merge-pr
description: Use after a pull request has been reviewed and approved on GitHub. Performs a two-layer regression check (feature reversion + spec acceptance criteria) then merges. Single canonical entrypoint for all PR merge work.
---

# Merge PR

Merge a reviewed pull request with regression safety checks.

**Announce at start:** "I'm using the merge-pr skill to check for regressions and merge."

## Purpose

One canonical merge lifecycle:

1. **Resolve PR** — identify which PR to merge
2. **Gather context** — PR diff, spec file, feature inventory
3. **Check (a)** — feature reversion via git history + features.md
4. **Check (b)** — spec acceptance criteria consistency
5. **Report and confirm** — show findings, get user confirmation
6. **Merge** — squash merge and delete remote branch
7. **Cleanup** — remove local worktree and branch

## Hard policy

- Do not merge without running both regression checks first.
- Do not merge if verdict is BLOCKING without explicit user override and stated reason.
- Do not skip the user confirmation step regardless of verdict.
- Do not run `git push --force` or amend history.

---

## Step 1: Resolve the PR

Accept an optional PR number or URL as argument. If none provided:

```bash
gh pr list --head $(git branch --show-current)
```

- If one PR is found: proceed with it.
- If multiple PRs are found: list them and ask the user to select one.
- If zero PRs are found: report that no open PR exists for this branch and stop.
- If the PR state is not `OPEN` or `APPROVED`: warn and ask whether to proceed.

---

## Step 2: Gather context

Run all three before any analysis:

**PR diff and metadata:**
```bash
gh pr view <PR>     # title, description, body, status
gh pr diff <PR>     # full unified diff
```

**Spec file:** Extracted from the PR description — `execute-plan-finish` writes `**Spec:** <path>` into every PR body. If not found:
1. Search `docs/agent-files/plans/` (or legacy `docs/plans/`) for a plan file whose name matches the branch slug
2. Read its `**Spec:**` header line
3. If still not found: ask the user for the spec path
4. If the user has no spec (ad-hoc work): skip check (b) and note it in the report

**Feature inventory:** Read `docs/features.md` if present. If absent: skip check (a) and note it in the report.

---

## Step 3: Check (a) — Feature reversion

1. Read `docs/features.md`. Collect features with status `active` or `complete` — the protected set.
2. Scan the diff for deleted files (`--diff-filter=D`) and large deletion blocks (20+ consecutive `-` lines in a single file).
3. For each deletion, run:
   ```bash
   git log --oneline main -- <path>
   ```
4. Cross-reference: if any commit message for a deleted path references a name from the protected feature set, flag as a potential reversion.
5. Secondary heuristic: if a deleted path or filename contains a keyword from the features list (e.g. `auth.ts` for feature "Authentication"), flag as advisory.

---

## Step 4: Check (b) — Spec acceptance criteria

1. Read the spec file. Extract the acceptance criteria (checkbox list under `## Acceptance criteria` or `## Success criteria`).
2. For each criterion: check whether the diff *removes* code that would have previously satisfied it. Deleted lines matching criterion intent → flag as potential regression.
3. For each criterion: check whether the diff *adds* code consistent with implementing it. Criteria with no corresponding additions → flag as unimplemented (not regressed — distinct severity).

---

## Step 5: Report and confirm

Present the regression check report in this format:

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
- **SAFE TO MERGE** — no findings or only unimplemented-criterion notes. Ask user to confirm merge.
- **REVIEW REQUIRED** — advisory findings only. Show findings and ask user to acknowledge before proceeding.
- **BLOCKING** — confirmed deletion of protected feature code. Require explicit user override with stated reason before proceeding.

**Do not merge without user confirmation regardless of verdict.**

---

## Step 6: Merge execution

After user confirmation:

Read `mergeStrategy` from `ai-plan.config.json` if present. Default: `squash`.

```bash
gh pr merge <PR> --squash --delete-branch
```

(Replace `--squash` with `--merge` or `--rebase` per `mergeStrategy`.)

Announce the strategy before executing: "Merging PR #42 with squash strategy."

If merge fails (conflicts, failing checks, unresolved reviews): report the `gh` error verbatim and stop. Do not retry.

---

## Step 7: Worktree cleanup

After successful merge:

1. Resolve worktree path:
   ```bash
   git worktree list
   ```
   Match against the merged branch name.

2. Remove worktree:
   ```bash
   git worktree remove <worktree-path>
   ```
   If the worktree no longer exists (removed manually): silently skip.

3. Delete local branch:
   ```bash
   git branch -d <local-branch>
   ```

---

## Final output

```
✓ PR #42 merged (squash) into main.
✓ Remote branch deleted.
✓ Worktree removed: .worktrees/feature-auth
✓ Local branch deleted: feature/auth
```

---

## Integration

- **dev-tools:execute-plan-finish** — creates the PR that this skill later merges
- **dev-tools:fix-bug-complete** — invokes execute-plan-finish for bug-fix PRs
- **dev-tools:using-git-worktrees** — created the worktree that this skill cleans up
```

- [ ] **Step 3: Verify the skill is self-contained**

Read the created file. Confirm:
- All 7 steps are present with exact bash commands
- The regression check report format matches the spec (Section 3.3) exactly
- BLOCKING verdict requires explicit user override with reason
- `mergeStrategy` config key is documented
- Worktree cleanup handles the "no longer exists" case gracefully
- No references to internal sub-skills (this is a user-facing skill with no sub-skill delegation)

- [ ] **Step 4: Commit**

```bash
git add skills/merge-pr/SKILL.md
git commit -m "feat(merge-pr): add new merge-pr skill with regression checks

Merge workflow: PR resolution → context gathering → feature reversion check
(git history + features.md) → spec acceptance criteria check → user confirmation
→ squash merge → worktree cleanup. Three verdicts: SAFE/REVIEW REQUIRED/BLOCKING."
```

---

### Task 4: Final verification

**Files:**
- Read: all changed files for coherence check

- [ ] **Step 1: Read all three changed/created files**

Read each in full:
- `skills/fix-bug-complete/SKILL.md`
- `skills/execute-plan-finish/SKILL.md` (Step 4 section)
- `skills/merge-pr/SKILL.md`

Confirm each is internally coherent and cross-references are correct.

- [ ] **Step 2: Trace the complete bug lifecycle**

Walk through the full flow mentally:

1. User runs `dev-tools:fix-bug`
2. `fix-bug-log` → creates `docs/agent-files/bugs/{bug_id}/`
3. `systematic-debugging` → root cause found
4. `fix-bug-resolve` → fix committed, tests pass
5. `fix-bug-complete` → gates verified, output report printed
6. `fix-bug-complete` → invokes `execute-plan-finish`
7. `execute-plan-finish` → detects bug dir from branch name → adds Bug section to PR body → `gh pr create`
8. User reviews PR on GitHub
9. User runs `dev-tools:merge-pr`
10. `merge-pr` → resolves PR → checks feature reversion + spec criteria → user confirms → squash merge → worktree cleanup

Confirm each hand-off has no gap (no step where a required artifact might not exist).

- [ ] **Step 3: Verify naming conventions**

```bash
ls skills/ | sort
```

Confirm `merge-pr` follows the verb-noun convention used by `fix-bug`, `add-backlog`, `plan-product`, `design-spec`.

- [ ] **Step 4: Check for any references to old bug paths that need updating**

The spec uses `docs/agent-files/bugs/` (new layout) in the Bug section detection. If the directory reorganization feature branch has not landed yet, the current `fix-bug-complete` and related files still use `docs/bugs/`. The `execute-plan-finish` detection logic (Task 2) already includes the legacy fallback. Confirm the fallback is present in the written text.

- [ ] **Step 5: Verify git log**

```bash
git log --oneline
```

Should show 4 commits (one per task 1-3, plus this verification commit if any cleanup needed).

- [ ] **Step 6: Commit any cleanup**

```bash
git add -p
git commit -m "fix(pr-enforcement-merge): final cleanup

Addresses any coherence issues found during lifecycle trace."
```
