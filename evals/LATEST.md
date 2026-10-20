# Evaluation Receipts: `plan-product`

> [!IMPORTANT] Scope Directive
> Records canonical verification receipts, execution status, and evaluation evidence for `plan-product` release readiness across supported hosts.

**Last Verified**: 2026-10-20  
**Version**: 0.1.0  
**Topology**: Encapsulated Facade (`skills/plan-product` + internal workflows)  
**Status**: Passing (Local Verification Gate & CI Pipeline)  

---

## Verification Summary

| Gate | Target | Status | Details |
| :--- | :--- | :--- | :--- |
| **Structural & Link Validator** | `scripts/validate.mjs` | **PASS** | Scope Directives, link integrity, layout whitelist, test isolation |
| **Host Assembly Sync** | `scripts/assemble.mjs` | **PASS** | Parity verified across Claude, Codex, Cursor, and Gemini |
| **Unit & Contract Tests** | `test/*.test.mjs` | **PASS** | 13/13 passing via native Node.js test runner |
| **Scenario Preparation** | `evals/scenarios/product-planning/` | **PASS** | Validated 32 routing cases (with near-neighbor negatives) and 8 content cases |
| **Package Hygiene** | `npm pack --dry-run` | **PASS** | 0 leaks of `evals/`, `docs/`, `test/`, or `.temp/` |
| **Multi-Host Adapters** | `.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `gemini-extension.json` | **PASS** | Synchronized with canonical root `plugin.json` |

---

## Scenario Inventory

### Natural Activation Cases (32)
Each of the four encapsulated workflows (`product`, `feature`, `use-case`, `roadmap`) declares 8 test cases:
- **3 positive triggers**: Distinct, realistic user prompts covering greenfield setup, brownfield refresh, and deep specification.
- **2 ambiguous triggers**: Boundary and scope exploration prompts.
- **3 near-neighbor negative triggers**: Challenging near-neighbor developer requests testing sharp boundaries against adjacent disciplines:
  - Backend API coding and route implementation
  - Software unit testing and test runner scripts
  - Bug diagnosis and error fixing
  - Code refactoring and middleware updates
  - E2E browser automation (Cypress)
  - UI mockup design (Figma)
  - Database schema migrations (SQL)
  - Sprint backlog management and poker estimation
  - CI/CD container deployments and release tagging

### Content Scenarios (8)
- `preserve-custom-product`: Custom path resolution and merge-by-heading preservation.
- `duplicate-use-case-boundary`: Uniqueness and cross-use-case contradiction checks.
- `configured-use-case-discovery`: Custom naming and existing workflow detection.
- `roadmap-removal-verification-links`: Incoming verification reference checks on slice removal.
- `product-update-artifact`: Document edit preserving existing sections.
- `feature-boundary-artifact`: Capability boundary specification with concrete inputs/outputs.
- `use-case-artifact`: Actor workflow process tree with error branches.
- `roadmap-reference-artifact`: Work slicing with `- Verify:` stopping points and dependencies.
