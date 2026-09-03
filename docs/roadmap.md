# Implementation Roadmap

This document lists work slices in implementation order. `docs/features.md` owns the feature inventory, phases, and status; this roadmap owns dependency-driven build order and slicing.

---

## How to Use This Roadmap

* **Slice IDs:** Each slice uses the `R-NNN` scheme. IDs are assigned once and never renumbered or reused; the next ID is the highest ever assigned plus one.
* **Order:** The list order below is the implementation order. Inserting a slice mid-sequence takes the next unused number and the right position — existing IDs never change.
* **Statement:** Each slice is one human-readable statement line: `- [ ] R-NNN: Imperative statement — [F-Nxx](features/f-nxx/feature.md)`, with `— after: ...` appended only when the slice declares dependencies.
* **Detail bullets:** Indented sub-bullets under the statement describe the work in plain language. Keep deep detail in the plan document; the roadmap stays scannable.
* **Verify checkpoint:** The sub-bullet before `Plan:` is a user-verifiable stopping point: `Verify:` followed by what the user runs or clicks, what they should see when the slice is correct, and the demo data to use when observing it needs data. A slice with no user-observable outcome of its own may defer with `Verify: with R-NNN`, naming a later slice whose checkpoint demonstrates it — but checkpoints must occur regularly: never more than two consecutive open slices defer. Slices completed before this convention keep their original blocks.
* **Plan link:** The last sub-bullet links the slice's plan document, or reads `Plan: none yet` before a plan exists. Plan documents live in `docs/plans/` and new ones are named `{R-NNN}-{yyyy.mm.dd}-{step-slug}.md`, dated when the plan is created. Plan documents track their own steps with `[ ]` checkbox task lists.
* **Parent feature:** Each slice references exactly one feature and links to its guide, for example `[F-301](features/f-301/feature.md)`. A feature may be covered by more than one slice.
* **Dependencies:** An optional `after:` list names the slice or feature IDs this slice must follow. A feature ID means "after all existing slices of that feature." A slice must not name its own parent feature.
* **Status:** Check a slice only when its work is implemented and verified. Completed slices are immutable history — rework on a shipped feature is a new slice, never an unchecked old one.
* **Coverage:** Every feature not yet complete in `docs/features.md` needs at least one slice here. Completed features and non-feature capability entries are exempt.

---

## Slices

- [x] R-001: Establish the roadmap template and config contract — [F-301](features/f-301/feature.md)
    - Add the roadmap template to `.plan-product/templates/`.
    - Add the `paths.roadmap`, `paths.roadmapTemplate`, and `structure.roadmap` config and schema entries.
    - Plan: [2026-07-29-001-feat-roadmap-implementation-order-plan](plans/2026-07-29-001-feat-roadmap-implementation-order-plan.md)
- [x] R-002: Deliver the roadmap template through bootstrap — [F-301](features/f-301/feature.md) — after: R-001
    - Copy the roadmap template into place during `--init` bootstrap.
    - Plan: [2026-07-29-001-feat-roadmap-implementation-order-plan](plans/2026-07-29-001-feat-roadmap-implementation-order-plan.md)
- [x] R-003: Ship the plan-roadmap skill and command entry point — [F-301](features/f-301/feature.md) — after: R-001
    - Add the `plan-roadmap` skill with entry validation and stable-ID rules.
    - Add `commands/plan-roadmap.md` and register the capability in README, CLAUDE.md, and AGENTS.md.
    - Plan: [2026-07-29-001-feat-roadmap-implementation-order-plan](plans/2026-07-29-001-feat-roadmap-implementation-order-plan.md)
- [x] R-004: Lock tie-out coverage and dogfood the roadmap — [F-301](features/f-301/feature.md) — after: R-002, R-003
    - Lock the roadmap contract into the content-assertion test suite.
    - Author this roadmap for the plugin repo itself.
    - Plan: [2026-07-29-001-feat-roadmap-implementation-order-plan](plans/2026-07-29-001-feat-roadmap-implementation-order-plan.md)
