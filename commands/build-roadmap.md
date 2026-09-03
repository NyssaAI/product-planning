---
description: Build the roadmap one slice at a time in a Compound Engineering loop - plan, adversarial plan review, implement, test, fix, code review, compound, code-map rebuild, mark complete, repeat - with dev-standards enforced at every phase.
argument-hint: "[R-NNN or F-Nxx] [mode:autonomous] [max:N|all] [branch:<name>] [test:<command>]"
---

# build-roadmap - implement the next slice, then the next

Load the `build-roadmap` skill and follow its workflow. The skill owns the work-source rules, the per-phase subagent packets and return gates, the plan-file normalization, the bounded fix loop, the dev-standards enforcement, and the completion writes; this command file is only the entry point.

Work from `paths.roadmap` (usually `docs/roadmap.md`) when it exists: the next unit is the first open slice whose `after:` dependencies are complete. When no roadmap exists, work from `paths.features` (usually `docs/features.md`): the next unit is the first unchecked feature whose guide dependencies are complete.

## Per unit

1. Review the roadmap and feature inventory for drift; fix mechanical status drift, stop on anything else.
2. `ce-plan` writes the plan; the loop renames it to `structure.roadmap.planNamePattern` under `paths.plans` and links it from the slice.
3. `ce-doc-review mode:non-interactive` reviews the plan adversarially; one revision round at most.
4. `ce-work mode:return-to-caller` implements on the run branch.
5. The full test suite runs; `ce-debug mode:pipeline` fixes failures, at most three rounds.
6. `ce-code-review mode:agent` reviews the change; mechanical, high-confidence findings are applied and committed.
7. `ce-compound mode:non-interactive` captures one learning.
8. `map-code` rebuilds the code map (warn-only).
9. The slice is checked off, the feature is checked when all its slices are done, and the unit is committed locally.

## Writes

- the configured roadmap (`paths.roadmap`): `[x]` on completed slices and `Plan:` links
- the configured feature inventory (`paths.features`): `[x]` on completed features and the progress table
- feature guides: `status: complete`
- plan documents under `paths.plans`, learnings under `docs/solutions/`, and code-map artifacts under `paths.codeMap`
- local commits on a `build-roadmap/<yyyy.mm.dd>` branch (or `branch:<name>`); never a push or PR

## Prerequisites

- `.plan-product/config.json` with the roadmap or feature-inventory paths, and feature guides for the units to build.
- The `compound-engineering` plugin (`ce-plan`, `ce-doc-review`, `ce-work`, `ce-debug`, `ce-code-review`, `ce-compound`, `ce-commit`) and the `dev-standards` plugin installed on the host.
- Node.js for the code-map rebuild.

Default is interactive: one confirmation before each unit, one unit per run. `mode:autonomous max:all` runs hands-off until nothing is buildable or a gate stops the loop. Ship the branch afterwards with `ce-commit-push-pr`.
