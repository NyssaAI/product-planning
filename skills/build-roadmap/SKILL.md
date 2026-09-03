---
name: build-roadmap
description: Build the roadmap one slice at a time in a Compound Engineering loop. Picks the next open slice from docs/roadmap.md (or the next unchecked feature from docs/features.md when no roadmap exists), plans it with ce-plan, reviews the plan adversarially, implements with ce-work, runs the test suite, fixes failures with ce-debug, reviews the code, captures learnings with ce-compound, rebuilds the code map, marks the slice complete, and repeats. Enforces the dev-standards plugin at every phase. Use when the user wants to build out the roadmap, implement the next feature end to end, or run the implementation loop.
---

# Build Roadmap

Implement roadmap slices in a loop. The main agent reviews the plan-product docs, selects the next buildable unit of work, dispatches each pipeline phase to a subagent, gates on the phase's return, records completion in the roadmap and feature inventory, and starts over.

Use `.plan-product/config.json` as the path authority. The roadmap owns the build order; the feature inventory owns feature status. This skill writes completion state into both and never invents new slices or features — that is `plan-roadmap` and `plan-feature` work.

Announce at start: "I'm running the build-roadmap loop; each slice is planned, reviewed, implemented, tested, fixed, reviewed again, compounded, and code-mapped before it is checked off."

## Arguments

| Token | Meaning |
| --- | --- |
| `R-NNN` or `F-Nxx` | Start with this slice or feature instead of the first buildable one. The target must still be open and buildable. |
| `mode:autonomous` | No check-ins. Every question point takes its conservative default and every gate failure stops the loop with a report. |
| `max:N` or `max:all` | Stop after N completed units. Default `1` interactive, `3` autonomous. `max:all` runs until nothing is buildable. |
| `branch:<name>` | Work on this branch instead of the default `build-roadmap/<yyyy.mm.dd>` run branch. |
| `test:<command>` | Test-suite command override. Otherwise detect it as described under Test Suite. |

Tokens are flags, not context. Strip them before treating the remainder as a brief hint for the first unit.

## Operating Rules

- Resolve every skill named in this file against the host's available-skills list and invoke that exact entry. Hosts may namespace entries (`compound-engineering:ce-plan`, `dev-standards:dev-standards`, `plan-product:map-code`); a short-form guess that is not in the list fails.
- The main agent owns loop state, selection, every gate decision, and every write to the roadmap, the feature inventory, and feature guides. Run each pipeline phase in a fresh subagent through the host's subagent primitive so the main context stays lean. If subagents are unavailable, run the phases sequentially in the main context in the same order with the same gates.
- Use the most capable model available for the main agent. Where the host allows a per-subagent model choice, use the strongest tier for planning, plan review, and code review, and a standard tier for the test run and the code-map rebuild.
- Never uncheck a completed slice or feature, never renumber or reuse an ID, and never edit a slice's statement, detail bullets, or `Verify:` line. This skill only flips `[ ]` to `[x]`, fills `Plan: none yet`, updates a feature guide's `status:` frontmatter, and refreshes the inventory progress table.
- Enforce the dev-standards plugin at every phase. See Dev Standards Enforcement; it is not optional and no flag disables it.
- Commit locally after each completed unit. Never push, open a pull request, merge, rebase, or force-push. Shipping is the user's call afterwards through `ce-commit-push-pr`.
- Never work on the default branch. Never commit files the user had dirty before the run started; record them as excluded and leave them untouched.
- Treat repo-relative paths as identical after normalizing separators and resolving `.` segments. A path under a managed directory collides with that directory; do not rely on Git's status prefix alone when comparing paths.
- Interactive mode asks one blocking question at a time through the host's blocking question tool when one is listed; otherwise present numbered choices in chat and wait. Autonomous mode asks nothing.
- Bound every retry. The fix loop runs at most three rounds; the plan-revision loop runs at most one; every other phase runs once and its failure is a stop.

## Config Resolution

| Purpose | Config field | Default |
| --- | --- | --- |
| Roadmap | `paths.roadmap` or `structure.roadmap.file` | `docs/roadmap.md` |
| Feature inventory | `paths.features` or `structure.features.inventory` | `docs/features.md` |
| Feature guide path | `structure.features.featurePathPattern` | `docs/features/f-nxx/feature.md` |
| Plans directory | `paths.plans` | `docs/plans` |
| Plan file name | `structure.roadmap.planNamePattern` | `R-NNN-yyyy.mm.dd-step-slug.md` |
| Code-map root | `paths.codeMap` or `structure.codeMap.root` | `docs/code-map` |
| Tech stack | `paths.techStack` | `docs/tech-stack.md` |

If a field is missing, use the default for that field only. Do not write the config.

## Work Source

The loop builds from the roadmap when the configured roadmap file exists and contains at least one slice line. Otherwise it builds from the feature inventory.

