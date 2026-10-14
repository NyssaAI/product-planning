# plan-product - Project Notes

Same content as `CLAUDE.md`. This repository owns four product-planning skills and a dependency-free initializer.

## Capabilities

- `plan-product`: product definition, feature inventory, and descriptive technology context.
- `plan-feature`: feature identity, user need, boundaries, acceptance checks, and dependencies.
- `plan-use-case`: actor workflows, entry routes, process trees, alternatives, and failures.
- `plan-roadmap`: product delivery order, stable slice IDs, dependencies, and acceptance checkpoints.

## Repository contract

`.plan-product/config.json` is the path authority. Read configured templates immediately before writing. Committed paths must be repo-relative; installation-specific locations belong in environment variables.

Preserve user-authored documents, local notes, custom templates, and stable identities. Ask only for missing information or unresolved decisions. Product requirements belong here; engineering execution belongs to the user's development workflow.

## Structure

- `.plan-product/`: planning config, schema, and six document templates.
- `skills/`: four public skill bundles.
- `commands/`: matching command entrypoints.
- `scripts/init.mjs`: creates missing planning assets from the target repo root.
- `docs/`: product documentation, feature guides, and product roadmap.
- `test/`: initialization, packaging, and planning-contract regression checks.
- `evals/product-planning/`: routing and content evaluations for the four skills.

Node.js 22 or later runs the initializer and tests. Do not add unnecessary third-party dependencies. Run `npm test`, `npm run eval:prepare`, and `npm pack --dry-run` after relevant changes.
