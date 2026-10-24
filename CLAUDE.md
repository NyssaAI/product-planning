# plan-product - Project Notes

Same content as `CLAUDE.md`. This repository owns the `plan-product` planning facade skill, encapsulated workflows, direct commands, and a dependency-free initializer.

## Capabilities

- `plan-product` facade: unified conversational planning entrypoint dispatching to internal workflows.
  - `workflows/product.md`: product definition, feature inventory, and descriptive technology context.
  - `workflows/feature.md`: feature identity, user need, boundaries, acceptance checks, and dependencies.
  - `workflows/use-case.md`: actor workflows, entry routes, process trees, alternatives, and failures.
  - `workflows/roadmap.md`: product delivery order, stable step IDs (R-pp.ss), dependencies, and acceptance checkpoints.
  - `workflows/maintain.md`: model versioning, legacy migration (v1 to v2), and reference reconciliation.
- Matching slash commands in `commands/`: `plan-product`, `plan-feature`, `plan-use-case`, `plan-roadmap`, `plan-maintain`.

## Repository contract

`.plan-product/config.json` is the path authority. Read configured templates immediately before writing. Committed paths must be repo-relative; installation-specific locations belong in environment variables.

Preserve user-authored documents, local notes, custom templates, and stable identities. Ask only for missing information or unresolved decisions. Product requirements belong here; engineering execution belongs to the user's development workflow.

## Structure

- `.plan-product/`: planning config, schema, and six document templates.
- `skills/plan-product/`: unified facade skill (`SKILL.md`) and five encapsulated workflows (`workflows/`).
- `commands/`: matching command entrypoints.
- `scripts/`: initializer (`init.mjs`), migrator (`migrate.mjs`), repo path resolver, and host manifest assembler (`assemble.mjs`).
- `docs/`: product documentation, feature guides, and product roadmap.
- `test/`: initialization, packaging, and planning-contract regression checks.
- `evals/scenarios/product-planning/`: routing and content evaluations.

Node.js 22 or later runs the initializer and tests. Do not add unnecessary third-party dependencies. Run `npm test`, `npm run assemble`, `npm run eval:prepare`, and `npm pack --dry-run` after relevant changes.
