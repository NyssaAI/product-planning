# Product planning evaluations

Six encapsulated planning workflows each declare three positive, two ambiguous, and three near-neighbor negative routing requests: **48 natural activation cases**. Negative cases test sharp boundaries against adjacent developer tasks: software coding, bug fixes, refactoring, unit tests, E2E browser tests, UI mockups, database migrations, CI deployments, release tagging, sprint estimation, and state machines. Observe the workflow selected; do not treat forced-context scores as routing evidence.

The **14 Model v2 content scenarios** (5 decision/reconciliation cases + 9 fixture-backed artifact cases) cover preserved decisions, non-technical language boundaries, domain concepts (`kind: flow` and `kind: domain-model`), enriched development plan sequencing (`docs/plans/development-plan.md` with `DP-pp.ss`, with and without `docs/code-map/codegraph.db`), and v1-to-v2 migration:

| Scenario | Kind | Model v2 Evidence |
| --- | --- | --- |
| `preserve-custom-product` | Decision | Configured paths and templates, section-level merge preservation, skipped answers |
| `duplicate-use-case-boundary` | Decision | Semantic duplication (`UC-01.04.02`), feature ownership (`F-01.04` vs. `F-01.07`), focused clarification |
| `configured-use-case-discovery` | Decision | Custom `useCaseFilePattern` discovery and flow-meaning identity reconciliation |
| `development-plan-removal-verification-links` | Decision | Incoming `Verify: with DP-pp.ss` references and preserved acceptance obligations |
| `maintain-v1-migration-conflict` | Decision | Zero Dual v1/v2 Operation conflict alert and deterministic upgrade routing |
| `product-update-artifact` | Artifact | Custom-path `planning/vision.md` edit with content and `Local notes` preservation |
| `product-inventory-non-technical-artifact` | Artifact | `F-00.01` / `F-01.01` group banding, link-free checklist summary, stubbed guides, and stripping leaked tech stack details to `docs/tech-stack.md` |
| `feature-boundary-artifact` | Artifact | Feature guide (`F-01.01`) in non-technical user-outcome language with explicit boundaries and preserved `Local notes` |
| `use-case-artifact` | Artifact | Actor workflow (`UC-01.01.01`) with ASCII process tree, failures, unknowns, `Consistency Check`, and parent linkage |
| `concept-macro-flow-artifact` | Artifact | Domain macro-flow (`C-01`, `kind: flow`) with bi-directional links between `product.md` and `feature.md` |
| `concept-domain-model-artifact` | Artifact | Sequential domain model (`C-02`, `kind: domain-model`) with entity invariants and multi-feature bi-directional links |
| `development-plan-reference-artifact` | Artifact | Enriched v2 step schema (`Rationale:`, `Concepts:`, `Gotchas:`, `Verify:`), `Verify: with` repair, clean CodeGraph omission when `docs/code-map/codegraph.db` is absent, and `dev-delivery` handoff |
| `development-plan-codegraph-anchors-artifact` | Artifact | Conditional `docs/code-map/codegraph.db` AST `Anchors:`, Planning vs. Implementation boundary (rejecting code/DDL in `docs/plans/development-plan.md`), and `dev-delivery` handoff with `codegraph_explore` symbol |
| `maintain-v1-migration-artifact` | Artifact | End-to-end execution of v1-to-v2 repository migration (`.plan-product` $\rightarrow$ `.nyssa-ai/plan-product`, `docs/GLOSSARY.md`, `F-101` $\rightarrow$ `F-01.01`, `UC-001` $\rightarrow$ `UC-01.01.01`, `docs/roadmap.md` `R-001` $\rightarrow$ `docs/plans/development-plan.md` `DP-01.01`) |

Each content rubric totals 100. Criteria judge outcomes rather than exact wording. Document scenarios include all required local configuration, templates, and prior documents; they require no secrets, external repositories, or setup downloads. The tasks supply confirmed user decisions so an unattended evaluation can produce artifacts without inventing interview answers.

## Local checks

```text
npm test
npm run eval:prepare
node evals/scenarios/product-planning/prepare.mjs . <new-temporary-directory>
```

Preparation requires a new output directory, copies the plugin into a private temporary evaluation adapter, and materializes routing and content scenarios with declared fixtures. Local checks validate workflow coverage, criteria totals, fixture safety, package contents, and unchanged retained criteria.

`baseline.json` records `modelVersion: 2`, the source commit, and the SHA-256 hashes of all 14 Model v2 content scenarios (both the 5 decision/reconciliation scenarios and the 9 fixture-backed artifact scenarios) so rubrics, weights, and fixtures cannot drift silently.
