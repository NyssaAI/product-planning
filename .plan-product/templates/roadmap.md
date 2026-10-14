# Product Roadmap

This document lists work slices in delivery order. `docs/features.md` owns the feature inventory, phases, and status; this roadmap owns dependency-driven delivery order and slicing.

---

## How to Use This Roadmap

* **Slice IDs:** Each slice uses the `R-NNN` scheme. IDs are assigned once and never renumbered or reused; the next ID is the highest ever assigned plus one.
* **Order:** The list order below is the delivery order. Inserting a slice mid-sequence takes the next unused number and the right position — existing IDs never change.
* **Statement:** Each slice is one human-readable statement line: `- [ ] R-NNN: Imperative statement — [F-Nxx](features/f-nxx/feature.md)`, with `— after: ...` appended only when the slice declares dependencies.
* **Detail bullets:** Indented sub-bullets under the statement describe the work in plain language. Keep detailed requirements in the feature guide; the roadmap stays scannable.
* **Verify checkpoint:** The `Verify:` sub-bullet is a user-verifiable stopping point: `Verify:` followed by what the user runs or clicks, what they should see when the slice is correct, and the demo data to use when observing it needs data. A slice with no user-observable outcome of its own may defer with `Verify: with R-NNN`, naming a later slice whose checkpoint demonstrates it — but checkpoints must occur regularly: never more than two consecutive open slices defer. Keep detailed acceptance examples and demo data in the feature guide; the roadmap line stays one scannable instruction.
* **Parent feature:** Each slice references exactly one feature and links to its guide, for example `[F-001](features/f-001/feature.md)`. A feature may be covered by more than one slice.
* **Dependencies:** An optional `after:` list names the slice or feature IDs this slice must follow. A feature ID means "after all existing slices of that feature." A slice must not name its own parent feature.
* **Status:** Check a slice only when its work is implemented and verified. Completed slices are immutable history — rework on a shipped feature is a new slice, never an unchecked old one.
* **Coverage:** Every feature not yet complete in `docs/features.md` needs at least one slice here. Completed features and non-feature capability entries are exempt.

---

## Slices

- [ ] R-001: Example first slice — [F-001](features/f-001/feature.md)
    - Describe the first concrete work item in plain language.
    - Describe the second concrete work item.
    - Verify: run the named command or open the named screen with the listed demo data, and confirm the described outcome.
- [ ] R-002: Example dependent slice — [F-001](features/f-001/feature.md) — after: R-001
    - Describe what this slice adds once R-001 lands.
    - Verify: describe the user-runnable check for this slice, or defer with `with R-NNN` to a later checkpoint.
