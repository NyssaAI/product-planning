---
id: F-301
phase: 3
status: complete
---

# F-301 Implementation Roadmap

## Summary

A dependency-ordered roadmap of work slices at `docs/roadmap.md`, authored by the `plan-roadmap` skill, so build order can differ from feature phase order without distorting the feature inventory.

## User Need

Product planners and implementation agents need a place to sequence work by technical dependency. Feature IDs encode delivery phases, and real build order interleaves features across phases; the inventory cannot express that without losing its shape.

## Use Cases

None yet.

## Scope

- The roadmap artifact: ordered `R-NNN` slices, each referencing one parent feature guide, with optional `after:` dependencies and completion checkboxes.
- The `plan-roadmap` skill and `commands/plan-roadmap.md` entry point.
- The roadmap template at `.plan-product/templates/roadmap.md` and its bootstrap delivery.
- Config and schema entries: `paths.roadmap`, `paths.roadmapTemplate`, `structure.roadmap`.
- Tie-out validation: slice resolution, coverage of incomplete features, `after:` ordering, and status cross-check against the feature inventory.

## Out of Scope

- Feature definitions, phases, and status ownership — those stay in `docs/features.md` (F-101, F-103).
- Generated or derived ordering; the roadmap is authored, not computed.
- A validator script or `--doctor` integration; validation is skill-enforced.
- Dates, timelines, and milestone framing.

## Inputs

- `.plan-product/config.json` roadmap paths and `structure.roadmap`.
- `docs/features.md` and feature guides under `docs/features/`.
- `.plan-product/templates/roadmap.md` on first-run creation.
- User decisions from the `plan-roadmap` interview.

## Outputs

- `docs/roadmap.md` with dependency-ordered slices.
- With user confirmation, feature inventory checkbox and progress-table updates when slice completion resolves a status conflict.

## Acceptance

- The roadmap template ships in `.plan-product/templates/` and is copied by `--init`.
- `plan-roadmap` creates `docs/roadmap.md` from `paths.roadmapTemplate` when absent and validates tie-out on every run.
- Every slice resolves to an existing feature guide; every incomplete feature is covered; declared `after:` dependencies match document order.
- The path contract matches `.plan-product/config.json`.

## Dependencies

- F-101 (feature inventory), F-102 (feature detail docs), F-103 (feature phase organization).
