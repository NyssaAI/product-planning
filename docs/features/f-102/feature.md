---
id: F-102
phase: 1
status: complete
---

# F-102 Feature Detail Docs

## Summary

Store detailed feature guides under `docs/features/`.

## User Need

A feature can carry scope, inputs, outputs, acceptance criteria, and dependencies without bloating the root inventory.

## Use Cases

- [UC-001: Author a Feature Guide From the Template](uc-001-author-feature-guide.md)

## Scope

- Own `docs/features/`.
- Use lowercase feature ID folders, for example `docs/features/f-102/`.
- Put the main guide in `feature.md`.
- Put use cases beside it as `uc-001-short-slug.md`.
- Keep each guide tied to one inventory feature.

## Out of Scope

- Implementation plans under `docs/plans/`; F-301 and F-401 own plan naming and linking there.
- Generated code-map module docs.

## Inputs

- `docs/features.md`.
- `.plan-product/templates/feature.md`.

## Outputs

- Detailed feature guide markdown files.

## Acceptance

- `docs/features/README.md` explains the convention.
- Feature guide files exist for inventory entries.
- Guides include scope, inputs, outputs, acceptance, and dependencies.

## Dependencies

- F-101.
