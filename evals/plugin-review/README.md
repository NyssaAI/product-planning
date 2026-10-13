# Plugin review evaluation cases

This independent suite covers natural routing for all ten public skills: one clear positive, one indirect or ambiguous positive, and one negative per skill. Eleven content cases test planning decisions; a twelfth creates an implementation-plan artifact against a small local source fixture. No package installation, external repository clone, secrets, or setup script is required.

`cases.json` is the source for the decision cases. `prepare.mjs` validates coverage and rubric weights and materializes Tessl scenarios plus a temporary plugin adapter. The synthetic source fixture is authored in that script. Shipping manifests are unaffected.

## Prepare and run

From the repository root, run:

```text
node --check evals/plugin-review/prepare.mjs
node evals/plugin-review/prepare.mjs
node evals/plugin-review/prepare.mjs <source-checkout> <new-temporary-directory>
```

Use a fresh output directory for each prepared snapshot. Run the following from the temporary directory, replacing the workspace and organization with your own. Project creation stores a local service association only in that temporary directory.

```text
tessl project create plan-product-review --workspace <workspace> --org <organization>
tessl plugin lint .
tessl eval run routing --context . --skip-forced-context-activation --skip-scoring --label "plan-product baseline natural routing" --no-wait --json --yes
```

Inspect the returned activation run with `tessl eval view <id> --json` before submitting content. A terminal external blocker permits documenting the failure and testing the content submission independently. Content runs retain the default baseline arm (no context) and the plugin arm (forced context):

```text
tessl eval run content --context . --label "plan-product baseline content" --no-wait --json
```

Repeat against the revised snapshot with verification labels, identical cases and identical agent/model settings. For a paid Sonnet comparison add `--agent claude --model claude-sonnet-4-6` consistently. CLI 0.114.0's free service default requires omitting **both** flags; record its resolved model from actual run metadata if a run starts. Do not assume it remains constant between dates. Inspect CLI help before rerunning on another version.

## Interpretation and quality checks

- Routing is unscored: inspect the activation trace for each named case. Positive cases should select the target skill; ambiguous cases allow a justified clarification or supporting adjacent skill. Negative cases must not select the named target; another applicable skill is allowed. Record exact fired skills and rationale, not just a plugin-wide percentage. Nothing forces an expected skill into the activation task.
- All content rubric weights total 100. Each criterion measures a distinct outcome, accepts equivalent wording, and requires reasoning or an artifact beyond prompt repetition. No points for generic tidiness, naming the plugin, or quoting instructions.
- B-01 tests pre-existing dirty repair targets, including an unselected feature; B-02 tests Markdown-relative links versus repo-relative config; B-03 distinguishes required-behavior failures from contradictory assertions.
- Four additional decision cases cover configured use-case discovery, incoming roadmap verification references, noninstalling hook verification and selective removal, and task-bounded query pagination. They require no fixture or setup script. The hook negative routing case requests a one-time stale-map refresh: expect `map-code`, not hook installation.
- `scoped-map-artifact` requires a real output file and current source evidence. Its stale map deliberately references a nonexistent old file. The other cases are bounded decision reviews, **not** proof of end-to-end command execution, edits, Git safety, or runtime correctness.
- Existing untracked pilot suites were inspected read-only. Their language/runtime implementation tasks did not isolate these plugin decisions, so no scenarios or records were copied.
- Freeze cases for before/after comparisons. Do not change criteria to improve a score. Investigate regressions before expanding or replacing high-baseline cases.

The runner refuses an existing output directory to prevent accidental overwrite. Raw service logs belong outside the repository; retain concise findings and actual run IDs in the review report. No ID or score exists for a rejected submission.
