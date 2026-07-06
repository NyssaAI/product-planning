---
id: F-002
phase: 0
status: planned
---

# F-002 Docs Product Docs

## Summary

Make docs-based product files the canonical plan-product entry points.

## Use Case

An agent can load product context from predictable docs files before planning implementation work.

## Scope

- Own `docs/product.md`, `docs/features.md`, and `docs/tech-stack.md`.
- Treat `docs/features.md` as the canonical feature inventory.
- Read upstream `STRATEGY.md` and `CONCEPTS.md` when present, but do not store those CE-owned paths in plan-product config.

## Out of Scope

- Generated code-map artifacts.
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
