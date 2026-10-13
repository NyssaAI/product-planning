# Tessl-only optimization pass — 2026-10-13

## Scope and guidance

This follow-up starts at `e671226873a1d4ba6eae73995d00e7acc7f23154` on `fix/plugin-review-evaluations`, after the first review cycle. It uses only Tessl's `optimize-skill-performance-and-instructions`, `optimize-skill-instructions`, `setup-skill-performance`, and `optimize-skill-performance` guidance, including their applicable bundle-validation, fixture, rubric, execution, and results references. Compound Engineering workflows were not applied in this pass. References to Compound Engineering inside the reviewed plugin are product content, not instructions invoked by this review.

The source checkout remains untouched; work continues in the existing isolated review worktree and updates PR #40. Repo AGENTS.md remains applicable. Its `../.tessl/RULES.md` is still absent, as are the checked ancestor `.tessl` directories. The discovered user-level `.tessl/RULES.md` contains only an instruction to install missing linked plugins and has no links. Project-specific Tessl rules remain unavailable.

All ten skill entrypoints, their sibling resources, command wrappers, and referenced configuration/templates/script contracts were inspected using Tessl's whole-bundle and accuracy checks. The only sibling resource is build-roadmap's phase-contracts reference, which has an explicit dispatch-time reading trigger. All descriptions have a `Use when` clause. No orphaned skill resource or new runtime-asset defect was confirmed. Tessl's instruction optimizer scope limits this pass to targeted prose and evaluation changes; no runtime dependency or generator was changed.

Three implementation/evaluation agents used `gpt-6-astra`, low reasoning, and no inherited turns, with exclusive file ownership. Two implemented and verified bundle changes; the third quality-checked and extended evaluations. The parent prioritized findings, reviewed the integrated diff and rubrics, ran final verification, and owns the commit, push, and PR.

## Findings and dispositions

Evidence below refers to the starting commit. These are local findings made under Tessl guidance, **not hosted Tessl judge findings**. All six accepted findings have no implementation dependency. No P0/P1 defect was established in this pass.

| ID | Severity / status | Evidence | User impact and correction | Validation criterion |
|---|---|---|---|---|
| T01 | P2, confirmed, fixed | `skills/plan-use-case/SKILL.md:50` versus step 4 | Hardcoded `uc-*.md` consistency scans omit custom-named sibling use cases. Use `structure.features.useCaseFilePattern` throughout. | Configured sibling discovery precedes duplicate reconciliation, including unlinked siblings. Covered by `configured-use-case-discovery`. |
| T02 | P2, confirmed, fixed | `skills/plan-roadmap/SKILL.md:20` versus lines 16 and 38 | Removal checks omit incoming verification deferrals. Check both `after:` and `Verify: with` references; resolve open-slice references with confirmation, retain targets referenced by immutable completed history. | Removal cannot leave an unresolved verification obligation. Covered by `roadmap-removal-verification-links`. |
| T03 | P2, confirmed instruction gap, fixed | `skills/plan-use-case/SKILL.md:56` | A template is named but no read step is specified. Read `paths.useCaseTemplate` immediately before writing. | Explicit read uses the configured template; template existence and packaging checks pass. Hosted behavior remains unmeasured. |
| T10 | P2, confirmed, fixed | `skills/install-code-map-hook/SKILL.md:3,20–21` | Stale-map requests can activate permanent installation; verification always falls into the installer and removal is gated by planning config. Narrow activation, route one-time refreshes to map-code, separate read-only inspection/install/removal. | Effective hook lookup respects worktrees and `core.hooksPath`; verification neither executes nor installs a hook; removal works without planning config. Covered by adjacent negative routing and `hook-verification-removal-scope`. |
| T11 | P2, confirmed, fixed | `skills/using-code-map/SKILL.md:59` versus line 28 | Mandatory exhaustive pagination defeats scoped context loading. Continue only while more evidence is needed; qualify omitted results; exhaust for complete inventories. | Sufficient current-source evidence can end a scoped query without claiming completeness. Covered by `bounded-query-pagination`. |
| T12 | P3, confirmed, fixed | `skills/install-code-map-hook/SKILL.md:37,40`; `commands/install-code-map-hook.md:28` | The promise that every push proceeds contradicts preservation of existing hooks. Scope warn-only behavior to the plan-product block; retain other hook behavior. | Instructions distinguish generator failure from an existing blocking policy. Covered in the hook decision case. |
| T04 | P3, uncertain, deferred | `skills/plan-product/SKILL.md:151` | Suggested spelling out rebasing template references. Existing wording already requires configured feature/tech-stack paths; no observed failure establishes a new defect. | Revisit if configured-path content evaluation exposes incorrect links. No speculative rewrite. |
| T30 | P3, optional, deferred | Actual `tessl plugin lint` output for build-roadmap | Entry point is approximately 5951 tokens versus a recommended 5000. Phase packets are already separate; further restructuring changes workflow disclosure without measurement. | Retain the warning; assess a focused extraction only with comparable routing/content results. |

The priority table was presented before implementation. Final parent review checked the precise changes against script markers, CLI capabilities, configured paths, immutable history, and bounded-context intent. It also corrected the new roadmap rubric to use actual `after:` syntax and explicitly open slices, and made the hook case exercise missing planning configuration and a preserved blocking policy.

## Scenario quality and reproducibility

The suite now contains 30 natural-routing cases (positive, ambiguous, negative for each public skill), 11 decision-content cases, and one artifact-producing local-fixture case. Four new decisions cover T01, T02, T10/T12, and T11. The hook negative now requests a one-time refresh rather than unrelated secret scanning; map-code is expected, hook installation is not.

