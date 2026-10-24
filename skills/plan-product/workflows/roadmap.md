# Workflow: Roadmap Sequencing & Step Delivery

> [!IMPORTANT] Scope Directive
> This workflow sequences and maintains the dependency-ordered product delivery roadmap (`docs/roadmap.md`). It owns work delivery steps with stable `R-pp.ss` IDs, imperative statement lines with `- Verify:` stopping checkpoints and demo data, `after:` dependency resolution, target linking to `UC-gg.nn.uu` (with `F-gg.nn` fallback for features without use cases), and tie-out validation against the feature inventory (`docs/features.md`). It does not inspect source code, author technical implementation specs, or execute code edits.

---

## Operating Rules

- Reuse information and approval already supplied by the user.
- Configured paths are repo-relative. Render links relative to document location.
- Read `.plan-product/config.json` for paths and `paths.roadmapTemplate` for file shape.
- Preserve existing user-authored content. Preserve unparseable lines verbatim with flags.
- Assign step IDs once via `structure.roadmap.idPattern` (`R-pp.ss`, where `pp` is the two-digit phase and `ss` is the step). Never renumber or reuse IDs. Document order, not the ID, determines delivery order.
- Technical delivery decisions, product/technology selections, and concrete verification commands **are permitted** in roadmap step bullets and `- Verify:` checkpoints (whereas feature guides and use cases must remain non-technical).
- Each step is a human-readable block: `- [ ] R-pp.ss: Statement — [UC-gg.nn.uu](<path>) — after: ...` (or fallback `— [F-gg.nn](<path>)`), followed by descriptive sub-bullets and a `- Verify:` sub-bullet.
- Target linking: Each step links to one or more `[UC-gg.nn.uu](...)` use cases. When a feature has no separate use cases (e.g. foundational or setup capabilities), the step falls back to linking `[F-gg.nn](...)`.
- Every step's `- Verify:` sub-bullet is a user-verifiable stopping point (what user runs/clicks, expected output, demo data). Steps without direct observable outcomes may defer with `Verify: with R-pp.ss`, but no more than two consecutive open steps may defer.
- Completed steps are immutable history. Never uncheck a completed step.
- Step removal is permitted only for open steps; references in other open steps must be repaired concurrently.

---

## Procedure

### 1. Initialization & Template Verification
1. Read `.plan-product/config.json`. If missing or incomplete, run `node "${PLUGIN_ROOT}/scripts/init.mjs"` (resolving `${PLUGIN_ROOT}` from `PLAN_PRODUCT_PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, `PLUGIN_ROOT`, or the relative path to this installed plugin).
2. Verify `paths.roadmapTemplate` exists.
3. Read the feature inventory. If absent or containing only placeholder features, route user to `workflows/product.md`.
4. Read existing roadmap (`paths.roadmap`). If absent, initialize from `paths.roadmapTemplate`.

### 2. Entry Validation Pass
Validate the following in order:
1. **Resolution**: Every step's target use case or parent feature exists on disk.
2. **Coverage**: Every incomplete feature in inventory has at least one step covering it or its use cases.
3. **Ordering**: No open step appears before any step or feature listed in its `after:` clause.
4. **Reference Integrity**: Every `after:` entry resolves without cycles or dangling IDs.
5. **Verification Rigor**: Every open step has a concrete `- Verify:` stopping point or a valid `with R-pp.ss` deferral. No more than two consecutive steps defer.

Prompt user to resolve any detected entry violations before proceeding.

### 3. Step Sequencing & Interview Pass
1. Interview for requested step additions, completions, removals, or reordering.
2. For new steps, capture:
   - Imperative statement line.
   - 2–4 descriptive sub-bullets.
   - User-verifiable `- Verify:` stopping point with demo data.
   - Target use case reference and link (or parent feature fallback).
   - Explicit `after:` dependencies.
3. Assign next highest `R-pp.ss` ID within target phase `pp`.

### 4. Inventory Synchronization & Exit Validation
1. Cross-check status with feature inventory:
   - Flag complete features with open steps.
   - Flag incomplete features whose steps are all checked.
   - Update inventory checkboxes only with user confirmation.
2. Write roadmap preserving order and format.
3. Re-run entry validation rules on the written document.

---

## Verification Checklist

- [ ] All target use cases and parent features exist and link to real files.
- [ ] Every non-completed feature has step coverage.
- [ ] No circular dependencies or backward references in document order.
- [ ] Every open step has a verified `- Verify:` stopping point.
- [ ] No more than two consecutive open steps defer verification.
- [ ] Stable `R-pp.ss` IDs assigned sequentially without renumbering history.
- [ ] Inventory checkboxes synchronized with user confirmation.
