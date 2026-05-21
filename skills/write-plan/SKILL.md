---
name: write-plan
description: Internal sub-skill invoked by design-spec only. Writes implementation plans from an approved spec. Do not invoke directly — use dev-tools:design-spec.
user-invocable: false
disable-model-invocation: true
---

# Write Plan

<INTERNAL-SUB-SKILL>
Invoked by `dev-tools:design-spec` after worktree setup (Step 11). Users should use **design-spec**, not this skill directly.
</INTERNAL-SUB-SKILL>

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using write-plan (via design-spec) to create the implementation plan."

<HARD-GATE>
Do NOT write or save an implementation plan until you are in an isolated worktree on a feature branch. If you are on `main` or `master`, STOP and invoke `dev-tools:using-git-worktrees` first. Parent **design-spec** requires this before handing off to this skill.
</HARD-GATE>

**Prerequisites (verify before writing):**
- `dev-tools:using-git-worktrees` completed in this session (or you are already in that feature worktree)
- Current branch is a feature branch — not `main` or `master`
- Know the branch name and worktree path for the plan header
- **AI Plan (when repo has source code):** invoke `dev-tools:using-ai-plan` — regenerate `docs/ai-plan/` if stale, then load **one** L1 scope file for the target module

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`
- (User preferences for plan location override this default)

## AI Plan Context (code & module graph)

When the project has source code and `docs/product.md` / `docs/roadmap.md` / `docs/tech-stack.md` exist:

1. **REQUIRED SUB-SKILL:** `dev-tools:using-ai-plan`
2. If `docs/ai-plan/INDEX.md` is missing or scopes are outdated, run generate in the **project repo** (see using-ai-plan) before writing tasks
3. Read `docs/ai-plan/INDEX.md` — pick **one** module matching the spec's **Primary module** (from design-spec's Module scope section) or the spec / roadmap item if no module scope section
4. Read **only** `docs/ai-plan/scopes/<module-id>.md` (L1) — the module's architectural picture: boundaries, `dependsOn` / `usedBy`, routes, test roots, entry points. Use this for file paths and task order; it complements the feature **spec**, it does not replace it
5. Order tasks respecting module dependencies (leaves or dependency-safe order per MODULE_MAP edges)
6. Do **not** load `BRIEF.md` (duplicate of product/roadmap/tech-stack), full `CODE_MAP.json`, or other scope files during planning

If no ai-plan artifacts exist and the repo is greenfield with no code yet, skip this section.

## Development Standards (bundled)

1. Read the spec's **Standards Applied** section (from design-spec)
2. **REQUIRED SUB-SKILLS:** Invoke `dev-tools:using-core-standards` plus every stack skill listed in the spec (same detection table as design-spec)
3. Plans MUST respect `standards/project-structure.md`:
   - Feature folders under `src/`, tests mirror `src/` under `test/`
   - Plan paths use real paths from the ai-plan scope when available
4. If a task would violate a loaded standard, flag it in the plan or adjust the task — do not silently diverge

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during design-spec. If it wasn't, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

If the spec's **Module scope** lists more than one primary module without justification, push back: ask whether to split into separate specs/plans scoped to one module each.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use **dev-tools:execute-plan** to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

**Branch:** `[feature-branch-name]` (feature branch — not main/master)

**Worktree:** `[absolute path to worktree]`

**Integration:** Pull request via `gh pr create` when implementation completes (`dev-tools:execute-plan` → `execute-plan-finish`)

**Planning scope:** `docs/ai-plan/scopes/<module-id>.md` (when ai-plan is present)

**Standards:** [list from spec Standards Applied — e.g. core, dotnet, nextjs]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `test/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest test/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest test/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add test/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code — the engineer may be reading tasks out of order)
- Steps that describe what to do without showing how (code blocks required for code steps)
- References to types, functions, or methods not defined in any task

## Remember
- Exact file paths always
- Complete code in every step — if a step changes code, show the code
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits

## Self-Review

After writing the complete plan, look at the spec with fresh eyes and check the plan against it. This is a checklist you run yourself — not a subagent dispatch.

**1. Spec coverage:** Skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.

**2. Placeholder scan:** Search your plan for red flags — any of the patterns from the "No Placeholders" section above. Fix them.

**3. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a spec requirement with no task, add the task.

## Execution Handoff

After saving the plan, hand off to **execute-plan** — do not start implementation in this skill.

1. Tell your human partner: "Plan saved to `docs/plans/<filename>.md`. When you're ready to implement, say so — I'll use **execute-plan** (verify → run → finish with PR)."
2. **Do NOT** invoke `execute-plan-run`, `execute-plan-run-inline`, or `execute-plan-finish` directly — only via **execute-plan**
3. Wait for explicit go-ahead unless your human partner already asked to implement in the same message

When they say go (or already did):

- **REQUIRED SUB-SKILL:** Invoke `dev-tools:execute-plan` with the plan path

## Integration

**Invoked by:**
- **dev-tools:design-spec** — Step 11 after worktree is ready

**Prerequisites:**
- **dev-tools:using-git-worktrees** — REQUIRED before this skill (design-spec hard gate)
- **dev-tools:using-ai-plan** — REQUIRED when repo has code and ai-plan inputs exist
- **dev-tools:using-core-standards** (+ stack skills from spec) — REQUIRED during planning

**Downstream:**
- **dev-tools:execute-plan** — REQUIRED when implementing the plan (orchestrates run + finish + PR)
