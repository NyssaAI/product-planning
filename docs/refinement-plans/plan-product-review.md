# Plugin Architectural Review & Refinement Plan: `plan-product`

> [!IMPORTANT] Scope Directive
> This document records the architectural evaluation and refinement plan for `plan-product`. It identifies compliance, risks, and concrete remediation steps across the canonical plugin authoring standards.

**Evaluation Date**: `2026-10-24`  
**Evaluator**: `plugin-builder`  
**Current Version**: `0.2.0`  
**Plugin Archetype**: `Hybrid Code`  
**Current Architectural Style**: `Encapsulated Facade`  

---

## Executive Summary

`plan-product` (v0.2.0) is an **Encapsulated Facade** plugin that coordinates six product-planning workflows (`product`, `concept`, `feature`, `use-case`, `roadmap`, and `maintain`) behind a single public skill (`skills/plan-product/SKILL.md`) and six matching slash commands (`commands/plan-*.md`). Its deterministic boundary is well-structured: Node.js scripts (`scripts/init.mjs`, `scripts/migrate.mjs`, `scripts/assemble.mjs`, `scripts/validate.mjs`) handle path resolution, initialization, Model v1-to-v2 migration, host manifest projection, and structural/link verification, while markdown runbooks stay concise (65–145 lines) with explicit Scope Directives and verification checklists.

Following our zero-trust audit and architectural alignment with the user, four areas require remediation for `0.2.0` release readiness:
1. **Repository Layout, Asset Placement & NyssaAI State Convention (Dimension 2 — Non-Compliant)**:
   - As a NyssaAI plugin, project-scoped configuration and initialized templates must live under `./.nyssa-ai/plan-product/` rather than `./.plan-product/`, while the plugin's bundled default config, schema, and starter templates must reside in canonical `skills/plan-product/assets/`.
   - The loose root `CONCEPTS.md` file (which contains obsolete Model v1 `R-NNN` terminology and is omitted from `package.json` `files`) must be removed.
2. **Package Organization & Manifest Conformance (Dimension 4 — Needs Remediation)**:
   - Root `plugin.json` description, keywords, and `defaultPrompt` must be updated for v0.2.0's `concept` (`C-nn`) and `maintain` (`v1 -> v2`) workflows.
   - `package.json` `files` must ship `skills/plan-product/assets/` instead of `.plan-product/` and exclude `.nyssa-ai/` project state from release tarballs.
   - `evals/scenarios/product-planning/prepare.mjs` must read `version` and `author.name` dynamically from `plugin.json`.
3. **Trigger Precision & Frontmatter Design (Dimension 7 — Needs Remediation)**:
   - `skills/plan-product/SKILL.md` frontmatter must open with third-person imperative phrasing (`"Use this skill when..."`) and include quoted trigger phrases for domain concepts/macro-flows (`C-nn`) and model migration/maintenance (`/plan-maintain`).
4. **Strict Model v2 Enforcement & v2-Only Evaluation Suite (Dimension 10 — Needs Remediation)**:
   - The plugin **cannot** operate under Model v1 and Model v2 rules simultaneously. If legacy v1 state (`.plan-product/`, `version < 2`, `F-Nxx`, `UC-nnn`, `R-NNN`) is detected, the agent must alert the user to the version conflict and route to `workflows/maintain.md`.
   - All Model v1 evaluation fixtures and prompts in `evals/scenarios/product-planning/cases.json` (except `maintain` migration prompts/fixtures that specifically test v1-to-v2 migration) must be upgraded to **Model v2** (`version: 2`, `.nyssa-ai/plan-product/config.json`, `C-nn`, `F-gg.nn`, `UC-gg.nn.uu`, `R-pp.ss`), with new content scenarios added for `concept` and `maintain`, a Waza trigger suite added at `evals/waza/skills/plan-product/eval.yaml`, and `evals/LATEST.md` / `evals/matrix.json` refreshed to `0.2.0`.

