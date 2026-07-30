# Implementation Roadmap

This document lists work slices in implementation order. `docs/features.md` owns the feature inventory, phases, and status; this roadmap owns dependency-driven build order and slicing.

---

## How to Use This Roadmap

* **Slice IDs:** Each slice uses the `R-NNN` scheme. IDs are assigned once and never renumbered or reused; the next ID is the highest ever assigned plus one.
* **Order:** The list order below is the implementation order. Inserting a slice mid-sequence takes the next unused number and the right position — existing IDs never change.
* **Parent feature:** Each slice references exactly one feature and links to its guide, for example `[F-301](features/f-301/feature.md)`. A feature may be covered by more than one slice.
* **Dependencies:** An optional `after:` list names the slice or feature IDs this slice must follow. A feature ID means "after all existing slices of that feature." A slice must not name its own parent feature.
* **Status:** Check a slice only when its work is implemented and verified. Completed slices are immutable history — rework on a shipped feature is a new slice, never an unchecked old one.
* **Coverage:** Every feature not yet complete in `docs/features.md` needs at least one slice here. Completed features and non-feature capability entries are exempt.

---

## Slices

- [x] R-001 — Roadmap template and config contract — [F-301](features/f-301/feature.md)
- [x] R-002 — Bootstrap template delivery — [F-301](features/f-301/feature.md) — after: R-001
- [x] R-003 — plan-roadmap skill, command doc, and capability registration — [F-301](features/f-301/feature.md) — after: R-001
- [x] R-004 — Tie-out test coverage and repo dogfood — [F-301](features/f-301/feature.md) — after: R-002, R-003
