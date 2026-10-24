# Plugin Architectural Review & Refinement Plan: `plan-product`

> [!IMPORTANT] Scope Directive
> This document records an independent architectural evaluation and refinement plan for `plan-product`. It covers the current working tree against the plugin-builder architecture, packaging, authoring, and evaluation standards; it does not change plugin implementation or release state.

**Evaluation Date**: 2026-10-24
**Evaluator**: `plugin-builder` architectural review workflow
**Scope**: Current working tree (including pre-existing uncommitted work)
**Current Version**: 0.2.0
**Plugin Archetype**: Hybrid Code (one public planning skill with deterministic initializer, migrator, assembly, and validation scripts)
**Current Architectural Style**: Encapsulated Facade

---

## Executive Summary

`plan-product` is correctly shaped as an Encapsulated Facade. It exposes one public `plan-product` skill, keeps the six domain-specific planning operations as internal workflows, and pairs the qualitative runbooks with deterministic Node.js scripts for initialization, migration, path validation, host assembly, and scenario materialization. This keeps the root prompt surface small and prevents six closely related planning concepts from competing for activation.

The source package is structurally healthy: canonical directories are clean, three required host adapters are in sync, the release tarball excludes development material, all 16 contract tests pass, and the plugin's own validator passes. The audit found no nested packages, no flat scenario folders, no co-mingled automated tests, and no package leaks.

Two items need follow-up before calling the package independently certified. First, no completed native/multi-host behavioral evidence is stored for this version, despite a high-quality scenario suite and a current local-gate receipt. Second, the frontmatter's prohibition on editing repository files is broader than the plugin's intended document-writing behavior. The cross-plugin validator also misreads literal path-pattern examples and template placeholders as broken links; this is a validator compatibility issue, not evidence of broken target links, because `npm run validate` succeeds. The facade verification-heading mismatch was resolved after this audit by standardizing on `## Verification` and updating the repository validator accordingly.

---

## Dimension-by-Dimension Findings

### 1. Topology & Architectural Style

- **Status**: Compliant
- **Observed Style**: Encapsulated Facade
- **Analysis**:
  - `plugin.json` declares only `skills/plan-product`; `SKILL.md` dispatches to six private workflow files with no YAML frontmatter.
  - The single public description keeps global prompt footprint lean and avoids trigger collisions among product, concept, feature, use-case, roadmap, and maintenance operations.
  - Direct commands are thin host entrypoints that load the facade rather than creating competing public skills.
- **Remediation Steps**:
  - [ ] No topology migration is required. Preserve the single public facade as new planning operations are added.

### 2. Repository Layout & Canonical Directories

- **Status**: Compliant
- **Enumerated Directory & Test Inventory**:
  - **Observed Top-Level Directories**: `.claude`, `.claude-plugin`, `.codex-plugin`, `.cursor-plugin`, `.git`, `.github`, `.nyssa-ai`, `.temp`, `commands`, `docs`, `evals`, `node_modules`, `scripts`, `skills`, `test`.
  - **Ignored Workspace Directories**: `.claude`, `.nyssa-ai`, `.temp`, and `node_modules` are ignored; `.git` is intrinsic VCS metadata. None is an unignored non-canonical plugin directory.
  - **Unignored Non-Canonical Top-Level Directories**: None.
  - **Disguised Monorepo / Sub-Package Trees**: None. No nested `plugins/`, `packages/`, `standards/`, or `modules/` directory was found outside ignored scratch/dependency trees.
  - **Observed Immediate Subdirectories in `evals/`**: `scenarios`, `waza`.
  - **Flat / Uncategorized Scenario Folders in `evals/` Root**: 0. Benchmark material is grouped in `evals/scenarios/product-planning/`.
  - **Co-Mingled Test Files Outside `test/`**: None. Automated test files are `test/init.test.mjs` and `test/planning-contract.test.mjs`.
- **Top-Level Directories Check**:
  - Single plugin root invariant: Pass.
  - Applicable canonical directories (`skills/`, `test/`, `evals/`, `docs/`, `scripts/`, `commands/`, `.temp/`): Pass. A `src/` directory is not required because deterministic helpers are repository lifecycle scripts rather than a separately exported runtime library.
  - Zero unignored extraneous top-level folders: Pass.
  - Zero loose root scripts: Pass.
  - Prohibited locations clean: Pass.
  - Clean `evals/` hierarchy: Pass.
