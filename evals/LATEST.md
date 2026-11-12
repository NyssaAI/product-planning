# Evaluation Receipts: `plan-product`

> [!IMPORTANT] Scope Directive
> Records canonical verification receipts, execution status, and evaluation evidence for `plan-product` release readiness across supported hosts.

**Last Verified**: 2026-11-12  
**Version**: 0.12.7  
**Topology**: Encapsulated Facade (`skills/plan-product` + internal workflows + Scale A `src/`)  
**Status**: Passing (Local Verification Gate & CI Pipeline)  

---

## Verification Summary

| Gate | Target | Status | Details |
| :--- | :--- | :--- | :--- |
| **Structural & Link Validator** | `src/validation/validate.mjs` | **PASS** | Scope Directives, link integrity, `docs/` lockdown, `codegraph.db`, test layout |
| **Host Assembly Sync** | `scripts/assemble.mjs` | **PASS** | `harness-adapter` parity verified across Claude, Codex, Cursor, Tessl, and Gemini |
| **Unit & Use-Case Tests** | `test/unit/` & `test/use_case/` | **PASS** | Passing via native Node.js test runner |
| **Scenario Preparation** | `evals/scenarios/product-planning/` | **PASS** | Validated 48 routing cases (with near-neighbor negatives) and 14 Model v2 content cases |
| **Waza Trigger Suite** | `evals/waza/skills/plan-product/` | **PASS** | Fast local trigger suite with positive and negative cases |
| **Package Hygiene** | `npm pack --dry-run` | **PASS** | 0 leaks of `evals/`, `docs/`, `test/`, `.nyssa-ai/`, or `.temp/` |
| **Multi-Host Adapters** | `.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `.tessl-plugin/`, `gemini-extension.json` | **PASS** | Synchronized with canonical root `plugin.json` |

---

## Scenario Inventory

### Natural Activation Cases (48)
Each of the six encapsulated workflows (`product`, `concept`, `feature`, `use-case`, `development-plan`, `maintain`) declares 8 test cases:
- **3 positive triggers**: Distinct, realistic user prompts covering greenfield setup, refresh, and deep specification.
- **2 ambiguous triggers**: Boundary and scope exploration prompts.
- **3 near-neighbor negative triggers**: Challenging near-neighbor developer requests testing sharp boundaries against adjacent disciplines:
  - Backend API coding and route implementation
  - Software unit testing and test runner scripts
  - Bug diagnosis and error fixing
  - Code refactoring and middleware updates
  - E2E browser automation (Cypress)
  - UI mockup design (Figma)
  - Database schema migrations (SQL / Knex)
  - Sprint backlog management and poker estimation
  - CI/CD container deployments and release tagging
  - React state machine implementations
  - DDL foreign key constraints

### Content Scenarios (14)
- `preserve-custom-product`: Custom path resolution and merge-by-heading preservation.
- `duplicate-use-case-boundary`: Uniqueness and cross-use-case contradiction checks.
- `configured-use-case-discovery`: Custom naming and existing workflow detection.
- `development-plan-removal-verification-links`: Incoming `Verify: with DP-pp.ss` reference checks on step removal.
- `maintain-v1-migration-conflict`: Immediate v1 conflict detection (Zero Dual v1/v2 Operation) and upgrade routing.
- `product-update-artifact`: Custom-path document edit preserving existing sections and `Local notes`.
- `product-inventory-non-technical-artifact`: `F-00.01` / `F-01.01` group banding, link-free checklist summary, stubbed feature guides, and stripping leaked tech stack details to `docs/tech-stack.md`.
- `feature-boundary-artifact`: Capability boundary specification in non-technical user-outcome language with concrete inputs/outputs.
- `use-case-artifact`: Actor workflow ASCII process tree with error branches, `Consistency Check`, and parent link.
- `concept-macro-flow-artifact`: Cross-feature macro-flow (`kind: flow`) specification with bi-directional link synchronization.
- `concept-domain-model-artifact`: Sequential domain model (`C-02`, `kind: domain-model`) specification with entity invariants and multi-feature bi-directional links.
- `development-plan-reference-artifact`: Model v2 enriched step schema (`Rationale:`, `Concepts:`, `Gotchas:`, `Verify:`), `Verify: with` repair, clean CodeGraph omission when `docs/code-map/codegraph.db` is absent, and `dev-delivery` handoff.
- `development-plan-codegraph-anchors-artifact`: Conditional `docs/code-map/codegraph.db` AST `Anchors:`, Planning vs. Implementation boundary (rejecting code/DDL in `docs/plans/development-plan.md`), and `dev-delivery` handoff with `codegraph_explore` symbol.
- `maintain-v1-migration-artifact`: End-to-end execution of v1-to-v2 repository migration (`.plan-product` $\rightarrow$ `.nyssa-ai/plan-product`, `docs/GLOSSARY.md`, `F-101` $\rightarrow$ `F-01.01`, `UC-001` $\rightarrow$ `UC-01.01.01`, `docs/roadmap.md` `R-001` $\rightarrow$ `docs/plans/development-plan.md` `DP-01.01`).