All existing content criteria were retained unchanged. Rubrics were checked for answer leakage, double-counting, free points, required evidence, and fixture needs. Decisions explicitly request review without execution, so they need no repository fixture. The existing source/artifact fixture is preserved. No remote clone, setup script, secret, or package installation was added. Possible high-baseline/general-reasoning criteria remain until scores establish redundancy.

Both final comparison snapshots use the same current generator and cases, with pre-edit plugin source from the frozen `e671226` adapter and post-edit plugin source from the reviewed worktree. All 133 scenario/fixture files are byte-identical between snapshots. Unlike the first cycle, no YAML transport repair is needed.

SHA-256 of frozen inputs:

- `evals/plugin-review/cases.json`: `7FA4EC57C3769CE2DCB712357EECE7D73586FA6E822C449F99752D2033795116`
- `evals/plugin-review/prepare.mjs`: `5C626E95A160D2A6D0AF449678A23BA74D46F78DB3BFA221B6D92CDF4BA7ACA2`

Reproduce using the [suite instructions](../../evals/plugin-review/README.md): export the starting commit to a separate source directory, invoke the current `prepare.mjs` once per source snapshot into fresh output directories, link a Tessl project, then run activation before content for each snapshot. Keep cases and runner settings identical. Baseline means both the pre-edit source comparison and the content runner's separate no-context control arm; neither control arm is skipped.

## Actual Tessl submissions

CLI 0.114.0 was verified through version/help output; authenticated login succeeded. Supported models were listed. This pass uses the service default (omit both agent/model flags); help advertises `claude` / `deepseek-v4.1-flash`. There is no run metadata confirming an executed model or scorer because no run started. This is distinct from the required Astra implementation agents.

| Submission | Exact label pattern | Result / run ID / URL |
|---|---|---|
| Baseline review, each of 10 skills | `Tessl-only baseline <skill> e671226` | Rejected: organization out of credits. No ID or result URL. |
| Verification review, each of 10 skills | `Tessl-only verification <skill>` | Same rejection; no ID or result URL. |
| Initial 30-case activation | `Tessl-only activation baseline e671226` | Same rejection; no activation results. |
| Initial 8-case content | `Tessl-only content baseline e671226` | Same rejection; no scores. |
| Final 30-case activation, pre-edit | `Tessl-only activation before six instruction fixes` | Same rejection; no ID or result URL. |
| Final 30-case activation, post-edit | `Tessl-only activation after six instruction fixes` | Same rejection; no ID or result URL. |
| Final 12-case content, pre-edit | `Tessl-only content before six instruction fixes` | Same rejection; no ID or result URL. |
| Final 12-case content, post-edit | `Tessl-only content after six instruction fixes` | Same rejection; no ID or result URL. |

The ten reviewed skills are build-roadmap, find-code-patterns, install-code-map-hook, map-architecture, map-code, plan-feature, plan-product, plan-roadmap, plan-use-case, and using-code-map. Review submissions use `--workspace jamaynor --no-wait --json`; activation uses `--skip-forced-context-activation --skip-scoring`; all eval attempts have labels, `--no-wait --json --yes`, and default baseline arms. Final activation attempts preceded final content attempts. Content submission was tested independently after the terminal activation service rejection; routing was not declared clean.

Exact external rejection: “Your organization has run out of credits. Upgrade your plan or buy more credits to continue.” Preliminary attempts outside the newly associated project failed with “No Tessl project found”; creating the temporary project resolved that setup issue, exposing the credit blocker. Project `01a13715-2a7b-7251-8889-eb7fbf05115b` is a **project ID, not an eval run ID**.

Raw CLI receipts and frozen snapshots remain outside the repo under the local temporary directory `plan-product-tessl-only-20261013`. Durable configuration, labels, hashes, outcomes, and reproduction instructions are retained here. No paid upgrade was attempted. No hosted review dimensions, score deltas, activation successes/failures, A/B/C/D criterion buckets, or performance improvements can be reported. One local instruction-remediation pass was completed; zero scored improvement iterations were possible, within Tessl's two-iteration bound.

## Verification and remaining work

| Check | Before | After |
|---|---|---|
| Hosted review / activation / content | Unavailable | Unavailable; not a pass |
| Tessl structural lint | Valid; build-roadmap size warning | Valid; same warning |
| Complete regression suite | Starting commit's recorded result: 301 pass, 8 skip, 0 fail | Fresh run: 301 pass, 8 skip, 0 fail; 30.5 seconds |
| Focused template/command/manifest suite | Existing checks | 14 pass, 0 fail |
| JavaScript syntax | Existing scripts unchanged | All 70 script files plus eval preparer parse |
| Scenario preparation | 30 routing / 8 content | 30 routing / 12 content; coverage, weights, fixture and snapshot identity validated |
| Description / reference checks | Ten triggers present | Ten triggers present; referenced scripts and phase resource exist; no new broken reference |

The full suite includes package-manifest/configuration checks. The eight skips are unchanged from the starting commit: seven require unavailable Windows file-symlink privileges and one predates the original cycle. Hook lookup was checked against default, relative, and absolute `core.hooksPath` settings without changing repository config. Hook marker strings match the installer. No executable Python snippets require parsing in the edited bundles. `git diff --check` passes.

PR #40 remains a draft. Outstanding external work is to restore Tessl credits, execute the frozen comparable runs, inspect activation separately from content scores, and investigate any measured regression before another bounded improvement iteration. T04 and T30 remain deferred as explained above. The first cycle's runtime/platform limitations remain in its separate report; this pass makes no new runtime correctness or performance claims.
