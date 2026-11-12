# plan-product - Project Notes

Same content as `CLAUDE.md`. Authoritative domain terms and 5-root filesystem boundaries are defined in [`docs/GLOSSARY.md`](docs/GLOSSARY.md). This repository owns the `plan-product` planning facade skill, encapsulated workflows, direct commands, and dependency-free Node.js Scale A runtime modules.

## Capabilities

- `plan-product` facade: unified conversational planning entrypoint dispatching to internal workflows.
  - `workflows/product.md`: Product Vision, Ubiquitous Language (`docs/GLOSSARY.md`), feature inventory, and descriptive technology context.
  - `workflows/concept.md`: atomic domain models and cross-feature macro-flows (`C-nn`, `kind: domain-model` | `flow`).
  - `workflows/feature.md`: feature identity (`F-gg.nn`), user need, boundaries, acceptance checks, and dependencies.
  - `workflows/use-case.md`: actor workflows (`UC-gg.nn.uu`), entry routes, process trees, alternatives, and failures.
  - `workflows/development-plan.md`: phased development plan (`docs/plans/development-plan.md`), stable step IDs (`DP-pp.ss`), dependencies, and `- Verify:` checkpoints.
  - `workflows/maintain.md`: model versioning, legacy migration (`v1` and `docs/roadmap.md` to `v2`), and reference reconciliation.
- Matching slash commands in `commands/`: `plan-product`, `plan-concept`, `plan-feature`, `plan-use-case`, `plan-development`, `plan-maintain`.

## Repository contract

Configuration resolves in strict precedence from `user_home` (`~/.nyssa-ai/plan-product/`) to `repo_root` (`<repo_root>/.nyssa-ai/plan-product/config.json`). Read configured templates immediately before writing. Committed paths must be `repo_root`-relative; mutable telemetry and runtime state belong strictly under `runtime_root` (`<runtime_root>/usage/`, e.g. `.nyssa-ai/plan-product/runtime/usage/`).

Preserve user-authored documents, local notes, custom templates, and stable identities (`Merge-by-Heading Preservation` and `Template-Only Detection`). Ask only for missing information or unresolved decisions. Product requirements belong here; engineering execution belongs to `dev-delivery`. Feature naming enforces canonical action- and safeguard-oriented formulas (e.g. `Update Tasks & Projects without Overwriting Personal Notes`), strictly banning plumbing jargon (*surgical*, *storage*, *ingestion*, *syndication* — *canonical* is permitted) and vague 1–2 word stubs.

## Structure

- `src/init/`: path containment (`repo-paths.mjs`) and deterministic initializer (`init.mjs`).
- `src/migration/`: deterministic Model v1 and legacy roadmap migrator (`migrate.mjs`).
- `src/validation/`: repository structure, `harness-adapter`, and planning contract validator (`validate.mjs`).
- `scripts/assemble.mjs`: maintainer build script projecting `plugin.json` into host `harness-adapter` manifests.
- `skills/plan-product/`: unified facade skill (`SKILL.md`), bundled `assets/`, and six encapsulated workflows (`workflows/`).
- `commands/`: matching command entrypoints.
- `docs/`: `GLOSSARY.md`, `product.md`, `features.md`, `tech-stack.md`, `concepts/`, `features/`, `plans/development-plan.md`, and `code-map/codegraph.db`.
- `test/unit/` & `test/use_case/`: fast isolated unit tests and end-to-end CLI workflow tests.
- `evals/scenarios/product-planning/`: routing and content evaluations.

Node.js 22 or later runs all `src/` modules and tests with zero runtime dependencies. Run `npm run validate`, `npm run assemble`, `npm test`, `npm run eval:prepare`, and `npm pack --dry-run` after relevant changes.

# Development standards (typescript)
<!-- dev-standards: language=typescript version=0.10.8 revision=cff6156b186231685082c79becccf1db2c30abed sha256=3c3fc2013b1aa98e2704bdf6a3bfcd99659a7b19cf7a72c59ede7d1ae0f8d00d -->

