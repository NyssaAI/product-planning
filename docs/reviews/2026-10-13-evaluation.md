# Plugin evaluation — 2026-10-13

**Status: reproducible suite prepared; hosted quality and performance measurement blocked by exhausted Tessl credits. No successful evaluation run, review score, activation finding, or before/after performance claim is available.**

Baseline: `dd1b395`, exported before instruction edits. CLI: Tessl 0.114.0. All ten public bundles were submitted for baseline review and again after the instruction fixes using explicit `--workspace jamaynor`, labels, `--no-wait --json`. Every review rejected with: “Your organization has run out of credits. Upgrade your plan or buy more credits to continue.” No review IDs or result URLs were issued. No purchase was made.

| Measurement | Baseline | Verification |
| --- | --- | --- |
| Bundle reviews: build-roadmap, find-code-patterns, install-code-map-hook, map-architecture, map-code, plan-feature, plan-product, plan-roadmap, plan-use-case, using-code-map | Credit rejection for each | Credit rejection for each |
| Natural activation, 30 cases, explicit Claude Sonnet 4.6 | Paid model-selection rejection | Not repeated: same entitlement |
| Forced-context content, explicit Claude Sonnet 4.6 | Paid model-selection rejection | Not repeated: same entitlement |
| Natural activation, 30 cases, service default | Credit rejection after YAML transport repair | Credit rejection |
| Forced-context content, 8 cases, service default | Credit rejection | Credit rejection |
| Plugin structure/frontmatter lint | Valid after repair; build-roadmap approximately 5740 tokens | Valid; build-roadmap approximately 5951 tokens |

The explicit-model response was “Model selection requires a paid plan.” Omitting only `--model` still produced that rejection. Omitting both `--agent` and `--model` reached the service's credit check. The supported default listed by the CLI was Claude/deepseek-v4.1-flash, but no run metadata exists to confirm execution. Activation submissions preceded content submissions; after terminal activation rejection the independent content submission was attempted. Neither natural activation nor content scoring actually ran.

## Found and corrected during submission

B-07: `skills/plan-roadmap/SKILL.md` had an unquoted colon-space (`after: dependencies`) in its description. Tessl rejected the YAML frontmatter, so no skill in the package could be evaluated through the adapter. The description is now quoted with identical wording. Supported `tessl plugin lint` validates all ten bundles. Its only warning is build-roadmap exceeding the recommended 5000-token size; no arbitrary truncation was made.

For comparability, the temporary baseline adapter received **only the identical quoting repair** before final submissions. Baseline roadmap skill SHA-256 before repair: `c03c0573330a3a7354c63db176d5d41bb8c8cdce9b1bce3c4891c60787f9d620`; after repair: `96b1aaab280595fa64f38e1e964ef73e06f2ec4877e1311dfeaa38a8ec301476`. The immutable exported baseline remains unchanged. This is a documented transport deviation, not a measured improvement.

## Coverage and limits

[The suite](../../evals/plugin-review/README.md) contains positive, indirect/ambiguous, and negative routing coverage for every public capability. Seven scored decision cases cover configured path/template preservation, duplicate use-case ownership, roadmap readiness, bounded map evidence, dirty mechanical repair, document-relative links, and required-behavior failure remediation. One fixture-backed case asks for an implementation-plan artifact and verifies current source paths and authorization regression coverage. These are independent synthetic scenarios with no external clone or setup commands.

Rubrics were checked for answer-copy points, duplicate rewards, generic free points, positive weights summing to 100, and complete routing coverage. The decision prompts expose faulty proposals but require their correction, not verbatim copying. Runtime and actual mutation safety remain covered by repository tests rather than these decision cases. Existing untracked pilot evals were inspected read-only and not imported.

`node --check evals/plugin-review/prepare.mjs` and its local validation pass. Materialized criteria and fixture schemas were accepted by the CLI up to the credit gate. The fixture-backed task itself was not executed. No criterion was weakened in response to a score, since no scores exist.

Temporary raw receipts are retained outside the checkout under the local temporary directory `plan-product-review-20261013`. The temporary evaluation project ID is `01a136fe-ff99-7381-8bff-18c47efb50d8` (a project ID, **not** a run ID). It is linked to the temporary adapter directory; no shipping Tessl manifest or repository project association was added.

Rerun the documented activation-first workflow when credits are available, inspect per-case fired skills, then compare no-context and forced-context content criteria using identical snapshots, cases and model. Until then, functional test evidence and static review findings must not be described as hosted skill-quality scores.
