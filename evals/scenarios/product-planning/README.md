# Product planning evaluations

Six encapsulated planning workflows each declare three positive, two ambiguous, and three near-neighbor negative routing requests: **48 natural activation cases**. Negative cases test sharp boundaries against adjacent developer tasks: software coding, bug fixes, refactoring, unit tests, E2E browser tests, UI mockups, database migrations, CI deployments, release tagging, sprint estimation, and state machines. Observe the workflow selected; do not treat forced-context scores as routing evidence.

The **14 Model v2 content scenarios** (5 decision/reconciliation cases + 9 fixture-backed artifact cases) cover preserved decisions, non-technical language boundaries, domain concepts (`flow` and `domain-model`), enriched roadmap sequencing (with and without `.codegraph/`), and v1-to-v2 migration:

| Scenario | Kind | Model v2 Evidence |
| --- | --- | --- |
| `preserve-custom-product` | Decision | Configured paths and templates, section-level merge preservation, skipped answers |
| `duplicate-use-case-boundary` | Decision | Semantic duplication (`UC-01.04.02`), feature ownership (`F-01.04` vs. `F-01.07`), focused clarification |
| `configured-use-case-discovery` | Decision | Custom `useCaseFilePattern` discovery and flow-meaning identity reconciliation |
| `roadmap-removal-verification-links` | Decision | Incoming `Verify: with R-pp.ss` references and preserved acceptance obligations |
| `maintain-v1-migration-conflict` | Decision | Zero Dual v1/v2 Operation conflict alert and deterministic upgrade routing |
| `product-update-artifact` | Artifact | Custom-path `planning/vision.md` edit with content and `Local notes` preservation |
| `product-inventory-non-technical-artifact` | Artifact | `F-00.01` / `F-01.01` group banding, link-free checklist summary, stubbed guides, and stripping leaked tech stack details to `docs/tech-stack.md` |
| `feature-boundary-artifact` | Artifact | Feature guide (`F-01.01`) in non-technical user-outcome language with explicit boundaries and preserved `Local notes` |
| `use-case-artifact` | Artifact | Actor workflow (`UC-01.01.01`) with ASCII process tree, failures, unknowns, `Consistency Check`, and parent linkage |
| `concept-macro-flow-artifact` | Artifact | Domain macro-flow (`C-01`, `type: flow`) with bi-directional links between `product.md` and `feature.md` |
| `concept-domain-model-artifact` | Artifact | Sequential domain model (`C-02`, `type: domain-model`) with entity invariants and multi-feature bi-directional links |
| `roadmap-reference-artifact` | Artifact | Enriched v2 step schema (`Rationale:`, `Concepts:`, `Gotchas:`, `Verify:`), `Verify: with` repair, clean CodeGraph omission when `.codegraph/` is absent, and `ce-plan` handoff |
| `roadmap-codegraph-anchors-artifact` | Artifact | Conditional `.codegraph/` AST `Anchors:`, Planning vs. Implementation boundary (rejecting code/DDL in roadmap), and `ce-plan` handoff with `codegraph_explore` symbol |
| `maintain-v1-migration-artifact` | Artifact | End-to-end execution of v1-to-v2 repository migration (`.plan-product` $\rightarrow$ `.nyssa-ai/plan-product`, `F-101` $\rightarrow$ `F-01.01`, `UC-001` $\rightarrow$ `UC-01.01.01`, `R-001` $\rightarrow$ `R-01.01`) |

Each content rubric totals 100. Criteria judge outcomes rather than exact wording. Document scenarios include all required local configuration, templates, and prior documents; they require no secrets, external repositories, or setup downloads. The tasks supply confirmed user decisions so an unattended evaluation can produce artifacts without inventing interview answers.

## Local checks

```text
npm test
npm run eval:prepare
node evals/scenarios/product-planning/prepare.mjs . <new-temporary-directory>
```

Preparation requires a new output directory, copies the plugin into a private temporary evaluation adapter, and materializes routing and content scenarios with declared fixtures. Local checks validate bundle coverage, criteria totals, fixture safety, package contents, and unchanged retained criteria. They do not measure model task performance or natural activation.

`baseline.json` records `modelVersion: 2`, the source commit, and the SHA-256 hashes of all 14 Model v2 content scenarios (both the 5 decision/reconciliation scenarios and the 9 fixture-backed artifact scenarios) so rubrics, weights, and fixtures cannot drift silently.

## Hosted execution when requested

Check the installed CLI with `tessl eval run --help` and `tessl eval run --list-agents`. Link the temporary directory to the appropriate Tessl project. Run routing before scored content, using the same model, fixtures, rubric and repeat count for comparisons:

```text
tessl eval run <prepared>/routing --context <prepared> --skip-forced-context-activation --skip-scoring --label "Product planning 0.2.0 natural activation" --json --yes
tessl eval run <prepared>/content --context <prepared> --label "Product planning 0.2.0 baseline versus context" --json --yes
```

The content command includes the no-context baseline by default. Record the resolved agent/model, run IDs, links, activation observations, and per-scenario scores. Investigate regressions without relaxing criteria. Keep improvements bounded to two iterations.
