# Product planning evaluations

Four public skills have one positive, one ambiguous, and one negative routing request each: **12 natural activation cases**. Negative cases cover advertising copy, coding work, a vocabulary question, and travel planning. Observe the skill selected; do not treat forced-context scores as routing evidence.

The **8 content scenarios** cover four preserved decisions and four document-producing tasks:

| Scenario | Evidence |
| --- | --- |
| preserve-custom-product | Configured paths and templates, section preservation, skipped answers |
| duplicate-use-case-boundary | Semantic duplication, feature ownership, focused clarification |
| configured-use-case-discovery | Custom naming and existing workflow identity |
| roadmap-removal-verification-links | Incoming verification references and preserved acceptance obligations |
| product-update-artifact | Actual custom-path document edit with content preservation |
| feature-boundary-artifact | Actual feature guide with explicit acceptance and adjacent ownership |
| use-case-artifact | Actual actor workflow, failures, unknowns, and parent linkage |
| roadmap-reference-artifact | Actual dependency and verification repair with stable IDs |

Each content rubric totals 100. Criteria judge outcomes rather than exact wording. Document scenarios include all required local configuration, templates, and prior documents; they require no secrets, external repositories, or setup downloads. The tasks supply confirmed user decisions so an unattended evaluation can produce artifacts without inventing interview answers.

## Local checks

```text
npm test
npm run eval:prepare
node evals/product-planning/prepare.mjs . <new-temporary-directory>
```

Preparation requires a new output directory, copies the plugin into a private temporary evaluation adapter, and materializes routing and content scenarios with declared fixtures. Local checks validate bundle coverage, criteria totals, fixture safety, package contents, and unchanged retained criteria. They do not measure model task performance or natural activation.

`baseline.json` records the source commit and SHA-256 hashes of the four retained decision cases. Their tasks, criteria, and weights are unchanged from that version. New document tasks extend coverage rather than replacing difficult cases.

## Hosted execution when requested

Check the installed CLI with `tessl eval run --help` and `tessl eval run --list-agents`. Link the temporary directory to the appropriate Tessl project. Run routing before scored content, using the same model, fixtures, rubric and repeat count for comparisons:

```text
tessl eval run <prepared>/routing --context <prepared> --skip-forced-context-activation --skip-scoring --label "Product planning 0.1.0 natural activation" --json --yes
tessl eval run <prepared>/content --context <prepared> --label "Product planning 0.1.0 baseline versus context" --json --yes
```

The content command includes the no-context baseline by default. Record the resolved agent/model, run IDs, links, activation observations, and per-scenario scores. Investigate regressions without relaxing criteria. Keep improvements bounded to two iterations.

## 0.1.0 validation status

On 2026-10-13, the user explicitly instructed us to ignore Tessl online evaluations after all four bundle reviews were rejected because the `jamaynor` workspace had exhausted its credits. No review run IDs or scores were returned. The accessible history contained no completed task evaluations for the retained four planning skills, so no historical best score can be claimed or compared. Hosted execution is waived for this release; local tests and scenario validation are the release evidence.

Project guidance referenced `../.tessl/RULES.md`, which remains absent. The available user-level rules only concern installing missing linked plugins and supply no additional project rules.
