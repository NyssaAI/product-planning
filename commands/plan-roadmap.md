---
description: Interview the user and create or update the dependency-ordered product delivery roadmap, then validate tie-out with the feature inventory.
argument-hint: "[slice or feature to sequence, e.g. R-003 or F-101]"
---

# plan-roadmap - sequence the work

Load the `plan-roadmap` skill and follow its workflow. The skill owns the stable-ID rules, the entry and exit validation passes, the per-check conflict handling, and the confirmation-gated inventory status update; this command file is only the entry point.

Interview the user and create or update the roadmap of dependency-ordered work slices. Each slice is a checkbox statement line with indented descriptive sub-bullets, a `Verify:` sub-bullet giving the user-verifiable stopping point (test instructions plus demo data when needed, or a `with R-NNN` deferral to a nearby checkpoint). Validate that every slice resolves to a real feature guide, every incomplete feature is covered, declared `after:` dependencies match the document order, user-verifiable checkpoints occur regularly.

## Writes

- the configured roadmap path from `paths.roadmap`, usually `docs/roadmap.md`
- the configured feature inventory path from `paths.features`, only with user confirmation when resolving status conflicts

Use `.plan-product/config.json` for paths and `paths.roadmapTemplate` for file shape. Slice IDs are assigned once and never renumbered; document order is the delivery order.
