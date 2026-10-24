---
id: C-01
type: domain-model
status: active
---

# C-01: Canonical Planning Taxonomy & Hierarchy

## Summary

`plan-product` organizes product planning into a five-tier hierarchy: Product Vision, Domain Concepts (`C-nn`), Functional Feature Groups (`F-gg.nn`), Actor Use Cases (`UC-gg.nn.uu`), and Phased Roadmap Steps (`R-pp.ss`). This separation keeps functional capability organization stable while allowing delivery sequencing to adapt independently.

## Core Model / Stages

- **Product Vision & Tech Context** (`docs/product.md`, `docs/tech-stack.md`): Overarching purpose, target audience, boundaries, success signals, and descriptive technology choices.
- **Concepts & Macro-Flows (`C-nn`)** (`docs/concepts/c-nn-short-slug.md`): Atomic domain entities, system-wide invariants, and cross-feature stage progressions (`01`–`99`).
- **Feature Groups & Features (`F-gg.nn`)** (`docs/features.md`, `docs/features/f-gg.nn/feature.md`): Cohesive functional areas (`gg`, where `00` = Foundation) and sequential capabilities (`nn`) within each group.
- **Actor Use Cases (`UC-gg.nn.uu`)** (`docs/features/f-gg.nn/uc-gg.nn.uu-short-slug.md`): Concrete step-by-step actor workflows (`uu`) inheriting their parent feature's group and number (`gg.nn`).
- **Roadmap Steps (`R-pp.ss`)** (`docs/roadmap.md`): Technical delivery phases (`pp`) and ordered work steps (`ss`) that complete and verify target use cases or foundational features.

## Invariants & Rules

- **Functional Grouping vs. Build Order**: Feature IDs (`F-gg.nn`) reflect functional domain cohesion and never change when delivery order shifts; roadmap steps (`R-pp.ss`) own build order and may pull across any functional group.
- **Identity Immutability**: Assigned `C-nn`, `F-gg.nn`, `UC-gg.nn.uu`, and `R-pp.ss` identifiers are never renumbered or reused once established.
- **Non-Technical Capability Language**: Product, concept, feature, and use-case documents must use plain user-outcome and domain language; concrete technology selections belong only in `docs/tech-stack.md` and `docs/roadmap.md`.
- **Bi-Directional Traceability**: Concepts and participating features link to each other reciprocally, features link to their child use cases, and roadmap steps link to the use cases (or fallback features) they deliver.

## Participating Features

- [F-01.01: Feature Catalog & Progress Tracking](../features/f-01.01/feature.md) — indexes `F-gg.nn` capabilities and tracks completion across functional groups.
- [F-01.03: Functional Feature Grouping](../features/f-01.03/feature.md) — enforces two-digit functional grouping (`F-gg.nn`) and inherited use-case numbering (`UC-gg.nn.uu`).
- [F-03.01: Phased Delivery Roadmap](../features/f-03.01/feature.md) — sequences `R-pp.ss` delivery steps targeting `UC-gg.nn.uu` and `F-gg.nn` independently of feature groups.
- [F-04.01: Legacy Planning Document Upgrade](../features/f-04.01/feature.md) — migrates legacy v1 identifiers (`F-Nxx`, `UC-nnn`, `R-NNN`) into the v2 canonical taxonomy.
