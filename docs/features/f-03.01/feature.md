---
id: F-03.01
group: "03"
status: complete
---

# F-03.01 Phased Delivery Roadmap

## Summary

Sequence delivery work into ordered phases and steps (`R-pp.ss`) with dependencies and observable verification checkpoints.

## User Need

Builders and product owners need a practical delivery sequence that orders work in the way it must actually be built and tested—pulling across any functional feature group as needed—and defines a concrete way to verify each step.

## Conceptual Context

- [C-01: Canonical Planning Taxonomy & Hierarchy](../../concepts/c-01-canonical-planning-taxonomy.md) — sequences `R-pp.ss` delivery steps targeting `UC-gg.nn.uu` and `F-gg.nn` independently of feature groups.
- [C-02: End-to-End Product Planning Lifecycle](../../concepts/c-02-product-planning-lifecycle.md) — executes Stage 5 delivery sequencing, dependency validation, and status tie-out.

## Use Cases

None yet.

## Scope

- Organize delivery into numbered Phases (`pp`) and Steps (`ss`) using `R-pp.ss` identifiers.
- Link each step to the specific use cases (`UC-gg.nn.uu`) it completes, or directly to a feature (`F-gg.nn`) when foundational work has no separate actor use cases.
- Allow technical delivery decisions, technology selections, and concrete verification instructions (`Verify:`) to be recorded on roadmap steps.
- Check that every incomplete feature is covered by roadmap steps, dependencies (`after:`) follow document order without cycles, and verification checkpoints occur regularly.

## Out of Scope

- Redefining feature scope or actor workflows (owned by F-01.02).
- Executing source code changes directly during roadmap planning.

## Inputs

- Approved feature catalog, feature guides, and use cases.
- Technical sequencing decisions, dependencies, and verification criteria from the user.

## Outputs

- A validated, dependency-ordered delivery roadmap (`docs/roadmap.md`) synchronized with feature completion status.

## Acceptance

- Every roadmap step links to valid use cases or foundational features and includes a concrete verification checkpoint (or a valid short deferral).
- All incomplete features in the catalog have roadmap step coverage, and no step appears before its declared dependencies.
- Completed steps remain locked as delivery history while open steps can be sequenced in the order that is technically appropriate.

## Dependencies

- F-01.01, F-01.02, F-01.03.
