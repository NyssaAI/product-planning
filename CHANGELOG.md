# Changelog

## Unreleased

## 0.12.8 - Cross-plugin 11-host adapters, CI & Waza parity, runtime_root & telemetry, Apache-2.0, routing, and validator parity

- Aligned 11-host `harness-adapter` distribution parity: added `harness-adapters/hermes/plugin.py`, enforced `.tessl-plugin/plugin.json` (`"skills": "./skills"`) and `gemini-extension.json` (`contextFileName` omission for consumer isolation), projected `homepage` into `.claude-plugin/plugin.json` to match `.codex-plugin/plugin.json` and `.cursor-plugin/plugin.json`, and staged deterministic `.temp/dist/{portable,antigravity,hermes}` bundles via `scripts/assemble.mjs`.
- Unified multi-OS CI validation (`.github/workflows/validate.yml`) and deterministic evaluation reporting (`evals/report.mjs`) gating `evals/matrix.json` (schema 1 across 11 hosts) and `evals/LATEST.md` against CRLF-normalized `Candidate SHA-256` digests.
- Expanded Waza trigger coverage to 12 single-`TestCase` `.yaml` tasks under `evals/waza/skills/plan-product/tasks/` (6 positive workflow triggers and 6 negative out-of-scope triggers) enforced by `src/validation/validate.mjs`.
- Standardized 4-step `runtime_root` resolution (`--runtime-root` -> `NYSSA_RUNTIME_ROOT` -> `<persona_cwd>/.nyssa-ai/plan-product/runtime/` when `SOUL.md` and `IDENTITY.md` exist -> configured `runtimeRoot` or `.nyssa-ai/plan-product/runtime/`), added `runtimeRoot` and opt-in `telemetry.enabled` (`false` default) to `skills/plan-product/assets/schema.json`, and enforced zero `usage/` writes when telemetry is disabled.
- Migrated public repository licensing to `Apache-2.0` (`LICENSE`, `plugin.json`, `package.json`, `package-lock.json`, `README.md`, and `src/validation/validate.mjs` license parity checks) and added tracked root `CHANGELOG.md`.
- Made cross-plugin routing boundaries explicit in `skills/plan-product/SKILL.md` and `skills/plan-product/workflows/development-plan.md` across `dev-delivery`, `dev-standards`, `dev-learnings`, `dev-ship`, and `plugin-builder`.
- Hardened `src/validation/validate.mjs` for cross-plugin `plugin-builder` validator parity: enforced explicit bans on self-loaded (`.agents/`, `.hermes/`) and retired (`artifacts/`, `adapters/`) root directories, `.gitattributes` `eol=lf` rules, `docs/` `.gitignore` / `git check-ignore` protection, `SKILL.md` UTF-8 BOM + `description <= 1024` + `## Verification` heading checks, retired `skills/*/agents/` and `harness-adapters/codex/**/openai.yaml` bans, machine-local path and retired runtime token scans, and non-code-span Markdown link resolution.

## 0.12.7 - Cross-plugin Ubiquitous Language, `development-plan.md` (`DP-pp.ss`), `GLOSSARY.md`, and Scale A `src/`

- Aligned cross-plugin Ubiquitous Language and 5-root filesystem boundaries (`user_home` -> `repo_root` configuration precedence, `runtime_root` under `.nyssa-ai/plan-product/runtime/`, single root `.temp/`), seeded `docs/GLOSSARY.md` during initialization, and locked `docs/` to the canonical allowed set (`GLOSSARY.md`, `product.md`, `features.md`, `tech-stack.md`, `code-map/`, `concepts/`, `features/`, `plans/`, `learnings/`, `specs/`).
- Renamed the roadmap workflow and command to `workflows/development-plan.md` and `commands/plan-development.md`, standardized `docs/plans/development-plan.md` with `DP-pp.ss` step IDs (replacing `docs/roadmap.md` and `R-pp.ss`), and added automatic Model v1 / legacy `roadmap.md` migration in `src/migration/migrate.mjs`.
- Reorganized runtime JavaScript modules into Scale A capability folders (`src/init/`, `src/migration/`, `src/validation/`), generated pre-indexed `docs/code-map/codegraph.db`, split tests into `test/unit/` and `test/use_case/`, and fixed explicit Node 22 `--test` globs in CI.

## 0.12.6 - Hermes Agent deferred CodeGraph `tool_search` lookup

- Documented Hermes Agent deferred `tool_search` discovery (`mcp__codegraph__codegraph_explore`) in the planning sequencing workflow so agents locate bundled CodeGraph tools cleanly when `docs/code-map/codegraph.db` is present.

## 0.12.5 - Agent Plugins v1 portable `plugin.json` schema

- Aligned root `plugin.json` with the Agent Plugins v1 portable schema (`https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`) and moved host-specific interface metadata into `scripts/assemble.mjs` projection for `.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `.tessl-plugin/`, and `gemini-extension.json`.

## 0.12.4 - `dev-standards` alignment and CodeGraph snapshot contract

- Aligned planning workflows and `README.md` with `dev-standards` zero-footprint repository conventions (`docs/code-map/codegraph.db` conditional `Anchors:` lookup without `.codegraph/` directories) and added `.tessl-plugin/plugin.json` projection.

## 0.12.3 - Canonical user-focused feature naming standard

- Enforced action- and safeguard-oriented feature titles across `workflows/product.md`, `workflows/feature.md`, `commands/`, and templates while banning implementation-plumbing jargon in feature headings.

## 0.12.2 - Release version bump across manifests

- Bumped `plugin.json`, `package.json`, `package-lock.json`, and projected host manifests to `0.12.2` for marketplace synchronization.

## 0.12.1 - Package, lockfile, and marketplace release dispatch sync

- Added automatic marketplace release-dispatch workflow on tag push and synchronized `package.json`, `package-lock.json`, and host adapter manifests with `plugin.json`.

## 0.12.0 - Product update default prompts and host manifest sync

- Added product and roadmap update prompt actions to canonical and Codex host manifests and synchronized release metadata for Model v2 (`0.12.0`).

## 0.2.0 - Model v2 planning framework and dependency-ordered sequencing

- Introduced the Model v2 planning architecture: atomic domain models and cross-feature macro-flows (`docs/concepts/c-nn-*.md` with `C-nn`), grouped feature folders (`docs/features/f-gg.nn/feature.md` with `F-gg.nn`), granular actor use cases (`uc-gg.nn.uu-*.md` with `UC-gg.nn.uu`), `plan-concept` and `plan-maintain` workflows/commands, and non-technical capability boundaries.
- Upgraded initialization and configuration paths under `.nyssa-ai/plan-product/` (`config.json`, `schema.json`, `templates/`), synchronized multi-host manifests, and locked all 48 routing and 14 content evaluation scenarios (`evals/scenarios/product-planning/baseline.json`) to Model v2.

## 0.1.2 - Host manifest release alignment

- Synchronized `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `gemini-extension.json`, `package.json`, and `README.md` metadata with `plugin.json` for NyssaAI release publishing.

## 0.1.1 - NyssaAI marketplace publication metadata

- Updated repository URLs, author metadata, `package.json`, `plugin.json`, and `README.md` installation instructions for publishing through `NyssaAI/plugin-marketplace`.

## 0.1.0 - Encapsulated `plan-product` facade architecture

- Refactored standalone planning skills into the single `skills/plan-product/SKILL.md` encapsulated facade with focused `workflows/`, matching `commands/`, deterministic `scripts/assemble.mjs` and `scripts/validate.mjs` checks, and `evals/scenarios/product-planning/` evaluation suites.
