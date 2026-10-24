---
description: Interview the user and create or update one plan-product feature guide, then check for duplicate or contradictory ownership.
argument-hint: "[feature id or name, e.g. F-01.01]"
---

> [!IMPORTANT] Scope Directive
> Entrypoint command for defining individual features. Invokes the `plan-product` facade skill and executes its internal `workflows/feature.md` runbook.

# plan-feature - define a feature

Load the `plan-product` skill and execute its `workflows/feature.md` runbook. The workflow owns the boundary-confirmation step, the `[inferred]` marking, and the cross-feature uniqueness and contradiction pass; this command file is only the entry point.

Interview the user and create or update one plan-product feature guide. Confirm the feature boundary before writing, then check for duplicate or contradictory ownership across existing feature guides.

## Invocation Context

Target feature: $ARGUMENTS

## Writes

- the configured feature inventory path, usually `docs/features.md`
- the configured feature guide path from `structure.features.featurePathPattern`

Use `.nyssa-ai/plan-product/config.json` for paths and `paths.featureTemplate` for file shape. The feature guide should keep `Summary`, `User Need`, `Conceptual Context`, `Use Cases`, `Scope`, `Out of Scope`, `Inputs`, `Outputs`, `Acceptance`, and `Dependencies` distinct.

Do not leave placeholder use-case links. List only real `UC-gg.nn.uu` files or write `None yet.`. Use `plan-use-case` only when the user asks to document specific workflows. Write feature guides and inventory entries in plain, non-technical user-outcome language; never leak overly technical decisions or technology selections into features.
