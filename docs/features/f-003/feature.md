---
id: F-003
phase: 0
status: complete
---

# F-003 Templates and Schema

## Summary

Provide reusable templates and a config schema for consistent plan-product artifacts.

## User Need

New repos or new features can start from predictable file shapes instead of ad hoc markdown.

## Use Cases

None yet.

## Scope

- Own `.plan-product/schema.json`.
- Own `.plan-product/templates/`.
- Include templates for product, feature inventory, tech stack, feature guides, use cases, and roadmaps.

## Out of Scope

- Full validation CLI.
- Runtime migration of old docs.

## Inputs

- plan-product config.
- Required artifact structure.

## Outputs

- Schema and starter templates.

## Acceptance

- Schema and templates exist.
- Templates match the naming convention and feature guide structure.
- Config points to schema and templates.

## Dependencies

- F-001.
