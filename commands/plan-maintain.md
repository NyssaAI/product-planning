---
description: Upgrade legacy product planning documents from Model v1 or legacy roadmap layouts to Model v2, or reconcile document integrity.
argument-hint: "[repo_root or upgrade scope]"
---

> [!IMPORTANT] Scope Directive
> Entrypoint command for maintenance and model migrations. Invokes the `plan-product` facade skill and executes its internal `references/workflow-maintain.md` runbook.

# plan-maintain - upgrade and maintain planning docs

Load the `plan-product` skill and execute its `references/workflow-maintain.md` runbook. The workflow owns model version detection, deterministic migration coordination, and document verification; this command file is only the entry point.

Inspect `repo_root` planning configuration and documents. If legacy Model v1 patterns (`.plan-product/`, `version: 1`, `F-Nxx`, `UC-nnn`, `R-NNN`) or legacy pre-rename layouts (`docs/roadmap.md`, `R-pp.ss`, concept `type:`, `.nyssa-ai/plan-product/usage/`) are present, invoke the migration script to upgrade to zero-footprint canonical Model v2 (`docs/GLOSSARY.md`, `F-gg.nn`, `UC-gg.nn.uu`, `docs/plans/development-plan.md`, `DP-pp.ss`, concept `kind:`, `.nyssa-ai/plan-product/runtime/usage/`, pruning copied schemas/templates and retaining sparse `.nyssa-ai/plan-product/config.json` only when custom non-default paths exist), then verify link and schema integrity.

## Invocation Context

Target / focus: $ARGUMENTS

## Writes

- `.nyssa-ai/plan-product/config.json` (pruned when using default `docs/` paths, or upgraded to a sparse `version: 2` override when custom paths exist)
- `docs/GLOSSARY.md` (if missing)
- feature guides and folders under `docs/features/` and concepts under `docs/concepts/`
- feature inventory, usually `docs/features.md`
- phased development plan, usually `docs/plans/development-plan.md`

Use `src/migration/migrate.mjs` locally (or `skills/plan-product/scripts/migration/migrate.mjs` in Tessl installs) for mechanical migrations. Preserves all user-authored content and local notes while pruning copied stock schemas/templates. Verify that upgraded feature and use-case documents remain in non-technical, user-focused language and that `## Feature Checklist Summary` in `features.md` contains no links.
