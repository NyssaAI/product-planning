---
id: F-003
phase: 0
status: planned
---

# F-003 Templates and Schema

## Summary

Provide reusable templates and a config schema for consistent plan-product artifacts.

## Use Case

New repos or new features can start from predictable file shapes instead of ad hoc markdown.

## Scope

- Own `.plan-product/schema.json`.
- Own `.plan-product/templates/`.
- Include templates for product, features, tech stack, and feature detail guides.

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
