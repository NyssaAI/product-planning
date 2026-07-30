---
date: 2026-07-29
topic: roadmap-implementation-order
---

# Roadmap: Dependency-Ordered Implementation Sequence

## Summary

Reintroduce `docs/roadmap.md` as a dependency-ordered sequence of work slices, each tied to a parent feature guide, authored and validated by a new `plan-roadmap` skill. The roadmap owns implementation order; `docs/features.md` keeps owning the feature inventory, phases, and product framing.

---

## Problem Frame

Feature IDs in this plugin encode product delivery phases (`F-Nxx`, where `N` is the phase). Technical dependencies do not respect that numbering: work inside one feature can depend on work inside a feature from a later phase, so the true build order interleaves features. `docs/features.md` describes itself as listing features "in intended build order," a claim its phase-grouped structure cannot honor once dependencies cross phases.

A `docs/roadmap.md` existed before plan-product 2.0.0 and was removed in that release. It was a bare milestone checklist that duplicated the phase structure — a different artifact solving no distinct problem. The gap it left is not milestones; it is a place where dependency-driven implementation order can live without distorting the feature inventory.

---

## Key Decisions

- **Separate file, not a section of features.md.** The two documents serve different questions — "what exists and what state is it in" versus "what order do we build in." Mixing them recreated the original confusion.
- **Slice granularity.** A roadmap item is a slice of work referencing one parent feature; a feature may split into multiple slices so interleaved dependencies can be sequenced honestly.
- **Stable IDs, position as order.** Slice IDs (`R-NNN`) are assigned once and never renumbered. The document's list order is the implementation order; new slices take the next unused number and insert wherever they belong. References from plans and commits stay valid forever.
- **Slices declare `after:` dependencies.** Each slice can name the slices or features it must follow. The ordering becomes self-justifying and checkable instead of asserted.
- **Skill-enforced validation, no shipped validator.** The `plan-roadmap` skill performs the tie-out checks itself, following the pattern set by `plan-feature`'s uniqueness and consistency check. A mechanical validator script can be retrofitted if drift shows up in practice; it is not a foundation decision.
- **Status with cross-check.** Slices carry completion checkboxes, and the skill flags status conflicts between the roadmap and `docs/features.md` rather than letting two sources of truth drift silently.

---

## Requirements

**Roadmap artifact**

- R1. `docs/roadmap.md` holds an ordered list of work slices; document order is the implementation order.
- R2. Each slice has a stable `R-NNN` ID that is never renumbered; inserting a slice mid-sequence takes the next unused number.
- R3. Each slice references exactly one parent feature and links to its guide under `docs/features/f-nxx/feature.md`.
- R4. A feature may be covered by one or more slices.
- R5. A slice may declare `after:` dependencies naming the slice or feature IDs it must follow.
- R6. Each slice carries a completion checkbox.

**plan-roadmap skill**

- R7. A new `plan-roadmap` skill creates `docs/roadmap.md` from a template on first run and updates it afterward — adding, reordering, and completing slices through an interview, following the plugin's existing skill conventions.
- R8. On every run, the skill verifies the tie-out: every slice resolves to an existing feature guide, every feature in `docs/features.md` is covered by at least one slice, and no slice appears before a declared `after:` dependency.
- R9. On every run, the skill cross-checks status: a feature marked complete in `docs/features.md` with an open slice is flagged, as is a feature whose slices are all complete but which is not marked complete.
- R10. The roadmap template ships in `.plan-product/templates/` and is referenced through the config `paths` map, matching the existing template conventions.

---

## Key Flows

- F1. Author or update the roadmap
  - **Trigger:** User invokes `plan-roadmap`.
  - **Steps:** Skill reads `docs/features.md` and the feature guides; interviews the user about new or changed slices and their dependencies; writes `docs/roadmap.md` (creating it from the template if absent); runs the R8 tie-out and R9 status checks; reports any violations for the user to resolve before finishing.
  - **Covered by:** R7, R8, R9.

---

## Acceptance Examples

- AE1. **Covers R2.** Given slices R-001 through R-006 where R-004 through R-006 remain open, when a newly discovered dependency requires work between R-003 and R-004, then the new slice is created as R-007 and placed between them; no existing ID changes.
- AE2. **Covers R8.** Given a slice declaring `after: R-003` that appears above R-003 in the document, when the skill runs its checks, then it flags the ordering violation.
- AE3. **Covers R8.** Given a feature listed in `docs/features.md` with no slice referencing it, when the skill runs its checks, then it flags the coverage gap.
- AE4. **Covers R9.** Given a feature checked complete in `docs/features.md` while one of its slices is unchecked, when the skill runs its checks, then it flags the status conflict.

---

## Scope Boundaries

- No shipped validator script and no `--doctor` integration — retrofit only if drift shows up outside skill runs.
- No auto-derivation of the roadmap from feature-guide metadata; the roadmap is authored, not generated.
- No renumbering or gap-management machinery for slice IDs.
- No dates, timelines, or milestone framing — that was the removed pre-2.0.0 artifact's shape, and it is not this one.
- The bootstrap/`--init` flow is untouched; the skill creates the roadmap file on first run.

---

## Dependencies / Assumptions

- The existing test forbidding `scripts/bootstrap-templates/docs-roadmap.md` stays valid; the new template lives in `.plan-product/templates/`, which that test does not constrain (verified).
- Validation fires only when the skill runs. Edits made outside the skill can drift until the next invocation — an accepted risk given the intended workflow routes edits through the skill.

---

## Outstanding Questions

**Deferred to planning**

- The exact slice entry format in the template (fields, checkbox placement, how `after:` renders).
- Whether `plan-feature` and `plan-product` gain a closing step reminding the user to update the roadmap when features change.
- Config and schema details for the new `paths` entries.

---

## Sources

- `docs/features.md:15` — the "intended build order" claim the roadmap relieves.
- Commit `8571928` (plan-product 2.0.0) — removed both `docs/roadmap.md` and its bootstrap template.
- `test/module-map/plan-product-templates.test.mjs:33-42` — constrains old template locations only.
- `skills/plan-feature/SKILL.md:52-57` — the existing skill-enforced consistency-check pattern R8 follows.
- `scripts/module-map/lib/bootstrap.mjs:149-169` — the bootstrap scaffold list the roadmap deliberately stays out of.