**Roadmap mode.** A unit is one slice block. The next unit is the first open slice in document order whose `after:` entries are all complete — a slice ID is complete when checked, a feature ID is complete when every slice of that feature is checked. Skip an open slice whose dependencies are open and keep scanning; report skipped slices. The unit's inputs are its statement line, detail bullets, `Verify:` checkpoint, `Plan:` link, and the parent feature guide.

**Inventory mode.** A unit is one feature. The next unit is the first unchecked `F-Nxx` entry in inventory order whose feature guide exists and whose guide `Dependencies` name only complete features or external prerequisites. Non-feature capability entries (for example `CM-xxx`) are never units. The unit's inputs are the inventory entry and the feature guide. Tell the user once that no roadmap exists and that `plan-roadmap` would give them dependency ordering and verify checkpoints; do not create one.

If neither file exists, or the inventory holds only template placeholder features, stop and route the user to `plan-product`.

## Workflow

### 0. Preflight

1. Read `.plan-product/config.json` and resolve every path above. If the config is missing, stop and route the user to `plan-product`; this skill never bootstraps a repo.
2. Read the configured roadmap, feature inventory, and tech-stack doc. Decide the work source.
3. Confirm `git` is available and the working tree is a repository. Record every path from `git status --short --untracked-files=all` as the pre-run dirty set (both old and new paths for a rename, with Git quoting decoded) and `git branch --show-current` as the starting branch.
4. Resolve the default branch name first (`origin/HEAD`, else an existing local `main` or `master`) and canonicalize local branch spellings by removing `refs/heads/` or `refs/remotes/origin/`. If the canonical `branch:<name>` equals the canonical default branch name, stop before switching branches or making any working-tree write and tell the user to choose a non-default branch. Compare names, not tip commit SHAs: a new work branch may legitimately start at the same commit as the default branch. Otherwise use `branch:<name>` when given. Without it, if the current branch is the default branch, create and switch to `build-roadmap/<yyyy.mm.dd>`; if the branch already exists, switch to it. If the current branch is not the default, stay on it.
5. Resolve the plugin root for the code-map rebuild. Prefer `PLAN_PRODUCT_PLUGIN_ROOT`, then `PLUGIN_ROOT`, then `CLAUDE_PLUGIN_ROOT`, then `CURSOR_PLUGIN_ROOT`; otherwise use the installed plugin directory containing this skill. Substitute that absolute path for `${PLUGIN_ROOT}` before running any command.
6. Resolve the test-suite command (see Test Suite).
7. Load the `dev-standards` skill in the main context and read its required baseline. Keep a two-to-five-line summary of the applicable constraints for this repo; every subagent packet carries it.

### 1. Review the plan-product docs

Run this review in the main agent, before every iteration, so drift is caught before work starts. Check, in order, the same classes `plan-roadmap` validates, read-only:

- **Resolution:** every slice's parent feature exists in the inventory and its feature guide exists.
- **Coverage:** every unchecked feature has at least one slice (roadmap mode only).
- **Ordering:** no open slice appears before a slice or feature named in its `after:` list.
- **Reference integrity:** every `after:` entry resolves; no cycles, self-references, or duplicate IDs.
- **Plan links:** every `Plan:` sub-bullet reads `none yet` or links to a file that exists.
- **Status sync:** a feature whose slices are all checked but which is unchecked in the inventory; a checked feature with an open slice.

Fix only mechanical drift yourself: a feature whose slices are all complete gets checked in the inventory, its guide gets `status: complete`, and the progress table is recomputed. A `Plan:` link pointing at a file that was renamed to the configured pattern gets repointed. Every other violation stops the loop with the violation named and the user routed to `plan-roadmap` or `plan-feature`; in interactive mode, offer to open that skill. Never build on a roadmap that fails ordering or reference integrity.

### 2. Select the next unit

Apply Work Source. With an `R-NNN` or `F-Nxx` argument, verify it is open and buildable; otherwise stop and say why. Compose the unit brief:

```text
Unit: R-NNN — <statement> (parent F-Nxx: <feature name>)
Detail: <the slice's detail bullets>
Verify: <the slice's Verify: line, or the deferral target's line>
Feature guide: <path>
Existing plan: <path or none>
Dev standards: <the preflight constraint summary>
```

Interactive mode asks: "Build R-NNN next? 1. Yes 2. Pick a different slice 3. Stop". Autonomous mode proceeds.

Before normalizing any artifact or dispatching any phase, discover the selected unit's mandatory managed write targets and intersect them with the pre-run dirty set:

- the configured roadmap path when roadmap mode is active;
- the configured feature-inventory path;
- the selected feature guide, resolved from the selected parent/feature ID and `structure.features.featurePathPattern`; and
- the resolving existing `Plan:` path when this run will reuse that plan.