---

## Dimension-by-Dimension Findings

### 1. Topology & Architectural Style
- **Status**: `Compliant`
- **Observed Style**: `Encapsulated Facade`
- **Analysis**:
  - Global system prompt footprint: Lean. Only `skills/plan-product/SKILL.md` (66 lines) is exposed as a public skill across Claude, Codex, Cursor, and Gemini.
  - Trigger collision & surface clutter: Zero sibling skill collision. The six domain sub-workflows (`product.md`, `concept.md`, `feature.md`, `use-case.md`, `roadmap.md`, `maintain.md`) reside under `skills/plan-product/workflows/` without YAML trigger frontmatter.
- **Remediation Steps**:
  - [x] None required; preserve the Encapsulated Facade topology.

### 2. Repository Layout & Canonical Directories
- **Status**: `Non-Compliant`
- **Enumerated Directory & Test Inventory**:
  - **Observed Top-Level Directories**: `.claude`, `.claude-plugin`, `.codex-plugin`, `.cursor-plugin`, `.git`, `.github`, `.plan-product`, `.temp`, `commands`, `docs`, `evals`, `node_modules`, `scripts`, `skills`, `test`
  - **Unignored Non-Canonical Top-Level Directories**: `.plan-product`
  - **Disguised Monorepo / Sub-Package Trees**: `None`
  - **Observed Immediate Subdirectories in `evals/`**: `scenarios`
  - **Flat / Uncategorized Scenario Folders in `evals/` Root**: `0 (None)`
  - **Co-Mingled Test Files Outside `test/`**: `None`
- **Top-Level Directories Check**:
  - Single plugin root invariant: `Pass`
  - Canonical top-level directories present (`skills/`, `test/`, `evals/`, `docs/`, `scripts/`, `commands/`, `.temp/`): `Pass`
  - Zero unignored extraneous top-level folders: `Fail` (`.plan-product/` is tracked at repository root instead of canonical `skills/plan-product/assets/` for bundled defaults and `./.nyssa-ai/plan-product/` for workspace state)
  - Zero loose scripts or non-canonical files in root: `Fail` (`CONCEPTS.md` is a loose root file with obsolete Model v1 `R-NNN` terminology)
  - Prohibited locations clean: `Pass`
  - Clean `evals/` hierarchy: `Pass`
- **Remediation Steps**:
  - [ ] Move bundled default `config.json`, `schema.json`, and `templates/*.md` into `skills/plan-product/assets/`.
  - [ ] Move project-scoped planning state from `.plan-product/` to `.nyssa-ai/plan-product/`, remove root `.plan-product/`, and update `scripts/init.mjs`, `scripts/migrate.mjs`, and `scripts/validate.mjs` to use `.nyssa-ai/plan-product/` for project state and `skills/plan-product/assets/` for bundled defaults.
  - [ ] Delete loose root `CONCEPTS.md` and update `skills/plan-product/workflows/product.md` and `README.md` to reference `docs/concepts/`.

### 3. Required Host Adapters
- **Status**: `Compliant`
- **Host Adapters Check**:
  - Host adapters directly at repository root: `Pass`
  - Claude adapter present and valid (`.claude-plugin/plugin.json`): `Pass`
  - Codex adapter present and valid (`.codex-plugin/plugin.json`): `Pass`
  - Cursor adapter present and valid (`.cursor-plugin/plugin.json`): `Pass`
  - Host adapters cleanly generated/assembled from canonical root source: `Pass`
- **Remediation Steps**:
  - [x] None required.

### 4. Package Organization & Manifest Conformance
- **Status**: `Needs Remediation`
- **Manifest Checks**:
  - Root `plugin.json` schema conformance and identity: `Pass`
  - Release artifact hygiene: `Needs Remediation` (`package.json` currently packs root `.plan-product/` instead of `skills/plan-product/assets/`)
