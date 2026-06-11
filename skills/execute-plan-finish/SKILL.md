---
name: execute-plan-finish
description: Internal sub-skill invoked by execute-plan (Step 3) and fix-bug-complete (PR enforcement) only. Verifies tests, pushes feature branch, opens PR. Do not invoke directly — use dev-tools:execute-plan or dev-tools:fix-bug.
user-invocable: false
disable-model-invocation: true
---

# Execute Plan — Finish

<INTERNAL-SUB-SKILL>
Invoked by `dev-tools:execute-plan` at Step 3 (finish) and by `dev-tools:fix-bug-complete` after completion gates pass (PR enforcement). Users should use **execute-plan** or **fix-bug**, not this skill directly.
</INTERNAL-SUB-SKILL>

## Overview

Complete development work by verifying tests, pushing the feature branch, and **creating a pull request**. Integration happens through review and merge on the host (GitHub, etc.) — not by merging locally into main.

**Core principle:** Verify tests → Push branch → Create PR → Report PR URL.

**Announce at start:** "I'm using execute-plan-finish (via execute-plan) to open a pull request."

<HARD-GATE>
When implementation is complete and tests pass, you MUST push the feature branch and create a pull request with `gh pr create`. Do NOT merge into `main`/`master` locally. Do NOT leave work on a branch without opening a PR unless your human partner explicitly overrides this in CLAUDE.md, GEMINI.md, or AGENTS.md (same precedence as TDD opt-outs in using-dev-tools).
</HARD-GATE>

## The Process

### Step 1: Verify Tests

**Before pushing or opening a PR, verify tests pass:**

```bash
# Run project's test suite
npm test / cargo test / pytest / go test ./...
```

**If tests fail:**
```
Tests failing (<N> failures). Must fix before completing:

[Show failures]

Cannot open a PR until tests pass.
```

Stop. Don't proceed to Step 2.

**If tests pass:** Continue to Step 1.5.

### Step 1.5: Detect Environment

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Path A — Externally managed worktree + detached HEAD** (`GIT_DIR != GIT_COMMON` and `BRANCH` empty):

1. Stage and commit all work (`git add` + `git commit`)
2. Present handoff (do not run push/PR from here):

```
Implementation complete. All tests passing.
Current HEAD: <full-commit-sha>

This workspace is externally managed (detached HEAD).
I cannot create branches, push, or open PRs from this environment.

If your host provides "Create branch" or "Hand off to local", use those next.

Suggested branch name: <ticket-or-slug>
Suggested PR title: <title>
Suggested PR body: <use Step 4 template>
```

3. **STOP** — skip Steps 2–5 (no worktree remove for externally managed workspaces)

**Path B — Externally managed + named branch, or Path C — normal repo:** Continue to Step 2.

### Step 2: Verify Feature Branch

```bash
git branch --show-current
```

**If on `main` or `master`:** STOP. You should not have implemented on the base branch. Report the error to your human partner — implementation should have run in the worktree created by `using-git-worktrees`.

**If on a feature branch:** Continue to Step 3.

### Step 3: Determine Base Branch

```bash
# Try common base branches
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

Default target for the PR: `main`, or `master` if that is the repo default. If unclear, ask once: "PR base branch: main — correct?"

### Step 4: Push and Create Pull Request

```bash
# Push branch
git push -u origin <feature-branch>

# Create PR (required)
gh pr create --base <base-branch> --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed>

## Bug *(include only if detection below finds a matching bug — omit otherwise)*
`docs/agent-files/bugs/{bug_id}/{bug_id}-detail.md`

## Test Plan
- [ ] <verification steps>
EOF
)"
```

When a spec or plan exists for this work, also include a `**Spec:** <path>` line in the Summary section — **merge-pr** reads it for the acceptance-criteria regression check.

**Bug section detection (before calling `gh pr create`):** check whether this branch closes a documented bug — the branch name is the shared key, no parameter passing required:

1. Get the current branch: `git branch --show-current`
2. Extract the slug: strip any leading `fix/`, `bugfix/`, or `bug/` prefix; the remainder is the slug
3. Check for `docs/agent-files/bugs/{slug}/` (or legacy `docs/bugs/{slug}/`)
4. If the directory exists: include the Bug section with the path `docs/agent-files/bugs/{slug}/{slug}-detail.md`
5. If not: omit the Bug section entirely

**After `gh pr create` succeeds:** Report the PR URL to your human partner. Do not merge the PR yourself unless they explicitly ask — when they're ready after review, **dev-tools:merge-pr** runs regression checks, merges, and cleans up the worktree.

### Step 5: Worktree Cleanup

Re-run `GIT_DIR` vs `GIT_COMMON` detection. **If `GIT_DIR != GIT_COMMON`**, skip `git worktree remove` — the host owns this workspace.

**Do NOT remove the worktree after creating the PR** — your human partner may need it for review follow-ups.

Only remove the worktree when `GIT_DIR == GIT_COMMON` and they explicitly confirm the PR is merged:

```bash
git worktree list | grep $(git branch --show-current)
# If yes and partner confirmed merge:
git worktree remove <worktree-path>
```

## Sandbox / Push Blocked

If the environment blocks `git push` or `gh` (detached HEAD, sandbox, no network):

1. Commit all work on the feature branch
2. Output for your human partner to copy:
   - Branch name
   - Suggested `git push -u origin <branch>`
   - Full PR title and body (same template as Step 4)
3. State clearly: "Could not open PR from this environment — push and run `gh pr create` locally, or use the host UI."

This is a **blocked PR**, not permission to skip the PR workflow.

## Abandoning Work (Only When Asked)

If your human partner **explicitly** asks to discard the branch and worktree (not a menu — they must request it):

```
This will permanently delete:
- Branch <name>
- All commits: <commit-list>
- Worktree at <path>

Type 'discard' to confirm.
```

Wait for exact confirmation `discard`, then:

```bash
git checkout <base-branch>
git branch -D <feature-branch>
git worktree remove <worktree-path>  # if applicable
```

## Common Mistakes

**Skipping test verification**
- **Problem:** Open a failing PR
- **Fix:** Always verify tests before push

**Merging locally into main**
- **Problem:** Bypasses review; pollutes base branch
- **Fix:** PR only — merge happens on the host after review

**"I'll push later"**
- **Problem:** Work stalls without reviewable artifact
- **Fix:** Push and `gh pr create` in this skill, every time

**Removing worktree immediately after PR**
- **Problem:** Partner can't iterate on review feedback in place
- **Fix:** Keep worktree until they confirm merge

## Red Flags

**Never:**
- Proceed with failing tests
- Merge feature branch into `main`/`master` locally without explicit user request
- End a feature without a PR (or blocked-PR handoff with full PR text)
- Force-push without explicit request
- Delete work without typed `discard` confirmation

**Always:**
- Verify tests before push
- Push and create PR with `gh pr create`
- Report PR URL (or blocked-PR handoff with branch + body)
- Stay on feature branch until PR is merged on the host

## Integration

**Invoked by:**
- **dev-tools:execute-plan** — Step 3 after run completes
- **dev-tools:fix-bug-complete** — PR enforcement after all completion gates pass

**Pairs with:**
- **using-git-worktrees** — Feature branch and worktree created before the plan; keep worktree through PR review
- **dev-tools:merge-pr** — after review: regression checks, merge, worktree cleanup