- [x] R-005: Ship warn-only pre-push code-map regeneration — [F-203](features/f-203/feature.md)
    - Ship the Claude Code plugin hook (`hooks/hooks.json` + `pre-push-regen.mjs`) that regenerates on `git push` and warns, never blocks.
    - Ship the marker-delimited git pre-push installer for runtimes without native hooks.
    - Add the `install-code-map-hook` skill, command entry point, docs, and content-assertion tests.
    - Plan: [R-005-2026.07.31-pre-push-code-map-regeneration](plans/R-005-2026.07.31-pre-push-code-map-regeneration.md)
- [x] R-006: Build the Go adapter and symbol indexing — [F-204](features/f-204/feature.md)
    - Add the Go module-map adapter, stack profile, and package-level module discovery under `go.mod`/`go.work`.
    - Add ast-grep symbol rules for Go functions, methods, structs, and interfaces.
    - Skip `vendor/` directories and `*.pb.go` files at scan time.
    - Plan: [R-006-2026.07.31-go-code-map-support](plans/R-006-2026.07.31-go-code-map-support.md)
- [x] R-009: Ship the build-roadmap implementation loop — [F-401](features/f-401/feature.md) — after: F-301
    - Add the `build-roadmap` skill, its phase-contract reference, and `commands/build-roadmap.md`.
    - Select the next buildable slice from the roadmap, or the next buildable feature when no roadmap exists, and drive it through ce-plan, ce-doc-review, ce-work, the test suite, ce-debug, ce-code-review, ce-compound, and map-code with dev-standards enforced.
    - Register the capability across README, CLAUDE.md, AGENTS.md, and Codex docs; lock the contract into content-assertion tests.
    - Verify: run `npm test` and confirm `build-roadmap-docs.test.mjs` passes; in a repo with an open slice, run `/plan-product:build-roadmap` and confirm it names that slice, writes a plan under `docs/plans/R-NNN-yyyy.mm.dd-*.md`, and checks the slice off only after the suite passes.
    - Plan: [R-009-2026.09.02-build-roadmap-loop](plans/R-009-2026.09.02-build-roadmap-loop.md)
- [x] R-010: Make pre-push regeneration opt-in and honest — [F-203](features/f-203/feature.md) — after: R-005
    - Remove the Claude Code plugin hook (`hooks/hooks.json`) that fired in every repo where the plugin was enabled; the git pre-push hook installed per repo is the only trigger.
    - Skip regeneration entirely in repos without `.plan-product/config.json`.
    - Report generator failures as failures: `regen-if-source-changed.mjs --run` exits non-zero and the pre-push warning names the failing generator.
    - Move the regeneration log from `docs/code-map/.regen.log` to `.temp/regen.log`, self-ignored, so it never trips the uncommitted-artifacts warning.
    - Verify: in a scratch repo with no `.plan-product/config.json`, install the git hook and push; confirm no `docs/code-map/` appears. In a plan-product repo, break `plan-product.config.json` and push; confirm the warning names the failing generator and `.temp/regen.log` holds the error.
    - Plan: none yet
- [x] R-007: Detect Go endpoints — [F-204](features/f-204/feature.md) — after: R-006
    - Extract `net/http`, gin, echo, and chi route registrations into the endpoint index.
    - Extract Go MCP tool declarations, matching the MCP detection other languages have.
    - Plan: [R-006-2026.07.31-go-code-map-support](plans/R-006-2026.07.31-go-code-map-support.md)
- [x] R-008: Prove Go parity with fixtures and tests — [F-204](features/f-204/feature.md) — after: R-006, R-007
    - Add Go fixture repos mirroring the existing per-language test layout.
    - Cover adapter edges, symbol ownership, endpoint extraction, and the vendor/generated-code skips.
    - Plan: [R-006-2026.07.31-go-code-map-support](plans/R-006-2026.07.31-go-code-map-support.md)