- **Remediation Steps**:
  - [ ] Update `package.json` `files` array to remove `.plan-product/*` entries (relying on `skills/` to ship `skills/plan-product/assets/` while keeping `.nyssa-ai/` out of release tarballs).
  - [ ] Update `plugin.json` `description`, `keywords`, and `interface.defaultPrompt` to include `concepts` (`C-nn`) and `maintain` (`v1 -> v2`), then run `npm run assemble:write`.
  - [ ] Update `evals/scenarios/product-planning/prepare.mjs` to read `version` and `author.name` dynamically from `plugin.json` and omit `.plan-product` from copied plugin runtime paths.

### 5. Single Responsibility & Scope Directives
- **Status**: `Compliant`
- **Scope Directives Check**:
  - Top-of-file Scope Directives in all workflows (`workflows/*.md`) and commands (`commands/*.md`): `Present`
- **Remediation Steps**:
  - [x] None required.

### 6. Context Economics & Progressive Disclosure
- **Status**: `Compliant`
- **Metrics**:
  - `SKILL.md` line count: `66` lines (Limit: <500 lines)
  - Bulky domain schemas/tables offloaded to `skills/plan-product/assets/`: `Yes`
  - Exclusion of general programming knowledge: `Yes`
- **Remediation Steps**:
  - [x] None required.

### 7. Trigger Precision & Frontmatter Design
- **Status**: `Needs Remediation`
- **Frontmatter Checks**:
  - Third-person imperative phrasing (`"Use this skill when..."`): `Fail`
  - Quoted realistic user trigger phrases: `Needs Remediation` (missing quoted triggers for `concept` and `maintain`)
  - Explicit negative boundary conditions: `Present`
- **Remediation Steps**:
  - [ ] Update `skills/plan-product/SKILL.md` frontmatter `description` to begin with `"Use this skill when..."` and include quoted trigger phrases for all 6 workflows (`"define a domain concept"`, `"capture a macro-flow"`, `"upgrade planning docs"`, `"migrate model v1 to v2"`).

### 8. Deterministic Boundary
- **Status**: `Compliant`
- **Boundary Checks**:
  - Qualitative reasoning in markdown vs. code in `scripts/`: `Compliant`
  - Observable verification checklist in procedure instructions: `Present`
  - Parameter sanitization and actionable error diagnostics: `Compliant`
- **Remediation Steps**:
  - [x] None required.

### 9. Cognitive Mode Formatting & Authoring Style (Prose vs. Checklists)
- **Status**: `Compliant`
- **Format vs. Cognitive Mode Checks**:
  - Skills, workflows, and commands use structured directives, tables, and checklists: `Compliant`
- **Remediation Steps**:
  - [x] None required.

### 10. Evaluation Suite Quality & Rigor
- **Status**: `Needs Remediation`
- **Trigger Quality & Coverage**:
  - Positive triggers: `18` positive + `12` ambiguous across 6 workflows: `Pass`
  - Negative boundaries: `18` near-neighbor negative triggers across 6 workflows: `Pass`
- **Grader & Assertion Depth**:
  - **Eliminate Model v1 Evals & Enforce Model v2 Exclusively**: `Needs Remediation`
    - All 8 existing content scenarios in `evals/scenarios/product-planning/cases.json` and 4 routing prompts (`pos-csv-export`, `pos-password-reset`, `pos-checkout-flow`, `pos-add-slice`) still reference legacy Model v1 (`version: 1`, `.plan-product/`, `F-Nxx`, `UC-nnn`, `R-NNN`).
    - All non-migration routing and content scenarios must be upgraded to Model v2 (`version: 2`, `.nyssa-ai/plan-product/config.json`, `C-nn`, `F-gg.nn`, `UC-gg.nn.uu`, `R-pp.ss`), and `baseline.json` must be re-baselined to the v2 decision scenarios.
    - Add 2 new v2 content scenarios covering `workflows/concept.md` (`concept-macro-flow-artifact`) and `workflows/maintain.md` (`maintain-v1-migration-conflict`).
  - **Waza Trigger Suite (`evals/waza/skills/plan-product/eval.yaml`)**: `Missing`
