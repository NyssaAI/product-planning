---
id: F-103
phase: 1
status: planned
---

# F-103 Feature Phase Organization

## Summary

Organize features into phases that communicate build order and dependency chains.

## Use Case

An agent can prioritize work by phase instead of treating the feature inventory as an unordered list.

## Scope

- Use `F-Nxx` IDs where `N` maps to delivery phase.
- Group inventory sections by phase.
- Keep phase progress visible at the top of `docs/features.md`.

## Out of Scope

- Automated scheduling.
- Sprint or release management.

## Inputs

- Feature dependencies.
- Product planning priorities.

## Outputs

- Phased feature inventory.

## Acceptance

- `docs/features.md` has a phase progress table.
- Checklist summary is grouped by phase.
- Detail inventory is grouped by phase.

## Dependencies

- F-101.