- **Remediation Steps**:
  - [ ] Keep future benchmark groups under `evals/scenarios/` or `evals/suites/`; do not add flat directories to `evals/`.

### 3. Required Host Adapters

- **Status**: Compliant
- **Host Adapters Check**:
  - Host adapters directly at repository root: Pass.
  - Claude adapter (`.claude-plugin/plugin.json`): Pass.
  - Codex adapter (`.codex-plugin/plugin.json`): Pass.
  - Cursor adapter (`.cursor-plugin/plugin.json`): Pass.
  - Host adapters assembled from root source rather than drifted: Pass (`npm run assemble` reports host assemblies in sync).
- **Remediation Steps**:
  - [ ] Continue changing canonical `plugin.json` and run `npm run assemble` before release; do not edit adapter manifests independently.

### 4. Package Organization & Manifest Conformance

- **Status**: Compliant
- **Manifest Checks**:
  - Root `plugin.json` declares identity, version, the sole facade skill, and command entrypoints: Pass.
  - Release artifact hygiene: Pass. `npm pack --dry-run` reports 39 runtime files (143.1 kB unpacked) and excludes `evals/`, `docs/`, `test/`, `.nyssa-ai/`, and `.temp/`.
  - Canonical source remains root `plugin.json` plus `skills/plan-product/`: Pass.
- **Remediation Steps**:
  - [ ] Retain the package allowlist in `package.json`; re-run package hygiene after adding any new runtime asset.

### 5. Single Responsibility & Scope Directives

- **Status**: Compliant
- **Scope Directives Check**:
  - Top-of-file Scope Directives in rules: N/A; no skill-scoped or root `rules/` directory exists.
  - Top-of-file Scope Directives in workflows: Present in all six internal workflows (`concept`, `feature`, `maintain`, `product`, `roadmap`, and `use-case`).
  - Top-of-file Scope Directives in references: N/A; no `references/` directory exists in this compact facade.
  - The facade and every direct command also declare an explicit scope directive.
- **Responsibility Overlap**:
  - Each workflow owns a distinct document lifecycle. The `maintain` workflow owns v1-to-v2 conflict resolution, preventing other workflows from operating across two models.
  - Shared durable data shape belongs in the bundled schema and templates rather than being copied across workflows.
- **Remediation Steps**:
  - [ ] Preserve this separation; any future shared explanatory manual should be a single `references/` authority rather than duplicated workflow prose.

### 6. Context Economics & Progressive Disclosure

- **Status**: Compliant
- **Metrics**:
  - `skills/plan-product/SKILL.md` line count: 66 (limit: fewer than 500).
  - Bulky reusable schemas and templates are offloaded to `skills/plan-product/assets/`: Yes.
  - Detailed procedural material is loaded only after facade triage through `workflows/`: Yes.
  - General programming or model-training knowledge is omitted: Yes.
- **Remediation Steps**:
  - [ ] Keep new cross-cutting contracts in `assets/` or a narrowly scoped `references/` document instead of expanding the facade runbook.

### 7. Trigger Precision & Frontmatter Design

- **Status**: Needs Remediation
- **Frontmatter Checks**:
  - Third-person imperative phrasing (`Use this skill when ...`): Pass.
  - Quoted realistic user trigger phrases: Pass; it covers product definition, concepts, features, use cases, roadmaps, and migration.
  - Explicit negative boundary conditions: Present, but one phrase is over-broad.
- **Finding**:
  - The description says not to use the skill for “editing repository files directly,” although the intended operation writes planning documents into a target repository. A router can reasonably interpret that as excluding valid product-document update requests.
- **Remediation Steps**:
  - [ ] Replace that phrase with a narrower boundary such as: “Do NOT use this skill for implementing application source code, editing non-planning repository files, or executing engineering delivery work.”

### 8. Deterministic Boundary

- **Status**: Needs Remediation
- **Boundary Checks**:
  - Qualitative reasoning is kept in Markdown; deterministic initialization, path handling, migration, assembly, and structural validation live in `scripts/`: Compliant.
  - Parameter safety and diagnostics: Compliant. Contract tests cover invalid configuration, path escapes, junction redirection, traversal, and output collisions; all 16 tests pass.
  - Observable verification checklists: Present in all six workflows and in the facade's `## Execution Checklist`.
