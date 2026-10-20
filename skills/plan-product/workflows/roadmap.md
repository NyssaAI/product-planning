# Workflow: Roadmap Sequencing & Work Slicing

> [!IMPORTANT] Scope Directive
> This workflow sequences and maintains the dependency-ordered product delivery roadmap (`docs/roadmap.md`). It owns work slicing with stable `R-NNN` IDs, imperative statement lines with `- Verify:` stopping checkpoints and demo data, `after:` dependency resolution, and tie-out validation against the feature inventory (`docs/features.md`). It does not inspect source code, author technical implementation specs, or execute code edits.

---

## Operating Rules

- Reuse information and approval already supplied by the user.
- Configured paths are repo-relative. Render links relative to document location.
- Read `.plan-product/config.json` for paths and `paths.roadmapTemplate` for file shape.
- Preserve existing user-authored content. Preserve unparseable lines verbatim with flags.
- Assign slice IDs once via `structure.roadmap.idPattern` (`R-NNN`). Never renumber or reuse IDs. Document order, not the ID, determines delivery order.
- Each slice is a human-readable block: `- [ ] R-NNN: Statement — [F-Nxx](<path>) — after: ...`, followed by descriptive sub-bullets and a `- Verify:` sub-bullet.
- Every slice's `- Verify:` sub-bullet is a user-verifiable stopping point (what user runs/clicks, expected output, demo data). Slices without direct observable outcomes may defer with `Verify: with R-NNN`, but no more than two consecutive open slices may defer.
- Completed slices are immutable history. Never uncheck a completed slice.
- Each slice references exactly one parent feature. Slices must not name their own parent feature in `after:`.
- Slice removal is permitted only for open slices; references in other open slices must be repaired concurrently.

---

## Procedure

### 1. Initialization & Template Verification
1. Read `.plan-product/config.json`. If missing or incomplete, run `node "${PLUGIN_ROOT}/scripts/init.mjs"` (resolving `${PLUGIN_ROOT}` from `PLAN_PRODUCT_PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, `PLUGIN_ROOT`, or the relative path to this installed plugin).
2. Verify `paths.roadmapTemplate` exists.
3. Read the feature inventory. If absent or containing only placeholder features, route user to `workflows/product.md`.
4. Read existing roadmap (`paths.roadmap`). If absent, initialize from `paths.roadmapTemplate`.

### 2. Entry Validation Pass
Validate the following in order:
1. **Resolution**: Every slice's parent feature exists in inventory and guide file exists on disk.
2. **Coverage**: Every incomplete feature in inventory has at least one slice.
3. **Ordering**: No open slice appears before any slice or feature listed in its `after:` clause.
4. **Reference Integrity**: Every `after:` entry resolves without cycles or dangling IDs.
5. **Verification Rigor**: Every open slice has a concrete `- Verify:` stopping point or a valid `with R-NNN` deferral. No more than two consecutive slices defer.

Prompt user to resolve any detected entry violations before proceeding.

### 3. Slicing & Interview Pass
1. Interview for requested slice additions, completions, removals, or reordering.
2. For new slices, capture:
   - Imperative statement line.
   - 2–4 descriptive sub-bullets.
   - User-verifiable `- Verify:` stopping point with demo data.
   - Parent feature reference and link.
   - Explicit `after:` dependencies.
3. Assign next highest `R-NNN` ID.

### 4. Inventory Synchronization & Exit Validation
1. Cross-check status with feature inventory:
   - Flag complete features with open slices.
   - Flag incomplete features whose slices are all checked.
   - Update inventory checkboxes only with user confirmation.
2. Write roadmap preserving order and format.
3. Re-run entry validation rules on the written document.

---

## Verification Checklist

- [ ] All parent features exist and link to real feature guides.
- [ ] Every non-completed feature has slice coverage.
- [ ] No circular dependencies or backward references in document order.
- [ ] Every open slice has a verified `- Verify:` stopping point.
- [ ] No more than two consecutive open slices defer verification.
- [ ] Stable `R-NNN` IDs assigned sequentially without renumbering history.
- [ ] Inventory checkboxes synchronized with user confirmation.