- **Matrix & Verification Receipts**:
  - Cross-host matrix declared (`evals/matrix.json`): `Stale` (`0.1.0`)
  - Release receipts (`evals/LATEST.md` & `evals/scenarios/product-planning/README.md`): `Stale` (`0.1.0`)
- **Remediation Steps**:
  - [ ] Upgrade all 8 existing content scenarios and all v1 routing prompts in `evals/scenarios/product-planning/cases.json` to Model v2 and `.nyssa-ai/plan-product/`.
  - [ ] Add `concept-macro-flow-artifact` and `maintain-v1-migration-conflict` content scenarios to `cases.json` (bringing total to 10 content scenarios) and update `baseline.json` hashes.
  - [ ] Create `evals/waza/skills/plan-product/eval.yaml` covering positive and negative triggers for `plan-product`.
  - [ ] Update `evals/matrix.json`, `evals/LATEST.md`, and `evals/scenarios/product-planning/README.md` to `0.2.0`.

---

## Prioritized Remediation Roadmap

1. **Phase 1: Canonical Asset & NyssaAI State Relocation (`.nyssa-ai/plan-product/` & `skills/plan-product/assets/`)**
   - [ ] Move default `config.json`, `schema.json`, and `templates/*.md` into `skills/plan-product/assets/` with `.nyssa-ai/plan-product/` default paths.
   - [ ] Move repository planning config/state from `.plan-product/` to `.nyssa-ai/plan-product/`, delete root `.plan-product/`, and delete root `CONCEPTS.md`.
   - [ ] Update `scripts/init.mjs`, `scripts/migrate.mjs`, and `scripts/validate.mjs` to source bundled assets from `skills/plan-product/assets/`, write project state to `.nyssa-ai/plan-product/`, and migrate legacy `.plan-product/` to `.nyssa-ai/plan-product/`.
   - [ ] Update `package.json` `files` array so `skills/plan-product/assets/` is packaged and neither `.plan-product/` nor `.nyssa-ai/` is included in release tarballs.
2. **Phase 2: Strict Model v2 Contract, Prompts, Docs & Manifests**
   - [ ] Update `skills/plan-product/SKILL.md`, all 6 `workflows/*.md`, all 6 `commands/*.md`, `AGENTS.md`, `CLAUDE.md`, `README.md`, and `docs/**` to reference `.nyssa-ai/plan-product/config.json` and enforce strict Model v2 conflict alerting.
   - [ ] Update `skills/plan-product/SKILL.md` frontmatter `description` to start with `"Use this skill when..."` and include quoted triggers for `concept` and `maintain`.
   - [ ] Update `plugin.json` metadata for v0.2.0 and run `npm run assemble:write`.
3. **Phase 3: Model v2-Only Evals, Waza Suite, Tests & Release Receipts**
   - [ ] Upgrade all routing and content scenarios in `evals/scenarios/product-planning/cases.json` to Model v2 + `.nyssa-ai/plan-product/`, add `concept` and `maintain` content scenarios, and update `baseline.json` and `prepare.mjs`.
   - [ ] Create `evals/waza/skills/plan-product/eval.yaml`.
   - [ ] Update `test/init.test.mjs` and `test/planning-contract.test.mjs` for `.nyssa-ai/plan-product/`, `skills/plan-product/assets/`, and the v2 eval suite.
   - [ ] Refresh `evals/matrix.json`, `evals/LATEST.md`, and `evals/scenarios/product-planning/README.md` to `0.2.0` and verify `npm run validate`, `npm run assemble`, `npm test`, `npm run eval:prepare`, and `npm pack --dry-run`.
