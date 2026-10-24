# Product Roadmap

This document lists delivery steps in build order. `docs/features.md` owns the user-facing feature catalog and functional groupings; this roadmap owns dependency-driven delivery sequencing, technical build decisions, and verification checkpoints.

---

## How to Use This Roadmap

* **Step IDs (`R-pp.ss`):** Each delivery step uses the `R-pp.ss` scheme, where `pp` is the two-digit Delivery Phase (`00`–`99`) in build order, and `ss` is the sequential Step (`01`–`99`) within that phase. IDs are assigned once and never renumbered; list order determines delivery order.
* **Target Linking:** Each step completes one or more Use Cases, written as `[UC-gg.nn.uu](features/f-gg.nn/uc-gg.nn.uu-short-slug.md)`. When a foundational or setup feature has no separate use cases, the step falls back to linking the feature directly as `[F-gg.nn](features/f-gg.nn/feature.md)`.
* **Technical Decisions Allowed Here:** Unlike feature guides and use cases (which must remain in non-technical, user-focused language), roadmap steps and `Verify:` checkpoints may include concrete technical decisions, product/technology selections, commands, and implementation sequencing.
* **Statement:** Each step is one human-readable statement line: `- [ ] R-pp.ss: Imperative statement — [UC-gg.nn.uu](features/f-gg.nn/uc-gg.nn.uu-short-slug.md)`, with `— after: ...` appended only when the step declares dependencies.
* **Detail bullets:** Indented sub-bullets under the statement describe the work item and any technical delivery choices.
* **Verify checkpoint:** The `Verify:` sub-bullet is a user-verifiable stopping point: `Verify:` followed by what the user runs or clicks, what they should see when the step is correct, and demo data when needed. A step with no user-observable outcome may defer with `Verify: with R-pp.ss`, naming a later step whose checkpoint demonstrates it (never more than two consecutive open steps defer).
* **Dependencies:** An optional `after:` list names prior step IDs (`R-pp.ss`) or feature IDs (`F-gg.nn`) this step must follow. A step must not name its own parent feature or use case.
* **Status:** Check a step only when its work is implemented and verified. Completed steps are immutable history.
* **Coverage:** Every incomplete feature in `docs/features.md` needs step coverage here.

---

## Steps

- [ ] R-01.01: Example first step — [F-00.01](features/f-00.01/feature.md)
    - Describe the first concrete work item and relevant technical delivery choices.
    - Describe the second concrete work item.
    - Verify: run the named command or open the named screen with the listed demo data, and confirm the described outcome.
- [ ] R-01.02: Example dependent step — [UC-01.01.01](features/f-01.01/uc-01.01.01-slug.md) — after: R-01.01
    - Describe what this step adds once R-01.01 lands.
    - Verify: describe the user-runnable check for this step, or defer with `with R-pp.ss` to a later checkpoint.