Resolve links relative to the repo root, normalize every target to a repo-relative path, and compare exact file paths (a directory target also covers descendants). If the intersection is non-empty, stop before plan normalization or subagent dispatch. Report every colliding path and tell the user to commit, stash, or move those changes, then rerun. This is a recovery stop, not an excluded-file exception: the loop cannot safely complete while one of its mandatory writes was dirty before the run.

### 3. Plan

Skip to step 4 when the unit already has a resolving `Plan:` link and the plan file is an implementation plan with open `[ ]` tasks; reuse that plan. Otherwise dispatch the **plan** packet from `references/phase-contracts.md`: `ce-plan confirm:auto` with the unit brief and the feature guide. `confirm:auto` is the only skip token ce-plan honors; it skips the scoping confirmation, and the packet tells the subagent to return `status: blocked` with the question when ce-plan still needs a decision it cannot default.

GATE. Only a return that names a written plan file advances. A `status: blocked` return whose blocker is a question is asked to the user in interactive mode and then the packet is dispatched again with the answer appended to the brief, once; autonomous mode stops. Any other `status: blocked`, a non-software classification, or a plan that is not implementation-ready stops the loop.

Then normalize the artifact:

1. Move the written plan to the configured plans directory and rename it to the configured plan-name pattern for this unit (`R-NNN-yyyy.mm.dd-step-slug.md`, dated today; inventory mode uses `F-Nxx` in place of the slice ID). Use `git mv` when the file is tracked. Keep the content unchanged.
2. Roadmap mode: write the new path into the unit's `Plan:` sub-bullet, replacing `none yet`. Inventory mode has no roadmap line; keep the path in loop state and name it in the completion report.
3. Record the path as the plan path for every later phase.

### 4. Review the plan adversarially

Dispatch the **plan-review** packet: `ce-doc-review mode:non-interactive <plan path>`. That skill applies the findings it routes to Apply itself and returns the rest classified.

GATE. Read the returned envelope. A blocking finding — one under the coherence, feasibility, or adversarial lens at confidence 100, or 75 with two reviewers agreeing, that says the plan cannot work as written — sends the loop through one revision: dispatch the **plan** packet again with the plan path as the deepen target and the blocking findings appended to the brief, then run this step once more. A second blocking result stops the loop. Non-blocking findings are recorded as residuals and the loop continues.

### 5. Implement

Dispatch the **implement** packet: `ce-work mode:return-to-caller <plan path>`. That skill implements on the current branch, makes path-limited incremental commits, verifies locally, and returns a structured envelope without entering its own shipping tail.

GATE. Only `status: complete` advances. Verify the envelope names changed files and, when `behavior_change: true`, carries verification evidence. Every other status, a malformed return, or a `settled_decision_conflicts` entry routed as a blocker stops the loop with the envelope's blockers and recovery path reported.

### 6. Run the test suite

Run the resolved test command from the repo root in a subagent using the **test** packet, capturing exit code, summary counts, and the failing test names with their output tails. A missing test command is recorded as a residual, not a failure; say so in the report.

### 7. Fix failures

When step 6 fails, dispatch the **fix** packet: `ce-debug mode:pipeline` with the failing output, the plan path, and an envelope that allows fix and commit on the current branch and excludes push. Then rerun step 6. Repeat at most three rounds.

GATE. A passing suite advances. A `needs-human`, `diagnosed-no-fix`, or `flaky-infra` return, or a third failing rerun, stops the loop with the return's residuals and decision context reported. Never weaken, skip, or mock a failing assertion to make it pass.

### 8. Review the code

Dispatch the **code-review** packet: `ce-code-review mode:agent plan:<plan path>`. That review is report-only and returns JSON findings; it discovers dev-standards paths itself.

Apply findings yourself through the **apply-review** packet when all of these hold: a concrete `suggested_fix` is present, confidence is 100 or 75 with cross-persona agreement, the fix is mechanical, and the evidence still matches the code at the cited location. Dev-standards findings that meet that bar are always applied. Commit applied fixes as `fix(review): apply review findings for R-NNN`, staging only review-driven files. When any applied finding has `requires_verification: true`, rerun step 6 once; a failure returns to step 7 with the remaining rounds.

GATE. A finding stamped `settled_conflict` whose evidence says the settled decision cannot work stops the loop. Unapplied findings are residuals.

### 9. Compound knowledge

Dispatch the **compound** packet: `ce-compound mode:non-interactive depth:full` with a brief naming the unit, the plan path, and the non-trivial problems solved in steps 5 through 8. That skill writes one learning under `docs/solutions/` or reports `Documentation skipped` with a reason; both are acceptable. Run it once per unit. Also add the learning link to the plan document's final section when a doc was written.

### 10. Rebuild the code map

