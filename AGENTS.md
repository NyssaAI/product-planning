# plan-product - Project Notes

Same content as `CLAUDE.md`. Authoritative domain terms and 5-root filesystem boundaries are defined in [`docs/GLOSSARY.md`](docs/GLOSSARY.md). This repository owns the `plan-product` planning facade skill, encapsulated workflows, direct commands, and dependency-free Node.js Scale A runtime modules.

## Capabilities

- `plan-product` facade: unified conversational planning entrypoint dispatching to internal workflow references.
  - `references/workflow-product.md`: Product Vision, Ubiquitous Language (`docs/GLOSSARY.md`), feature inventory, and descriptive technology context.
  - `references/workflow-concept.md`: atomic domain models and cross-feature macro-flows (`C-nn`, `kind: domain-model` | `flow`).
  - `references/workflow-feature.md`: feature identity (`F-gg.nn`), user need, boundaries, acceptance checks, and dependencies.
  - `references/workflow-use-case.md`: actor workflows (`UC-gg.nn.uu`), entry routes, process trees, alternatives, and failures.
  - `references/workflow-development-plan.md`: phased development plan (`docs/plans/development-plan.md`), stable step IDs (`DP-pp.ss`), dependencies, and `- Verify:` checkpoints.
  - `references/workflow-maintain.md`: model versioning, legacy migration (`v1` and `docs/roadmap.md` to `v2`), and reference reconciliation.
  - `references/configuration-and-paths.md`: zero-footprint config/template precedence, 5-root `runtime_root`, opt-in telemetry, and script resolution.
- Matching slash commands in `commands/`: `plan-product`, `plan-concept`, `plan-feature`, `plan-use-case`, `plan-development`, `plan-maintain`.

## Repository contract

Configuration resolves zero-footprint from bundled `plugin_root` defaults (`skills/plan-product/assets/`) -> `user_home` (`~/.nyssa-ai/plan-product/`) -> optional opt-in `repo_root` override (`<repo_root>/.nyssa-ai/plan-product/config.json`). Read resolved templates immediately before writing. Committed paths must be `repo_root`-relative; mutable telemetry and runtime state belong strictly under `runtime_root` (`<runtime_root>/usage/`, e.g. `~/.nyssa-ai/plan-product/runtime/usage/`).

Preserve user-authored documents, local notes, custom templates, and stable identities (`Merge-by-Heading Preservation` and `Template-Only Detection`). Ask only for missing information or unresolved decisions. Product requirements belong here; engineering execution belongs to `dev-delivery`. Feature naming enforces canonical action- and safeguard-oriented formulas (e.g. `Update Tasks & Projects without Overwriting Personal Notes`), strictly banning plumbing jargon (*surgical*, *storage*, *ingestion*, *syndication* — *canonical* is permitted) and vague 1–2 word stubs.

## Structure

- `src/init/`: path containment (`repo-paths.mjs`) and deterministic initializer (`init.mjs`).
- `src/migration/`: deterministic Model v1 and legacy roadmap migrator (`migrate.mjs`).
- `src/validation/`: repository structure, `harness-adapter`, and planning contract validator (`validate.mjs`).
- `scripts/assemble.mjs`: maintainer build script projecting `plugin.json` into host `harness-adapter` manifests.
- `skills/plan-product/`: unified facade skill (`SKILL.md`), bundled `assets/`, deterministic `scripts/`, and `references/` (`configuration-and-paths.md` + six `workflow-*.md` runbooks).
- `commands/`: matching command entrypoints.
- `docs/`: `GLOSSARY.md`, `product.md`, `features.md`, `tech-stack.md`, `concepts/`, `features/`, and `plans/development-plan.md` (zero `docs/code-map/`; CodeGraph stays strictly ephemeral in gitignored `.temp/codegraph/`).
- `test/unit/` & `test/use_case/`: fast isolated unit tests and end-to-end CLI workflow tests.
- `evals/scenarios/product-planning/`: routing and content evaluations.

Node.js 22 or later runs all `src/` modules and tests with zero runtime dependencies. Run `npm run validate`, `npm run assemble`, `npm test`, `npm run eval:prepare`, and `npm pack --dry-run` after relevant changes.

