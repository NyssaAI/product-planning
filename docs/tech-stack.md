# Tech Stack

## Stack Summary

Markdown skill facade and workflows, starter templates, JSON configuration and `harness-adapter` manifests, and dependency-free Node.js Scale A runtime modules under `src/`.

## Languages and Runtimes

Node.js 22 or later; ECMAScript modules. Zero third-party runtime dependencies.

## Frameworks and Services

`harness-adapter` manifests support Claude Code (`.claude-plugin/`), Codex (`.codex-plugin/`), Cursor (`.cursor-plugin/`), Tessl (`.tessl-plugin/`), and Gemini (`gemini-extension.json`), generated deterministically via `scripts/assemble.mjs`.

## Artifacts and Root Boundaries

Planning documents live in `repo_root` (`docs/product.md`, `docs/GLOSSARY.md`, `docs/features.md`, `docs/tech-stack.md`, `docs/concepts/`, `docs/features/`, and `docs/plans/development-plan.md`). Configuration resolves from `user_home` (`~/.nyssa-ai/plan-product/`) to `repo_root` (`<repo_root>/.nyssa-ai/plan-product/config.json`). Templates are copied locally so teams can customize document shape. Any mutable runtime state or usage telemetry lives strictly under `runtime_root` (`<runtime_root>/usage/`). Tracked AST symbol snapshots live at `docs/code-map/codegraph.db`.

## Tooling

- `npm run validate`: repository structure, `harness-adapter` sync, and planning document validation (`src/validation/validate.mjs`).
- `npm run assemble`: verify `harness-adapter` manifests match `plugin.json` (`scripts/assemble.mjs check`).
- `npm test`: unit (`test/unit/`) and end-to-end workflow (`test/use_case/`) tests.
- `npm run eval:prepare`: validate evaluation scenarios (`evals/scenarios/product-planning/prepare.mjs`).
- `npm pack --dry-run`: inspect the release package.

## Constraints and Unknowns

Preserve existing documents and templates. Validate configured destinations inside `repo_root` before initialization writes. Never commit installation-specific absolute paths or `runtime_root` state.
