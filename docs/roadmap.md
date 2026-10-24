# Product Roadmap

The [feature inventory](features.md) owns functional capability grouping and completion status. This roadmap sequences delivery phases and steps in the order that is technically appropriate.

---

## Steps

### Phase 01: Core Planning & V2 Numbering Model

- [x] R-01.01: Establish customizable planning locations and starter templates — [F-00.01](features/f-00.01/feature.md)
    - Seed configuration, schema, starter templates, and core overview documents while preserving existing user content and custom paths.
    - Verify: initialize an empty temporary repository with `node scripts/init.mjs`, customize `docs/product.md`, initialize again, and confirm the custom content survives.
- [x] R-01.02: Define product overview, functional feature groups, and actor use cases — [UC-01.02.01](features/f-01.02/uc-01.02.01-author-feature-guide.md) — after: R-01.01
    - Capture user-facing feature catalogs grouped by `F-gg.nn` and concrete actor workflows mapped as `UC-gg.nn.uu` process trees.
    - Verify: inspect `docs/features.md` and `docs/features/f-01.02/uc-01.02.01-author-feature-guide.md` and confirm all links resolve via `npm run validate`.
- [x] R-01.03: Sequence phased delivery steps and verification checkpoints — [F-03.01](features/f-03.01/feature.md) — after: R-01.02
    - Order delivery work into `R-pp.ss` steps targeting `UC-gg.nn.uu` use cases (with `F-gg.nn` fallback) and validate dependency order and `- Verify:` checkpoints.
    - Verify: run the evaluation scenario preparation and contract checks with `npm run eval:prepare`.
- [x] R-01.04: Upgrade legacy v1 repositories to the v2 numbering model — [F-04.01](features/f-04.01/feature.md) — after: R-01.03
    - Translate `F-Nxx`, `UC-nnn`, and `R-NNN` documents to `F-gg.nn`, `UC-gg.nn.uu`, and `R-pp.ss` deterministically without leaving legacy rules in the main workflows.
    - Verify: run `npm test` to execute the v1-to-v2 migration fixture test and confirm all migrated paths, frontmatter fields, and links pass.
