---
description: Upgrade legacy product planning documents from Model v1 or legacy roadmap layouts to Model v2, or reconcile document integrity.
argument-hint: "[repo_root or upgrade scope]"
---

> [!IMPORTANT] Scope Directive
> Entrypoint command for maintenance and model migrations. Invokes the `plan-product` facade skill and executes its internal `workflows/maintain.md` runbook.

# plan-maintain - upgrade and maintain planning docs

Load the `plan-product` skill and execute its `workflows/maintain.md` runbook. The workflow owns model version detection, deterministic migration coordination, and document verification; this command file is only the entry point.

Inspect `repo_root` planning configuration and documents. If legacy Model v1 patterns (`.plan-product/`, `version: 1`, `F-Nxx`, `UC-nnn`, `R-NNN`) or legacy pre-rename layouts (`docs/roadmap.md`, `R-pp.ss`, concept `type:`, `.nyssa-ai/plan-product/usage/`) are present, invoke the migration script to upgrade to canonical Model v2 (`.nyssa-ai/plan-product/`, `version: 2`, `docs/GLOSSARY.md`, `F-gg.nn`, `UC-gg.nn.uu`, `docs/plans/development-plan.md`, `DP-pp.ss`, concept `kind:`, `.nyssa-ai/plan-product/runtime/usage/`), then verify link and schema integrity.

## Invocation Context

Target / focus: $ARGUMENTS

## Writes

- `.nyssa-ai/plan-product/config.json` (bumped to `version: 2`)
- configured templates under `.nyssa-ai/plan-product/templates/`
- `docs/GLOSSARY.md` (if missing)
- feature guides and folders under `docs/features/` and concepts under `docs/concepts/`
- feature inventory, usually `docs/features.md`
- phased development plan, usually `docs/plans/development-plan.md`

Use `src/migration/migrate.mjs` for mechanical migrations. Preserves all user-authored content, custom templates, and local notes. Verify that upgraded feature and use-case documents remain in non-technical, user-focused language and that `## Feature Checklist Summary` in `features.md` contains no links.