# Development standards (typescript)
<!-- dev-standards: language=typescript version=0.11.2 revision=0793bb4775e8cadbefb3cbc8220799b072fee031 sha256=3f4c5111c3d67e7610db57aea906f6147c00b312378bb883cf0832d438a07467 -->

- **Ubiquitous Language**: Ground all domain concepts, variables, boundary DTOs, and state transitions in the project's authoritative Ubiquitous Language (`docs/GLOSSARY.md` or `docs/concepts/`, and `apps/<app>/docs/GLOSSARY.md` + root Context Map in a monorepo). Banned synonyms and naming drift are strictly prohibited (`ARCH-NAME`).
- **Code Navigation (`CodeGraph`)**: Reach for `codegraph_explore` (bundled in the `dev-standards` MCP server, or `node <plugin_root>/skills/dev-standards/scripts/codegraph-mcp.mjs --cli explore "<query>"` via CLI — never bare `codegraph`) backed by strictly ephemeral gitignored indexes in `.temp/codegraph/` (never commit `codegraph.db` or create `.codegraph/` or `docs/code-map/`) before executing recursive file searches (`find`, `dir`, globbing) or broad repository greps (`rg`, `Select-String`). Never generate `CODE_MAP.md` files; warm or refresh ephemeral `.temp/codegraph/` indexes with `--sync-codegraph`.
- **Repository & Architecture Standards**: Follow the external `dev-standards` plugin (`nyssa-ai/dev-standards`) rules in `<plugin_root>/skills/dev-standards/rules/repo-standards.md`, `<plugin_root>/skills/dev-standards/rules/architecture-standards.md`, and `<plugin_root>/skills/dev-standards/rules/typescript-standards.md` before changing owned TypeScript code or `repo_root` layout (`src/`, `test/unit/`, `test/use_case/`, Allowed-Set `docs/` with `docs/GLOSSARY.md` and `docs/specs/*.json` only, single root `.temp/`, and `user_home` -> `repo_root` `.nyssa-ai/` config with gitignored `.nyssa-ai/*/runtime/`). Structure `src/` as a Scale A capability suite (`src/<capability>/`) or Scale B multi-transport modular monolith (transport-free `core/<concept>/` with inward boundaries, independent `<feature>/` slices, thin `transports/<protocol>/`, `hosting/`), using Role-Named Collaborator Contracts (no `*Port` or `I` prefix) and Entity-First Implementations (`<Role><Mechanism>`); never create horizontal grab-bag directories (`adapters`, `ports`, `storage`, `contracts`, `shared`, `utils`, `helpers`, `common`, `misc`, `types`, `models`) or plumbing DTO suffixes (`*DTO`, `*Dto`, `*Schema`, `*Model`, `*Input`, `*Output`, `*Class`, `*Type`, `*Object`, `*Data`). Write a leading `// Responsibility: <summary>` comment on authored files and auto-generate/sync `// Public interface:` ASCII trees with `--update-headers` rather than hand-editing trees (`ARCH-HEADER`). Do not store or commit `dev-standards` bundles, `codegraph.db`, `docs/code-map/`, `.codegraph/`, `.agents/`, `.hermes/`, or `artifacts/` inside `repo_root`. Repository requirements and explicit user instructions take precedence; record the scope and reason of an exception in the change description.
- **References & Examples**: Read relevant `dev-standards` TypeScript references under `<plugin_root>/skills/dev-standards/references/typescript/` (`logging.md`, `testing.md`, `code-smells.md`, and `examples/`) when designing operational boundaries, tests, or evaluating code smells with source evidence and counterexamples.
- **Verification & Adoption**: Run applicable `npm run build`, `npm run test:unit`, and `npm run test:use-case` commands locally. Unit tests must work without Docker; requested infrastructure tests require Docker and must report missing prerequisites as blocked, never as a pass. Use the external structural checker (`src/typescript/check.mjs` and `src/typescript/check_adoption.py` from `<plugin_root>`) as local feedback and report unsupported coverage separately from rule violations:

```text
python <plugin_root>/src/typescript/check_adoption.py .
python <plugin_root>/src/typescript/check_adoption.py . --sync
python <plugin_root>/src/typescript/check_adoption.py . --update-headers
python <plugin_root>/src/typescript/check_adoption.py . --sync-codegraph
python <plugin_root>/src/typescript/check_adoption.py . --run
```
