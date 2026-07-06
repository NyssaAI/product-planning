---
id: F-201
phase: 2
status: planned
---

# F-201 Product Code Map

## Summary

Create a plan-product-owned code-map location for planning-oriented code context.

## Use Case

Product planning can reference code context without mixing plan-product artifacts with existing generated module-index artifacts.

## Scope

- Own `docs/code-map/`.
- Use `docs/code-map/` as the current generated context location.
- Document the generated context in `docs/code-map/README.md`.

## Out of Scope

- Full generator rewrite.
- Automatic feature-to-code ownership inference.

## Inputs

- Existing code-map generator output.
- plan-product feature guides.

## Outputs

- Product-oriented code-map artifact directory.

## Acceptance

- `docs/code-map/README.md` exists.
- `.plan-product/config.json` points to `docs/code-map`.
- Agent instructions include `docs/code-map/` in the plan-product structure.

## Dependencies

- F-001.
- F-101.
