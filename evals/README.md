# Product Planning Evaluations

> [!IMPORTANT] Scope Directive
> Documents the evaluation suites, host coverage matrix, isolated scenario stager, and deterministic `LATEST.md` evidence gate for `plan-product`.

## Suite Overview

The `product-planning` evaluation harness combines fast offline lexical trigger checks, workflow routing/content scenario benchmarks, and per-host release evidence tracking against [`matrix.json`](matrix.json):

| Suite | Coverage | Execution |
| --- | --- | --- |
| **Waza Trigger Suite** ([`waza/skills/plan-product/eval.yaml`](waza/skills/plan-product/eval.yaml)) | 12 single-`TestCase` `.yaml` tasks (`tasks/*.yaml`): 6 positive planning prompts across all workflows (`product`, `concept`, `feature`, `use-case`, `development-plan`, `maintain`) and 6 near-neighbor negative software-implementation prompts graded against `skills/plan-product/SKILL.md`. | Offline preflight & mock trigger check via official `waza` (`v0.41.0+`), or live executor against an isolated `--output-dir` bundle outside `repo_root`. |
| **Scenario Suite** ([`scenarios/product-planning/README.md`](scenarios/product-planning/README.md)) | **48 natural activation routing cases** (3 positive, 2 ambiguous, and 3 near-neighbor negative prompts across each of the 6 workflows) and **14 weighted Model v2 content cases** (5 decision/reconciliation scenarios + 9 fixture-backed artifact scenarios, each totaling 100 points and SHA-256 locked in [`baseline.json`](scenarios/product-planning/baseline.json)). | Stage isolated candidate plugin and fixtures via `npm run eval:prepare` or `node evals/scenarios/product-planning/prepare.mjs . <new-temporary-directory>`, then run in a fresh host session outside `repo_root`. |
| **Host Coverage Matrix & Evidence Gate** ([`matrix.json`](matrix.json), [`LATEST.md`](LATEST.md)) | Tracks the 11 target harnesses (`Codex`, `Claude Code`, `Claude Cowork`, `Antigravity CLI`, `Antigravity 2.0`, `Antigravity IDE`, `Hermes Agent`, `OpenClaw`, `Cursor`, `Grok Bot`, `Muse`) with deterministic `Candidate SHA-256` freshness checking. | `npm run eval:report` (`node evals/report.mjs check`) in CI; `npm run eval:report:write` (`node evals/report.mjs generate`) when candidate sources or verified receipts change; `node evals/report.mjs release` for release gating. |

## Directory Layout

- [`README.md`](README.md) — Suite overview, directory layout, and command reference.
- [`matrix.json`](matrix.json) — Canonical `"schema": 1` host coverage matrix declaring required and provisional harness targets for `suite: "product-planning"`.
- [`LATEST.md`](LATEST.md) — Rendered evaluation report recording `Candidate SHA-256`, `Suite revision`, the 9-column host status matrix, and `Release acceptance`.
- [`report.mjs`](report.mjs) — Pure Node.js 22+ ESM deterministic source hasher, receipt verifier, and `LATEST.md` generator (`generate` | `check` | `release` | `hash`).
- [`waza/skills/plan-product/`](waza/skills/plan-product/eval.yaml) — Official `microsoft/waza` (`v0.41.0`) evaluation manifest and flattened single-`TestCase` files under `waza/skills/plan-product/tasks/*.yaml`.
- [`scenarios/product-planning/`](scenarios/product-planning/README.md) — Routing and Model v2 content scenarios (`cases.json`), rubric integrity lock (`baseline.json`), and isolated staging script (`prepare.mjs`).
- `.temp/evals/` — Gitignored ephemeral workspace for staged scenario runs and local evaluation receipts (`.temp/evals/evidence/results/<run-id>/` and `.temp/evals/evidence/attempts/<run-id>/`).

## Commands

Run from `repo_root`:

```bash
# Verify harness-adapter manifest parity (or stage isolated host bundles)
npm run assemble
node scripts/assemble.mjs write --output-dir .temp/dist

# Run structural, manifest, docs/ lockdown, matrix.json, and Waza schema validation
npm run validate

# Run unit and use-case test suites
npm test

# Validate scenario definitions and rubric SHA-256 locks (or stage to a fresh directory)
npm run eval:prepare
node evals/scenarios/product-planning/prepare.mjs . .temp/evals/staged-run

# Manage deterministic LATEST.md report and Candidate SHA-256 identity
npm run eval:report
npm run eval:report:write
node evals/report.mjs generate
node evals/report.mjs check
node evals/report.mjs release
node evals/report.mjs hash

# Run official Waza v0.41.0 offline preflight and trigger benchmark
waza preflight --no-update-check evals/waza/skills/plan-product/eval.yaml
waza run --no-update-check -o /tmp/waza-product-planning.json evals/waza/skills/plan-product/eval.yaml
```

## Evidence & Isolation Rules

- Never self-load staged `.agents/` or `.hermes/` bundles inside `repo_root`; always stage to `.temp/` or an external temporary directory so contributor `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` instructions do not contaminate consumer behavior tests.
- Static checks (`npm run validate`, `npm test`, `npm run eval:prepare`, and `executor: mock` Waza trigger checks) validate package structure and lexical trigger alignment locally; they never substitute for live per-host behavioral evidence in [`LATEST.md`](LATEST.md).
- Missing, stale, or failing required rows in [`LATEST.md`](LATEST.md) keep `Release acceptance` in `Fail` state and cause `node evals/report.mjs release` to exit non-zero, while `npm run eval:report` (`node evals/report.mjs check`) verifies report consistency in CI.
