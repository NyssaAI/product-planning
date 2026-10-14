---
name: plan-roadmap
description: "Interview the user to create or update the dependency-ordered product delivery roadmap, including work slices with stable R-NNN IDs, human-readable statement lines with descriptive sub-bullets, user-verifiable Verify checkpoints with test instructions and demo data, parent feature links, after: dependencies, completion status, and tie-out validation against the feature inventory. Use when the user wants to create or update docs/roadmap.md, sequence features by product dependency, slice a feature into ordered work items, or check roadmap consistency with docs/features.md."
---

# Plan Roadmap

Create or update the dependency-ordered roadmap of work slices. Use `.plan-product/config.json` for paths and `paths.roadmapTemplate` for file shape. The roadmap owns delivery order and slicing; the configured feature inventory keeps owning features, phases, and status.

This workflow defines product outcomes and acceptance checkpoints. It does not inspect source code, select code edit targets, author implementation plans, or execute delivery work.

## Operating Rules

- Reuse information and approval already supplied by the user. Interview only for missing decisions; do not repeat a confirmation the user has already given.
- Configured paths are repo-relative. Render Markdown links relative to the document containing the link, and verify each target exists before completion.

- Preserve existing user-authored content unless the user asks to replace it. Preserve unparseable lines verbatim and flag them; never silently drop content.
- Ask one blocking question at a time. In Codex, present numbered choices in chat and wait for the user answer. If a runtime provides an AskUserQuestion tool, use that tool.
- Slice IDs use the configured `structure.roadmap.idPattern` (`R-NNN`). Assign each ID once and never renumber or reuse it — the next ID is the highest ever assigned plus one, even after removals. Document order, not the ID, is the delivery order.
- Write each slice as a human-readable block: a checkbox statement line `- [ ] R-NNN: Imperative statement — [F-Nxx](<feature guide path>)`, with `— after: ...` appended only when dependencies exist, followed by indented descriptive sub-bullets in plain language and a `- Verify:` sub-bullet. Keep detailed requirements in the feature guide; the roadmap stays scannable.
- Every slice's `Verify:` sub-bullet is a user-verifiable stopping point: what the user runs or clicks, what they should see when the slice is correct, and the demo data to use when observing it needs data. A slice with no user-observable outcome of its own may defer with `Verify: with R-NNN`, naming a later slice whose checkpoint demonstrates it — but stopping points must occur regularly: never more than two consecutive open slices defer. Keep detailed acceptance examples and demo data in the feature guide; the roadmap line stays one scannable instruction.
- Completed slices are immutable history. Never uncheck a completed slice; rework on a shipped feature is a new slice. A completed slice sitting above its incomplete `after:` dependency is informational, not a violation.
- Each slice references exactly one parent feature and links to its configured feature guide path. A slice's `after:` list may name slice IDs or feature IDs; a feature ID means "after all existing slices of that feature," and a slice must not name its own parent feature.
- Removing a slice is allowed only for open slices; scan for both `after:` references and `Verify: with R-NNN` deferrals to the removed ID. Repair references in open slices in the same pass with user confirmation under step 7. If a completed slice references the ID, retain the target slice and ask the user to resolve the conflict without changing completed history.
- Mark inferred items as `[inferred]` and confirm them before writing.

## Workflow

1. Read `.plan-product/config.json`. If it is missing, bootstrap the repo by running `node "${PLUGIN_ROOT}/scripts/init.mjs"` from the target project root, then re-read. Resolve `${PLUGIN_ROOT}` from `PLAN_PRODUCT_PLUGIN_ROOT`, `PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or the installed plugin directory containing this skill.
2. If roadmap configuration is incomplete, run the initializer to fill only missing entries, preserving existing settings. Re-read the config.
3. Verify the file at `paths.roadmapTemplate` exists. If it is missing, run `node "${PLUGIN_ROOT}/scripts/init.mjs"` to copy the bundled templates into place, then re-check. Only if that cannot restore the template should you stop and report the missing configured path.
4. Read the configured feature inventory. Stop and route the user to `plan-product` when the inventory is absent, or when it contains only template placeholder features (for example `F-001: Example foundation feature`) — do not seed slices from placeholders.
5. Read the configured roadmap file. If it does not exist, read `paths.roadmapTemplate` immediately before writing and create the roadmap from it, removing example slices.
6. Run entry validation before interviewing, so drift from feature changes or hand edits is repaired before new work is discussed. Check, in order:
   - **Resolution:** every slice's parent feature exists in the inventory and its feature guide file exists at the configured path.
   - **Coverage:** every feature not marked complete in the inventory has at least one slice. Completed features are exempt.
   - **Ordering:** no open slice appears before a slice or feature named in its `after:` list.
   - **Reference integrity:** every `after:` entry resolves to an existing slice or feature ID, with no cycles, no self-references, and no duplicate or malformed slice IDs.
   - **Verification:** every open slice has a `Verify:` sub-bullet holding either concrete user test instructions (with demo data when needed) or a `with R-NNN` deferral that resolves to a later slice with concrete instructions; no more than two consecutive open slices defer, and no deferral chain ends unresolved. Completed slices are exempt — never retrofit checkpoints onto history.
7. Resolve each violation by its class:
   - Coverage gaps: propose the missing slices as candidates during the interview.
   - Ordering violations and cycles: never write an order that violates declared dependencies; offer a deterministic reorder or ask the user to change the `after:` declaration.
   - Dangling references: ask a blocking question — repoint the reference, remove it, or route the user to `plan-feature` when the feature itself is the problem.
   - Verification gaps: interview for the missing test instructions and demo data — never invent a `Verify:` line without user confirmation. When too many consecutive slices defer, ask which slice should become the checkpoint or whether to add one.
   - Status conflicts (step 9): warn and offer the fix.
8. Interview for the requested changes: add, reorder, complete, or remove slices. For each new slice capture a short human-readable statement, two to four descriptive sub-bullets, the `Verify:` stopping point — how the user will demonstrate the slice works, including demo data when the check needs it, or a confirmed `with R-NNN` deferral — the parent feature, the position in the sequence, any `after:` dependencies that justify it.
9. Cross-check status against the inventory: flag any feature marked complete with an open slice, and any feature whose slices are all complete but which is unchecked. With the user's confirmation, update the inventory checkbox and phase progress table; otherwise leave the inventory untouched and report the conflict.
10. Write the roadmap, preserving existing content and order except for the confirmed changes.
11. Re-run the step 6 checks on the written file. After writing, verify there are no template placeholders and no links to feature guides that do not exist.
