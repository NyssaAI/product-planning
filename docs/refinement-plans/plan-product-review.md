# Plugin Architectural Review & Refinement Plan: `plan-product`

> [!IMPORTANT] Scope Directive
> This document records the architectural evaluation and remediation status for `plan-product`. It tracks compliance across canonical plugin authoring standards, filesystem roles, manifest specifications, and evaluation rigor.

**Evaluation Date**: `2026-10-20`  
**Evaluator**: `plugin-builder`  
**Current Version**: `0.1.0`  
**Plugin Archetype**: `Hybrid Code` (Markdown Skills + Node.js Initializer / Path Engine)  
**Current Architectural Style**: `Encapsulated Facade` (Single `plan-product` facade skill + internal workflows + direct slash commands)  

---

## Executive Summary

`plan-product` has been refactored into a canonical **Encapsulated Facade** with direct slash command shortcuts. The single public skill `plan-product` coordinates product planning lifecycles and dispatches to four encapsulated runbooks under `skills/plan-product/workflows/` (`product.md`, `feature.md`, `use-case.md`, `roadmap.md`), while four slash commands in `commands/` provide direct entrypoints for power users.

All 10 dimensions have been remediated:
1. **Topology & Style**: Migrated from Public Suite to Encapsulated Facade (Option 3), cutting global prompt startup footprint by ~75% while preserving direct command entrypoints.
2. **Repository Layout**: Eliminated non-canonical `.codex/` (moved to `.codex-plugin/INSTALL.md`); restructured flat evals into canonical `evals/scenarios/product-planning/` satisfying the immediate-child whitelist; verified zero test co-mingling.
3. **Host Adapters**: Created `scripts/assemble.mjs` to deterministically compile and verify `.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, and `gemini-extension.json`.
4. **Manifests**: Created canonical root `plugin.json` with declared capabilities, skills, and commands.
5. **Scope Directives**: Added top-of-file `> [!IMPORTANT] Scope Directive` alert blocks to `SKILL.md`, `workflows/*.md`, and `commands/*.md`.
6. **Context Economics**: All workflow runbooks strictly under 250 lines with externalized template assets.
7. **Trigger Precision**: Added quoted realistic user prompt phrases and explicit negative boundary exclusions in `plan-product` frontmatter.
8. **Deterministic Boundary**: Added explicit procedural verification checklists (`- [ ]`) to all workflows.
9. **Cognitive Mode Formatting**: Structured directives and checklists enforce execution gates.
10. **Evaluation Suite**: Created `evals/matrix.json` and `evals/LATEST.md` recording release receipts; updated scenario preparation and contract tests.

---

## Dimension-by-Dimension Findings

### 1. Topology & Architectural Style
- **Status**: `Compliant`
- **Observed Style**: `Encapsulated Facade`
- **Analysis**:
  - Global system prompt footprint reduced from ~1,500 chars down to ~350 chars (~90 tokens) at session start.
  - Natural language trigger collisions eliminated at root level.
  - Power users retain direct command shortcuts via `commands/plan-product.md`, `commands/plan-feature.md`, `commands/plan-use-case.md`, and `commands/plan-roadmap.md`.
- **Remediation**: Completed.

### 2. Repository Layout & Canonical Directories
- **Status**: `Compliant`
- **Enumerated Directory & Test Inventory**:
  - **Observed Top-Level Directories**: `.claude`, `.claude-plugin`, `.codex-plugin`, `.cursor-plugin`, `.git`, `.github`, `.plan-product`, `.temp`, `commands`, `docs`, `evals`, `node_modules`, `scripts`, `skills`, `test`
  - **Unignored Non-Canonical Top-Level Directories**: None (`.codex` removed; `.plan-product` retained for target-repo scaffolding assets)
  - **Disguised Monorepo / Sub-Package Trees**: None
  - **Observed Immediate Subdirectories in `evals/`**: `scenarios` (matches allowed whitelist: `suites/`, `evidence/`, `reports/`, `waza/`, `scenarios/`, `results/`, `attempts/`, `tessl/`)
  - **Flat / Uncategorized Scenario Folders in `evals/` Root**: 0 (grouped under `evals/scenarios/product-planning/`)
  - **Co-Mingled Test Files Outside `test/`**: None
- **Remediation**: Completed.

### 3. Required Host Adapters
- **Status**: `Compliant`
- **Host Adapters Check**:
  - Host adapters directly at repository root: `Pass` (`.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `gemini-extension.json`)
  - Automated assembly & validation: `Pass` (`scripts/assemble.mjs` verifies and synchronizes manifests with root `plugin.json`)
- **Remediation**: Completed.

### 4. Package Organization & Manifest Conformance
- **Status**: `Compliant`
- **Manifest Checks**:
  - Root `plugin.json`: `Pass` (Conforms to plugin specifications; declares `skills/plan-product` and matching commands)
  - Release artifact hygiene: `Pass` (`npm pack --dry-run` confirms zero leakage of `evals/`, `docs/`, `test/`, or `.temp/`)
- **Remediation**: Completed.

### 5. Single Responsibility & Scope Directives
- **Status**: `Compliant`
- **Scope Directives Check**:
  - `skills/plan-product/SKILL.md`: `Present`
  - `skills/plan-product/workflows/*.md`: `Present` across all 4 workflows
  - `commands/*.md`: `Present` across all 4 commands
- **Remediation**: Completed.

### 6. Context Economics & Progressive Disclosure
- **Status**: `Compliant`
- **Metrics**:
  - `skills/plan-product/SKILL.md`: 58 lines (<500 lines limit) — `Pass`
  - `skills/plan-product/workflows/product.md`: 152 lines — `Pass`
  - `skills/plan-product/workflows/feature.md`: 78 lines — `Pass`
  - `skills/plan-product/workflows/use-case.md`: 75 lines — `Pass`
  - `skills/plan-product/workflows/roadmap.md`: 92 lines — `Pass`
  - Templates and schemas externalized in `.plan-product/` and read on demand.
- **Remediation**: Completed.

### 7. Trigger Precision & Frontmatter Design
- **Status**: `Compliant`
- **Frontmatter Checks**:
  - Third-person imperative phrasing: `Pass`
  - Quoted realistic trigger phrases: `Pass` (`"plan this product"`, `"define product docs"`, `"plan a feature"`, `"create feature guide"`, `"document a use case"`, `"sequence roadmap"`, `"order delivery slices"`)
  - Explicit negative boundaries: `Pass` (`"Do NOT use this skill for implementing source code, editing repository files directly, or executing engineering delivery work."`)
- **Remediation**: Completed.

### 8. Deterministic Boundary
- **Status**: `Compliant`
- **Boundary Checks**:
  - Qualitative planning in markdown vs. code in `scripts/`: `Pass`
  - Observable verification checklists (`- [ ]`) in procedure instructions: `Pass`
- **Remediation**: Completed.

### 9. Cognitive Mode Formatting & Authoring Style (Prose vs. Checklists)
- **Status**: `Compliant`
- **Format vs. Cognitive Mode Checks**:
  - Operating rules formatted as bulleted directives.
  - Triage Matrix clearly routes intents.
  - Procedural execution gates formatted as `- [ ]` checklists.
- **Remediation**: Completed.

### 10. Evaluation Suite Quality & Rigor
- **Status**: `Compliant`
- **Suite Checks**:
  - Immediate `evals/` child: `evals/scenarios/` (`Pass`)
  - Cross-host matrix declared: `evals/matrix.json` (`Pass`)
  - Release receipts verified: `evals/LATEST.md` (`Pass`)
  - Preparation and contract tests: `13/13 Pass`
- **Remediation**: Completed.

---

## Remediation Checklist Summary

- [x] Phase 1: Reorganize topology into Encapsulated Facade with Direct Commands.
- [x] Phase 2: Relocate `.codex/` and clean up root layout.
- [x] Phase 3: Move `evals/` scenarios under `evals/scenarios/` and add `matrix.json` + `LATEST.md`.
- [x] Phase 4: Create canonical root `plugin.json` and `scripts/assemble.mjs`.
- [x] Phase 5: Add `> [!IMPORTANT] Scope Directive` alert blocks to all runbooks and commands.
- [x] Phase 6: Refactor verification gates into structured `- [ ]` checklists.
- [x] Phase 7: Update contract tests (`test/planning-contract.test.mjs`) and verify `npm test`, `npm run assemble`, `npm run eval:prepare`, `npm pack --dry-run`.
