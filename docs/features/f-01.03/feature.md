---
id: F-01.03
group: "01"
status: complete
---

# F-01.03 Functional Feature Grouping

## Summary

Organize related capabilities into two-digit functional Feature Groups (`F-gg.nn`) so related features stay clustered together regardless of when they are built or how large the catalog grows.

## User Need

Users want related features—such as all authentication capabilities or all reporting capabilities—to sit together in the catalog and folder list, without hitting a 9-group ceiling or confusing functional relatedness with technical build order.

## Conceptual Context

- [C-01: Canonical Planning Taxonomy & Hierarchy](../../concepts/c-01-canonical-planning-taxonomy.md) — enforces two-digit functional grouping (`F-gg.nn`) and inherited use-case numbering (`UC-gg.nn.uu`).

## Use Cases

None yet.

## Scope

- Group features by functional domain using two-digit group numbers (`gg`) and two-digit feature numbers (`nn`).
- Inherit the parent feature's group and number in every use case ID (`UC-gg.nn.uu`) so any use case immediately identifies the capability it belongs to.
- Keep functional grouping independent of the delivery order on the roadmap.

## Out of Scope

- Deciding the technical order in which work is built (owned by F-03.01).
- Calendar scheduling or sprint planning.

## Inputs

- How capabilities relate to one another by user domain or product area.

## Outputs

- Consistently numbered features (`F-gg.nn`) and use cases (`UC-gg.nn.uu`) organized into cohesive functional groups.

## Acceptance

- Related capabilities share the same Feature Group (`gg`) and sort together cleanly past 9 groups and 9 features per group.
- Every use case ID (`UC-gg.nn.uu`) is unique across the entire product and visibly tied to its parent feature (`F-gg.nn`).
- Changing the build order on the roadmap never requires renumbering or moving a feature across functional groups.

## Dependencies

- F-01.01.
