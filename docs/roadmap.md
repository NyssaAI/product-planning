# Product Roadmap

The [feature inventory](features.md) owns capability status. This roadmap describes delivery outcomes for the focused product-planning release.

## Slices

- [x] R-010: Establish the planning configuration and starter documents — [F-001](features/f-001/feature.md)
    - Preserve custom document paths and templates during repeated setup.
    - Verify: initialize an empty temporary repository, customize its product document, initialize again, and confirm the custom content survives.
- [x] R-011: Define product and feature boundaries — [F-102](features/f-102/feature.md) — after: R-010
    - Capture product purpose, feature ownership, and concrete actor workflows.
    - Verify: inspect the four bundled planning workflows and their matching document templates.
- [x] R-012: Sequence product deliverables — [F-301](features/f-301/feature.md) — after: R-011
    - Preserve identities and completion history while validating dependency and acceptance references.
    - Verify: run the retained roadmap evaluation scenario checks with `npm run eval:prepare`.
