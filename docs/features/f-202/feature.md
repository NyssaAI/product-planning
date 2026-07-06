---
id: F-202
phase: 2
status: planned
---

# F-202 Code Map Planning Handoff

## Summary

Define how planning workflows use plan-product feature guides together with code-map artifacts.

## Use Case

Before implementation, an agent can load the relevant feature guide and code-map context for the affected source area.

## Scope

- Establish a handoff pattern between `docs/features.md`, `docs/features/`, and `docs/code-map/`.
- Treat `docs/code-map/` as the generated implementation-planning context.

## Out of Scope

- Full plan-product rewrite.
- Automatic feature-to-code ownership inference.

## Inputs

- `docs/features.md`
- `docs/features/`
- `docs/code-map/`

## Outputs

- Repeatable planning context handoff.

## Acceptance

- Handoff expectations are documented.
- Feature guides can name related code-map artifacts when they exist.
- plan-product config remains repo-relative.

## Dependencies

- F-201.
