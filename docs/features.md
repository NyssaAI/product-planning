# plan-product Feature Progress

| Delivery Phase | Complete / Total | % Complete |
|----------------|------------------|------------|
| Phase 0 - Planning Foundation | 3 / 3 | 100% |
| Phase 1 - Feature Guide Workflow | 3 / 3 | 100% |
| Phase 2 - Code Map Workflow | 2 / 2 | 100% |
| Existing Code-Map Capabilities | 15 / 15 | 100% |
| **Overall** | 23 / 23 | 100% |

---

## How to Use This Feature Inventory

This document lists plan-product features in intended build order and retains the existing code-map capability inventory.

* **Feature IDs:** Canonical plan-product features use the `F-Nxx` scheme, where `N` is the delivery phase and `xx` is the two-digit feature number.
* **Feature folders:** Each plan-product feature owns a folder named with the lowercase feature ID, for example `docs/features/f-001/`.
* **Feature files:** The main feature guide is always `feature.md` inside that folder. Use cases live beside it as `uc-001-short-slug.md`.
* **Status:** An item is marked `complete` only when the capability is implemented, documented, and verified against `.plan-product/config.json`.
* **Phases:** Phase 0 establishes the repo-local planning contract, Phase 1 builds feature guide workflows, and Phase 2 connects product planning to code-map artifacts.
* **Code-map capabilities:** The `CM-xxx` entries track the implemented generator capabilities that plan-product keeps alongside product planning workflows.

---

## Feature Checklist Summary

* [x] F-001: plan-product path map
* [x] F-002: Docs product docs
* [x] F-003: Templates and schema
---
* [x] F-101: Feature inventory
* [x] F-102: Feature detail docs
* [x] F-103: Feature phase organization
---
* [x] F-201: Product code map
* [x] F-202: Code map planning handoff

## Feature Inventory

### Phase 0 - Planning Foundation

**F-001: plan-product path map**  
Repo-relative config that tells agents where plan-product artifacts live.  
[Feature Guide: plan-product Path Map](features/f-001/feature.md)

**F-002: Docs product docs**  
Canonical docs files for product, features, and stack.  
[Feature Guide: Docs Product Docs](features/f-002/feature.md)

**F-003: Templates and schema**  
Starter templates and JSON schema for repeatable, validated plan-product artifacts.  
[Feature Guide: Templates and Schema](features/f-003/feature.md)

---

### Phase 1 - Feature Guide Workflow

**F-101: Feature inventory**  
`docs/features.md` explains feature naming, locations, statuses, and phase order.  
[Feature Guide: Feature Inventory](features/f-101/feature.md)

**F-102: Feature detail docs**  
Per-feature files under `docs/features/` capture scope, inputs, outputs, and acceptance criteria.  
[Feature Guide: Feature Detail Docs](features/f-102/feature.md) · [UC-001: Author a feature guide](features/f-102/uc-001-author-feature-guide.md)

**F-103: Feature phase organization**  
Features are grouped into phases so agents can reason about build order and dependency chains.  
[Feature Guide: Feature Phase Organization](features/f-103/feature.md)

---

### Phase 2 - Code Map Workflow

**F-201: Product code map**  
Product-oriented code context lives under `docs/code-map/` and supports implementation planning.  
[Feature Guide: Product Code Map](features/f-201/feature.md)

**F-202: Code map planning handoff**  
Planning workflows can reference product code-map artifacts alongside feature guides.  
[Feature Guide: Code Map Planning Handoff](features/f-202/feature.md)

---

## Integrated Code-Map Capabilities

These items list the implemented code-map capabilities that remain part of plan-product.

* [x] CM-001: Code map generation
* [x] CM-002: Module map generation
* [x] CM-003: Per-module architecture files
* [x] CM-004: Progressive-disclosure planning workflow
* [x] CM-005: Module discovery and pinning
* [x] CM-006: Endpoint surface detection
* [x] CM-007: Bootstrap and init
* [x] CM-008: Module-map embedding
* [x] CM-009: Doctor and staleness checks
* [x] CM-010: Generated layout normalization
* [x] CM-011: Multi-harness packaging
* [x] CM-012: `map-code` command and skill
* [x] CM-013: `map-architecture` command and skill
* [x] CM-014: `find-code-patterns` command and skill
* [x] CM-015: Usage and effectiveness reporting

## Code-Map Capability Notes

**CM-001: Code map generation**  
`scripts/code-map/generate-code-map.mjs` scans the repo with `@ast-grep/cli` structural rules and writes a per-file symbol index plus endpoint index. This is L3 context, loaded only after a plan names symbols.

**CM-002: Module map generation**  
`scripts/module-map/generate-module-map.mjs` writes a module graph with `dependsOn` / `usedBy` edges, route/symbol counts, and per-module metadata. It is consumed for task ordering, not pasted wholesale into context.

**CM-003: Per-module architecture files**  
One module file describes boundaries, capabilities, does-not-own scope, dependencies, public surface, routes, test roots, and sample symbols.

**CM-004: Progressive-disclosure planning workflow**  
The `using-code-map` skill defines the L0-L3 disclosure model so agents load only the context needed for the current feature, use case, or implementation task.

**CM-005: Module discovery & pinning**  
Auto-detection derives module boundaries from dependency graphs, stack profiles, and workspace layouts. `--pin` and `--unpin` preserve or release derived module definitions in config.

**CM-006: Endpoint surface detection**  
The code map indexes HTTP route handlers and MCP tools, resources, prompts, and transports across supported languages.

**CM-007: Bootstrap & init**  
`generate-module-map.mjs --init --write-scripts` scaffolds product docs, optional generator config, generated context directories, and project npm scripts.

**CM-008: Module-map embedding**  
Generation embeds a freshness-stamped module-map table into `CLAUDE.md` and `AGENTS.md` between managed markers.

**CM-009: Doctor & staleness checks**  
`generate-module-map.mjs --doctor` reports required docs, generated artifacts, runtime readiness, and staleness signals.

**CM-010: Generated layout normalization**  
`generate-module-map.mjs --migrate` normalizes generated artifact names and module directories under the current `docs/code-map/` structure.

**CM-011: Multi-harness packaging**  
The same generator scripts support Claude Code, Cursor, Codex, and Gemini through per-harness adapters and plugin manifests.

**CM-012: `map-code` command / skill**  
Runs code-map plus module-map generation in the current project repo.

**CM-013: `map-architecture` command / skill**  
Builds a system-architecture handoff from `module-map.json`, preserving an agent-authored overview region.

**CM-014: `find-code-patterns` command / skill**  
Reviews structurally detectable code patterns by application module, showing where pattern families are used, which expected patterns are not detected, and which files lack headline pattern evidence as a code-quality review signal. Repo-specific detection and expectations live in `.plan-product/patterns/library.json` and `.plan-product/patterns/expectations.json`.

**CM-015: Usage and effectiveness reporting**  
Generator commands record local JSONL usage events under `.plan-product/usage/events.jsonl` when enabled. `generate-module-map.mjs --effectiveness` writes `docs/code-map/effectiveness.md` with command success, warning, artifact-health, doctor-check, and recent-run signals.