- **Ubiquitous Language**: Ground all domain concepts, variables, boundary DTOs, and state transitions in the project's authoritative Ubiquitous Language (`docs/GLOSSARY.md` or `docs/concepts/`, and `apps/<app>/docs/GLOSSARY.md` + root Context Map in a monorepo). Banned synonyms and naming drift are strictly prohibited (`ARCH-NAME`).
- **Code Navigation (`CodeGraph`)**: Reach for `codegraph_explore` (bundled in the `dev-standards` MCP server, or `codegraph explore "<query>"` via CLI) backed by the pre-indexed `docs/code-map/codegraph.db` snapshot (`apps/<app>/docs/code-map/codegraph.db` and `tools/<tool>/docs/code-map/codegraph.db` in a monorepo) before executing recursive file searches (`find`, `dir`, globbing) or broad repository greps (`rg`, `Select-String`). Never generate `CODE_MAP.md` files; refresh snapshots after structural symbol changes with `--sync-codegraph`.
- **Repository & Architecture Standards**: Follow the external `dev-standards` plugin (`nyssa-ai/dev-standards`) rules in `<plugin_root>/skills/dev-standards/rules/repo-standards.md`, `<plugin_root>/skills/dev-standards/rules/architecture-standards.md`, and `<plugin_root>/skills/dev-standards/rules/typescript-standards.md` before changing owned TypeScript code or `repo_root` layout (`src/`, `test/unit/`, `test/use_case/`, Allowed-Set `docs/` with `docs/GLOSSARY.md` and `docs/specs/*.json` only, single root `.temp/`, and `user_home` -> `repo_root` `.nyssa-ai/` config with gitignored `.nyssa-ai/*/runtime/`). Structure `src/` as a Scale A capability suite (`src/<capability>/`) or Scale B multi-transport modular monolith (transport-free `core/<concept>/` with inward boundaries, independent `<feature>/` slices, thin `transports/<protocol>/`, `hosting/`), using Role-Named Collaborator Contracts (no `*Port` or `I` prefix) and Entity-First Implementations (`<Role><Mechanism>`); never create horizontal grab-bag directories (`adapters`, `ports`, `storage`, `contracts`, `shared`, `utils`, `helpers`, `common`, `misc`, `types`, `models`) or plumbing DTO suffixes (`*DTO`, `*Dto`, `*Schema`, `*Model`, `*Input`, `*Output`, `*Class`, `*Type`, `*Object`, `*Data`). Write a leading `// Responsibility: <summary>` comment on authored files and auto-generate/sync `// Public interface:` ASCII trees with `--update-headers` rather than hand-editing trees (`ARCH-HEADER`). Do not store or commit `dev-standards` bundles, `.agents/`, `.hermes/`, or `artifacts/` inside `repo_root`. Repository requirements and explicit user instructions take precedence; record the scope and reason of an exception in the change description.
- **References & Examples**: Read relevant `dev-standards` TypeScript references under `<plugin_root>/skills/dev-standards/references/typescript/` (`logging.md`, `testing.md`, `code-smells.md`, and `examples/`) when designing operational boundaries, tests, or evaluating code smells with source evidence and counterexamples.
- **Verification & Adoption**: Run applicable `npm run build`, `npm run test:unit`, and `npm run test:use-case` commands locally. Unit tests must work without Docker; requested infrastructure tests require Docker and must report missing prerequisites as blocked, never as a pass. Use the external structural checker (`src/typescript/check.mjs` and `src/typescript/check_adoption.py` from `<plugin_root>`) as local feedback and report unsupported coverage separately from rule violations:

```text
python <plugin_root>/src/typescript/check_adoption.py .
python <plugin_root>/src/typescript/check_adoption.py . --sync
python <plugin_root>/src/typescript/check_adoption.py . --update-headers
python <plugin_root>/src/typescript/check_adoption.py . --sync-codegraph
python <plugin_root>/src/typescript/check_adoption.py . --run
```