The generator-managed targets are every path under the configured code-map root plus repo-root `AGENTS.md` and `CLAUDE.md`, because the generator may refresh embedded module-map sections in those root files. Intersect those targets with the pre-run dirty set before dispatch. If any collide, skip the code-map rebuild entirely and record every colliding path as a warn-only code-map residual; never let the generator overwrite a pre-run dirty managed target.

Otherwise dispatch the **codemap** packet: run the `map-code` workflow from the repo root:

```bash
node "${PLUGIN_ROOT}/scripts/map-code/generate.mjs"
```

Regeneration is warn-only. A generator failure is a residual; it never stops the loop. The packet returns every path changed by the generator, including changed root `AGENTS.md` or `CLAUDE.md` embeddings, not only artifacts below the code-map root. Keep that returned path set for the completion commit.

### 11. Mark complete and commit

In the main agent:

1. Check the plan document's remaining `[ ]` tasks that the implement envelope reports complete. Leave any it did not complete unchecked and name them as residuals.
2. Roadmap mode: flip the slice's `- [ ] R-NNN:` to `- [x] R-NNN:`. Then, if every slice of the parent feature is checked, check the feature in the inventory, set the guide's `status: complete`, and recompute the progress table.
3. Inventory mode: check the feature in the inventory, set the guide's `status: complete`, and recompute the progress table.
4. Build an explicit completion staging allowlist from the managed docs written for this unit (roadmap when applicable, inventory, selected feature guide, plan document, and returned solutions doc) plus the exact changed paths returned by the codemap packet. Remove every path in the pre-run dirty set, then stage only that allowlist; do not stage by directory or with a catch-all pathspec. This includes clean-at-start `AGENTS.md` or `CLAUDE.md` changes returned by the generator while still excluding every pre-run dirty path. Commit `feat(R-NNN): <slice statement>` (inventory mode: `feat(F-Nxx): <feature name>`). Use `ce-commit` when it is available; otherwise commit directly with that message.

### 12. Loop

Increment the completed count. Re-read the roadmap and inventory from disk, then return to step 1. Stop when the count reaches `max:N`, when no buildable unit remains, or when a gate stopped the loop. In interactive mode, step 2's question is the check-in; there are no others.

## Dev Standards Enforcement

The dev-standards plugin governs every phase, and this skill never decides which standards apply — the `dev-standards` skill does.

- Preflight loads `dev-standards` in the main context and summarizes the applicable constraints for this repo and language.
- Every subagent packet opens with: "Load the `dev-standards` skill (host name may be `dev-standards:dev-standards`) and apply it as a constraint on this work. Keep this phase's primary workflow; use dev-standards only to govern repository layout, naming, architecture, implementation, testing, and review decisions. State a material conflict instead of silently choosing a lower-precedence rule." The preflight summary follows.
- The plan brief asks `ce-plan` to record the applicable standards categories in the plan's technical design, so the implementer reads them.
- Step 8's review carries a standards lens through `ce-code-review`; standards findings that meet the apply bar are applied before the unit is checked off, and the rest are residuals the completion report lists under a `Dev standards` heading.
- A standards violation is never resolved by skipping the standard. When a standard and the plan conflict, the plan yields unless the user has settled the decision, and the conflict is reported.

The `audit` skill from the same plugin is not part of the loop. Suggest it in the completion report when residual standards findings accumulate.

## Test Suite

Resolve the command once in preflight, in this order:

1. `test:<command>` argument.
2. A test command stated in the configured tech-stack doc.
3. `package.json` with a `scripts.test` entry: the package manager's test script.
4. `go.mod`: `go test ./...`.
5. `pyproject.toml`, `pytest.ini`, or `setup.cfg` with pytest configuration: `pytest`.
6. A `*.sln` or `*.csproj`: `dotnet test`.
7. `Cargo.toml`: `cargo test`.

Record `none detected` otherwise. Always run the full suite, not a filtered subset; the implement phase already ran targeted checks.

## Stop Conditions and Report

The loop ends on `max`, on an empty buildable set, on a gate failure, or on the user choosing Stop. Always finish with a report:

```text
build-roadmap run — <branch>, <n> unit(s) completed
Completed: R-NNN <statement> (plan: <path>, commit: <sha>)
Stopped at: <unit and gate, or "nothing buildable", or "max reached">
Residuals:
- Review: <unapplied findings, file:line — title>
- Dev standards: <unapplied standards findings>
- Tests: <missing command, skipped suites>
- Code map: <generator warnings>
- Plan tasks left open: <list>
Excluded pre-run changes: <paths or none>
Next: run `ce-commit-push-pr` to ship the branch, or `build-roadmap` again to continue.
```

A gate stop names the phase, the exact return status or failing check, and the recovery path from the phase's envelope. Never report a unit complete that was not checked off in this run, and never check off a unit whose gates did not all pass.
