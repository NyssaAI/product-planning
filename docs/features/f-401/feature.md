---
id: F-401
phase: 4
status: complete
---

# F-401 Roadmap Build Loop

## Summary

The `build-roadmap` skill implements the roadmap one slice at a time: it selects the next buildable slice, drives it through Compound Engineering planning, adversarial plan review, implementation, the full test suite, bounded fixing, code review, learning capture, and a code-map rebuild, then checks the slice off and repeats.

## User Need

Product planners who have finished `plan-product`, `plan-feature`, and `plan-roadmap` want the planned work built without hand-driving each Compound Engineering skill per slice, while keeping the roadmap and feature inventory truthful and the dev-standards plugin enforced on every change.

## Use Cases

None yet.

## Scope

- The `build-roadmap` skill and `commands/build-roadmap.md` entry point.
- Work-source selection: the first buildable open slice from the configured roadmap, falling back to the first buildable unchecked feature from the configured inventory when no roadmap exists.
- The per-slice pipeline and its gates: `ce-plan`, `ce-doc-review`, `ce-work`, the repo test suite, `ce-debug`, `ce-code-review` with orchestrator-applied fixes, `ce-compound`, and `map-code`.
- Plan-file normalization to `structure.roadmap.planNamePattern` under `paths.plans` and the `Plan:` link update.
- Completion writes: slice checkboxes, feature checkboxes, guide `status:` frontmatter, and the inventory progress table.
- Dev-standards enforcement through a standards preamble in every subagent packet and a standards lens in review.
- Pre-iteration drift review that mirrors `plan-roadmap`'s validation classes and repairs mechanical status drift only.

## Out of Scope

- Creating or editing slices, features, or `Verify:` lines — that stays with `plan-roadmap` and `plan-feature`.
- Pushing, opening pull requests, merging, or CI watching — the user ships with `ce-commit-push-pr`.
- The Compound Engineering and dev-standards skills themselves; this feature only orchestrates them.
- Running the `audit` skill inside the loop.
- Parallel slice implementation.

## Inputs

- `.plan-product/config.json` roadmap, inventory, plans, code-map, and tech-stack paths.
- The configured roadmap and feature inventory, feature guides, and any existing plan linked from a slice.
- Arguments: a target `R-NNN` or `F-Nxx`, `mode:autonomous`, `max:N|all`, `branch:<name>`, `test:<command>`.
- Structured returns from `ce-plan`, `ce-doc-review`, `ce-work`, `ce-debug`, `ce-code-review`, and `ce-compound`.

## Outputs

- Local commits on a `build-roadmap/<yyyy.mm.dd>` branch, one per completed unit.
- A plan document per unit named `R-NNN-yyyy.mm.dd-step-slug.md` and linked from the roadmap.
- Checked slices and features, updated guide status, and a refreshed progress table.
- A learning under `docs/solutions/` when one qualified, and refreshed `docs/code-map/` artifacts.
- A completion report naming completed units, the stop reason, and residuals by category.

## Acceptance

- `skills/build-roadmap/SKILL.md`, `skills/build-roadmap/references/phase-contracts.md`, and `commands/build-roadmap.md` exist and use configured paths only.
- The skill builds from `paths.roadmap` when present and from `paths.features` otherwise, and routes to `plan-product` when neither exists.
- Every pipeline phase names its skill, its mode tokens, and its gate; the fix loop is bounded to three rounds and the plan-revision loop to one.
- Dev-standards enforcement cannot be disabled by a flag, and every subagent packet carries the standards preamble.
- The skill never unchecks history, never renumbers IDs, never pushes, and never works on the default branch.
- Content-assertion tests in `test/module-map/build-roadmap-docs.test.mjs` lock the contract, and the capability is registered in README, CLAUDE.md, AGENTS.md, and the Codex install docs.

## Dependencies

- F-301 (implementation roadmap), F-102 (feature detail docs), F-201 (product code map).
- External: the `compound-engineering` and `dev-standards` plugins installed on the host.
