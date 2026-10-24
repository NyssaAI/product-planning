---
id: C-02
type: flow
status: active
---

# C-02: End-to-End Product Planning Lifecycle

## Summary

Teams progress from an initial product idea to verifiable delivery steps through a five-stage conversational macro-flow: Workspace Setup, Product & Concept Discovery, Feature Scoping, Use-Case Mapping, and Roadmap Sequencing. Each stage builds on confirmed artifacts from earlier stages while catching scope overlaps and broken references before work begins.

## Core Model / Stages

```text
Stage 1: Workspace Setup & Customization (F-00.01, F-00.03)
  Handoff: Validated project paths and starter templates exist
  |
  v
Stage 2: Product & Concept Discovery (F-00.02, F-01.01)
  Handoff: Confirmed product capsule, initial feature catalog, and core concepts (C-nn)
  |
  v
Stage 3: Feature Boundary Hardening (F-01.02, F-01.03)
  Handoff: Non-overlapping feature guides (F-gg.nn) with explicit scope and acceptance checks
  |
  v
Stage 4: Actor Use-Case Mapping (F-01.02)
  Handoff: Concrete ASCII process trees (UC-gg.nn.uu) with entry routes and failure paths
  |
  v
Stage 5: Phased Roadmap Sequencing (F-03.01)
  Handoff: Dependency-ordered steps (R-pp.ss) with user-verifiable checkpoints
```

## Invariants & Rules

- **Confirmation Gate Before Write**: Every stage presents a synthesized summary (product capsule, concept model, feature boundary, use-case flow, or step sequence) with `[inferred]` markers for user approval before modifying planning documents.
- **Adversarial Contradiction & Overlap Check**: No feature or use case may be finalized if it duplicates or contradicts a sibling capability or concept invariant; overlaps must be resolved by merging, splitting, or narrowing first.
- **Verification Checkpoint Cadence**: Every open roadmap step must define a concrete user-observable `Verify:` checkpoint or defer with `Verify: with R-pp.ss` for at most two consecutive open steps.

## Participating Features

- [F-00.02: Core Product Overview Documents](../features/f-00.02/feature.md) — drives Stage 2 product discovery and overview confirmation.
- [F-01.01: Feature Catalog & Progress Tracking](../features/f-01.01/feature.md) — seeds and synchronizes the capability catalog across Stages 2 through 5.
- [F-01.02: Feature Scope Guides & Actor Use Cases](../features/f-01.02/feature.md) — executes Stage 3 boundary hardening and Stage 4 actor workflow mapping.
- [F-03.01: Phased Delivery Roadmap](../features/f-03.01/feature.md) — executes Stage 5 delivery sequencing, dependency validation, and status tie-out.
