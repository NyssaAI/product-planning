---
id: F-002
phase: 0
status: complete
---

# F-002 Docs Product Docs

## Summary

Make docs-based product files the canonical plan-product entry points.

## User Need

An agent can load product context from predictable docs files when defining product requirements.

## Use Cases

None yet.

## Scope

- Own `docs/product.md`, `docs/features.md`, and `docs/tech-stack.md`.
- Treat `docs/features.md` as the canonical feature inventory.
- Read upstream `STRATEGY.md` and `CONCEPTS.md` when present, but do not store those optional paths in plan-product config.

## Out of Scope

- Tool-specific runtime caches.

## Inputs

- Existing plugin docs.
- `.plan-product/config.json`

## Outputs

- Docs-level product planning documents.

## Acceptance

- `docs/product.md`, `docs/features.md`, and `docs/tech-stack.md` exist.
- `docs/features.md` links to detailed feature guides.
- Agent instructions identify docs files as canonical.

## Dependencies

- F-001.
