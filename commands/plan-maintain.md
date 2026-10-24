---
description: Upgrade legacy product planning documents from Model v1 to Model v2, or reconcile document integrity.
argument-hint: "[target repo or upgrade scope]"
---

> [!IMPORTANT] Scope Directive
> Entrypoint command for maintenance and model migrations. Invokes the `plan-product` facade skill and executes its internal `workflows/maintain.md` runbook.

# plan-maintain - upgrade and maintain planning docs

Load the `plan-product` skill and execute its `workflows/maintain.md` runbook. The workflow owns the model version detection, deterministic migration coordination, and document verification; this command file is only the entry point.

Inspect the target repository planning configuration and documents. If legacy Model v1 patterns are present (`version: 1`, `F-Nxx`, `UC-nnn`, `R-NNN`), invoke the migration script to upgrade to canonical Model v2 (`version: 2`, `F-gg.nn`, `UC-gg.nn.uu`, `R-pp.ss`), then verify link and schema integrity.

## Invocation Context

Target / focus: $ARGUMENTS

## Writes

- `.nyssa-ai/plan-product/config.json` (bumped to `version: 2`)
- configured templates under `.plan-product/templates/`
- feature guides and folders under `docs/features/`
- feature inventory, usually `docs/features.md`
- delivery roadmap, usually `docs/roadmap.md`

Use `scripts/migrate.mjs` for mechanical migrations. Preserves all user-authored content, custom templates, and local notes. Verify that upgraded feature and use-case documents remain in non-technical, user-focused language and that `## Feature Checklist Summary` in `features.md` contains no links.
