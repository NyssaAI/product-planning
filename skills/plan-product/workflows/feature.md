# Workflow: Feature Specification & Boundary Hardening

> [!IMPORTANT] Scope Directive
> This workflow defines or deepens a single feature guide (`docs/features/f-gg.nn/feature.md`) and synchronizes its status with the feature inventory (`docs/features.md`). It owns feature identity, user need, capability scope, out-of-scope boundaries, concrete inputs/outputs, acceptance criteria, dependencies, and contradiction checks against peer features. Detailed actor workflows belong in `workflows/use-case.md`; delivery sequencing belongs in `workflows/roadmap.md`.

---

## Operating Rules

- Reuse information and approval already supplied by the user. Interview only for missing decisions.
- Configured paths are repo-relative. Render Markdown links relative to the document containing the link.
- Read `.nyssa-ai/plan-product/config.json` for paths and `paths.featureTemplate` for file shape.
- Preserve existing user-authored content unless explicit replacement is requested.
- Ask one blocking question at a time only for missing required information.
- Do not invent feature ownership, user need, acceptance checks, dependencies, or delivery status. Mark inferred items as `[inferred]` and confirm them.
- Keep `Summary`, `User Need`, `Conceptual Context`, `Use Cases`, `Scope`, `Out of Scope`, `Inputs`, `Outputs`, `Acceptance`, and `Dependencies` as distinct output sections.
- Write all feature content in non-technical, user-outcome language. Do **not** allow overly technical decisions, implementation mechanics, or specific product/technology selections (frameworks, databases, libraries, config keys, CLI scripts) to leak into `feature.md` or `features.md` (those belong only in `tech-stack.md` or `roadmap.md` entries).
- Keep feature boundaries at the capability level. Actor workflows, entry routes, and process trees belong in use-case files via `workflows/use-case.md`.
- Do not create use-case files unless explicitly requested. In the feature guide, list real use-case files or write `None yet.`; never leave template placeholder links.
- Do not finalize a feature that duplicates or contradicts another feature. Propose merging, narrowing, or splitting before writing.

---

## Procedure

### 1. Target Feature Resolution
1. Read `.nyssa-ai/plan-product/config.json`, the feature inventory (`paths.features`), and `paths.featureTemplate`.
2. Determine target feature:
   - User named ID: derive path from `structure.features.featurePathPattern`.
   - User named title: match against inventory and open guide.
   - User requests new feature: select next unused ID in target Feature Group (`F-gg.nn`).
3. For existing features, read current guide. Scan sibling feature guides under `structure.features.root` for boundary overlap, and scan `structure.concepts.root` (`docs/concepts/`) for existing `C-nn` domain concepts or macro-flows this feature participates in.

### 2. Feature Discovery & Adversarial Boundary Pass
1. Interview for:
   - Capability added or refined.
   - User persona and primary need.
   - Conceptual context: whether this feature belongs to or enforces an existing `C-nn` concept or macro-flow in `docs/concepts/`.
   - Concrete user-visible scope (what it owns).
   - Explicit out-of-scope boundaries (what it does not own).
   - User-level inputs (information, decisions, or starting context required).
   - User-level outputs (observable outcomes, information, or artifacts produced for the user).
   - Observable acceptance checks that prove completion without prescribing implementation or technology choices.
   - Prerequisite feature IDs or external dependencies.
2. Restate candidate feature with marked `[inferred]` fields for confirmation.
3. Boundary & contradiction check:
   - Compare candidate against existing guides and inventory.
   - Ensure inputs, outputs, and acceptance criteria are testable, unambiguous, and free of leaked technical or technology selections.
   - Stop and resolve contradictions if overlapping ownership is found.

### 3. File Generation & Inventory Sync
1. Read `paths.featureTemplate` immediately before writing.
2. Write or update feature guide retaining standard template heading order, linking any participating `C-nn` concepts under `## Conceptual Context` (or `None.`) and updating the corresponding concept files' `## Participating Features` section.
3. Update feature inventory (`paths.features`):
   - Keep `paths.features` in non-technical, use-case language written for the user.
   - In `## Feature Checklist Summary`, keep only `- [ ] F-gg.nn: Feature Title` (never links or descriptions).
   - In `## Feature Inventory`, update the user-focused description and link (`[Feature Guide: <Title>](features/f-gg.nn/feature.md)`).

### 4. Optional Roadmap Handoff

After successfully writing a new or materially updated feature guide, ask the user whether to reflect it in delivery planning:

- If `paths.roadmap` exists, ask: `Would you like to update the roadmap now?`
- If `paths.roadmap` does not exist, ask: `Would you like to create the roadmap now?`
- If the user says yes, load `workflows/roadmap.md` in the same conversation. Carry the affected `F-gg.nn`, its linked use cases, acceptance checks, and dependencies forward; do not repeat discovery already confirmed in this workflow.
- If the user says no, report the feature and inventory updates and complete normally. Do not treat roadmap work as a blocking condition and do not write a roadmap.
- Do not ask after a read-only review, an unchanged write, or a cancelled update.

---

## Verification Checklist

- [ ] Path derived from `structure.features.featurePathPattern` without hardcoding.
- [ ] Feature template read immediately prior to write.
- [ ] Explicit Scope and Out of Scope sections clearly distinguish boundaries.
- [ ] No overly technical decisions or product/technology selections leaked into the feature guide or inventory.
- [ ] Acceptance criteria trace directly to inputs, outputs, and user need.
- [ ] Cross-feature consistency check executed against sibling feature guides.
- [ ] Zero placeholder use-case links; only real `UC-gg.nn.uu` links or `None yet.`.
- [ ] Inventory entry updated in non-technical language with no links in `## Feature Checklist Summary` and a valid link in `## Feature Inventory`.
- [ ] After a material write, offered the optional roadmap handoff without blocking completion.
