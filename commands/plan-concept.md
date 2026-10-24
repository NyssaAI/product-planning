---
description: Interview the user and create or update one domain concept or macro-flow document, then synchronize links with product.md and participating features.
argument-hint: "[concept id or name, e.g. C-01 or Order Fulfillment]"
---

> [!IMPORTANT] Scope Directive
> Entrypoint command for defining core domain concepts and cross-feature macro-flows. Invokes the `plan-product` facade skill and executes its internal `workflows/concept.md` runbook.

# plan-concept - define a concept or macro-flow

Load the `plan-product` skill and execute its `workflows/concept.md` runbook. The workflow owns the archetype selection (`flow` vs `domain-model`), boundary enforcement against microscopic UI steps and technical implementation, and bi-directional cross-linking with `product.md` and participating `feature.md` guides; this command file is only the entry point.

Interview the user and create or update one atomic concept or macro-flow document under `docs/concepts/`. Confirm the concept model and invariants before writing, then synchronize links across `docs/product.md` and participating feature guides.

## Invocation Context

Target concept: $ARGUMENTS

## Writes

- the configured concept path from `structure.concepts.pathPattern`, usually `docs/concepts/c-nn-short-slug.md`
- the configured product doc path from `paths.product`, usually `docs/product.md`
- participating feature guides under `structure.features.featurePathPattern`

Use `.nyssa-ai/plan-product/config.json` for paths and `paths.conceptTemplate` for file shape. Keep `Summary`, `Core Model / Stages`, `Invariants & Rules`, and `Participating Features` distinct, written in plain, non-technical domain language.
