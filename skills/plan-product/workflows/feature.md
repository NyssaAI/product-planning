# Workflow: Feature Specification & Boundary Hardening

> [!IMPORTANT] Scope Directive
> This workflow defines or deepens a single feature guide (`docs/features/f-nxx/feature.md`) and synchronizes its status with the feature inventory (`docs/features.md`). It owns feature identity, user need, capability scope, out-of-scope boundaries, concrete inputs/outputs, acceptance criteria, dependencies, and contradiction checks against peer features. Detailed actor workflows belong in `workflows/use-case.md`; delivery sequencing belongs in `workflows/roadmap.md`.

---

## Operating Rules

- Reuse information and approval already supplied by the user. Interview only for missing decisions.
- Configured paths are repo-relative. Render Markdown links relative to the document containing the link.
- Read `.plan-product/config.json` for paths and `paths.featureTemplate` for file shape.
- Preserve existing user-authored content unless explicit replacement is requested.
- Ask one blocking question at a time only for missing required information.
- Do not invent feature ownership, user need, acceptance checks, dependencies, or delivery status. Mark inferred items as `[inferred]` and confirm them.
- Keep `Summary`, `User Need`, `Use Cases`, `Scope`, `Out of Scope`, `Inputs`, `Outputs`, `Acceptance`, and `Dependencies` as distinct output sections.
- Keep feature boundaries at the capability level. Actor workflows, entry routes, and process trees belong in use-case files via `workflows/use-case.md`.
- Do not create use-case files unless explicitly requested. In the feature guide, list real use-case files or write `None yet.`; never leave template placeholder links.
- Do not finalize a feature that duplicates or contradicts another feature. Propose merging, narrowing, or splitting before writing.

---

## Procedure

### 1. Target Feature Resolution
1. Read `.plan-product/config.json`, the feature inventory (`paths.features`), and `paths.featureTemplate`.
2. Determine target feature:
   - User named ID: derive path from `structure.features.featurePathPattern`.
   - User named title: match against inventory and open guide.
   - User requests new feature: select next unused ID in target phase band.
3. For existing features, read current guide. Scan sibling feature guides under `structure.features.root` for boundary overlap.

### 2. Feature Discovery & Adversarial Boundary Pass
1. Interview for:
   - Capability added or refined.
   - User persona and primary need.
   - Concrete scope (what it owns).
   - Explicit out-of-scope boundaries (what it does not own).
   - Concrete inputs (files, configs, commands, screens).
   - Concrete outputs (artifacts, state changes, reports).
   - Acceptance checks that prove completion.
   - Prerequisite feature IDs or external dependencies.
2. Restate candidate feature with marked `[inferred]` fields for confirmation.
3. Boundary & contradiction check:
   - Compare candidate against existing guides and inventory.
   - Ensure inputs, outputs, and acceptance criteria are testable and unambiguous.
   - Stop and resolve contradictions if overlapping ownership is found.

### 3. File Generation & Inventory Sync
1. Read `paths.featureTemplate` immediately before writing.
2. Write or update feature guide:
   - Retain standard template heading order.
   - Normalize older guides with `## Use Case` singular into `## User Need` and `## Use Cases`.
3. Update feature inventory (`paths.features`):
   - Update name, phase, status, and link to point to configured feature guide path.

---

## Verification Checklist

- [ ] Path derived from `structure.features.featurePathPattern` without hardcoding.
- [ ] Feature template read immediately prior to write.
- [ ] Explicit Scope and Out of Scope sections clearly distinguish boundaries.
- [ ] Acceptance criteria trace directly to inputs, outputs, and user need.
- [ ] Cross-feature consistency check executed against sibling feature guides.
- [ ] Zero placeholder use-case links; only real `UC-nnn` links or `None yet.`.
- [ ] Inventory entry updated with matching status, phase, and markdown link.
- [ ] If roadmap exists and dependencies changed, user reminded to run `workflows/roadmap.md`.