- **Finding**:
  - Resolved: `SKILL.md` now uses the exact `## Verification` heading, and the repository validator checks that same canonical heading.
  - Remaining: the independent plugin-builder validator reports 22 false broken-link findings where literal path patterns (for example, `features/f-gg.nn/feature.md`) and `<path>` placeholders are prose/template data, not links. The target's own `npm run validate` passes its structural and link checks.
- **Remediation Steps**:
  - [x] Rename the facade section as `## Verification` while retaining the current checklist contents.
  - [ ] Update the cross-plugin validator to ignore inline-code path patterns and template placeholders, or document an intentional compatibility exception until that validator is fixed.

### 9. Cognitive Mode Formatting & Authoring Style (Prose vs. Checklists)

- **Status**: Compliant
- **Format vs. Cognitive Mode Checks**:
  - Subagent instructions: N/A; this facade does not use private subagents.
  - Rules and execution gates: Compliant. The facade, workflows, and commands use numbered steps, tables, explicit stop conditions, and verification checklists.
  - Skills and runbooks: Compliant. The 66-line facade is a concise triage and invariant layer; internal workflows carry progressive operational detail.
  - References: N/A; no reference directory is needed for the current scope.
- **Remediation Steps**:
  - [ ] Maintain structured execution and verification sections if workflows grow; reserve prose for domain judgment and user-facing explanations.

### 10. Evaluation Suite Quality & Rigor

- **Status**: Needs Remediation
- **Trigger Quality & Coverage**:
  - Fast Waza suite: 6 positive and 6 near-neighbor negative prompts, covering all six workflows and adjacent engineering, test, debugging, browser, database, and deployment requests. This exceeds the 3–5 per-polarity target and avoids trivial negatives.
  - Natural activation suite: 48 routing cases (18 positive, 12 ambiguous, 18 negative).
  - Content suite: 10 weighted, outcome-focused scenarios; each rubric totals 100 and five scenarios include local directory fixtures.
- **Grader & Assertion Depth**:
  - Rigorous. Content criteria verify concrete paths, preservation, ownership boundaries, stable identifiers, reference repair, migration behavior, and reciprocal links rather than a superficial success message.
- **Matrix & Verification Receipts**:
  - Cross-host matrix (`evals/matrix.json`): Present for Claude, Codex, Cursor, and Gemini.
  - Local receipt (`evals/LATEST.md`): Current as of 2026-10-24 and accurately describes local-gate status.
  - Native/multi-host result evidence: Missing. There is no `evals/results/` or `evals/evidence/results/` receipt, and `baseline.json` explicitly records that hosted comparison has not been measured.
- **Remediation Steps**:
  - [ ] Run natural-activation evaluation before scored content evaluation with the same selected agent/model, then record run IDs, activation observations, scores, and artifacts in a committed evidence receipt.
  - [ ] Update `evals/LATEST.md` only with actual native-host evidence; retain the explicit local-only status until then.

---

## Validation Evidence

- `python .../plugin-builder/scripts/validate.py .`: The verification-heading finding is resolved; the validator still reports 22 literal-pattern/template false positives and no package-layout failure.
- `npm run validate`: Passes structural, host-assembly, scope-directive, filesystem, and concept-link validation.
- `npm test`: Passes all 16 initialization, contract, package, scenario, and validation tests.
- `npm run assemble`: Passes; all host assemblies are in sync.
- `npm pack --dry-run`: Passes with no development-material leaks.

## Prioritized Remediation Roadmap

1. **Phase 1: Verification compatibility and trigger clarity**
   - [x] Make the facade's verification heading conform to the shared validator.
   - [ ] Narrow the over-broad “editing repository files directly” negative boundary.
   - [ ] Fix or exempt literal template/path patterns in the cross-plugin link validator.
2. **Phase 2: Behavioral evidence**
   - [ ] Execute the prepared routing activation run, followed by the baseline-versus-context content run, using one agent/model for an initial comparison.
   - [ ] Commit immutable results/receipts and update the local-only evaluation status with observed evidence.
3. **Phase 3: Preserve the current architecture**
   - [ ] Keep the single facade, internal workflow decomposition, deterministic scripts, host-assembly checks, and grouped evaluation layout intact.
