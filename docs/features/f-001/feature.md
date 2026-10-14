---
id: F-001
phase: 0
status: complete
---

# F-001 plan-product Path Map

## Summary

Define the committed, repo-relative path map for plan-product artifacts.

## User Need

An agent can resolve plan-product files without relying on hardcoded local paths or installation-specific plugin cache locations.

## Use Cases

None yet.

## Scope

- Own `.plan-product/config.json`.
- Keep plan-product artifact paths repo-relative.
- Point to canonical product, feature, stack, schema, and template locations.

## Out of Scope

- Other plugins' configuration.
- User-specific absolute paths.
- Installed plugin cache paths.

## Inputs

- `.plan-product/config.json`
- plan-product artifact layout

## Outputs

- Portable path contract for plan-product tools and skills.

## Acceptance

- `.plan-product/config.json` exists.
- Config paths are repo-relative.
- Config contains only plan-product-owned paths.

## Dependencies

- None.
