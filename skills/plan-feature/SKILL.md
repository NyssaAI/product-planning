---
name: plan-feature
description: Interview the user to define or refine a plan-product feature, including feature identity, user need, scope boundaries, inputs, outputs, acceptance checks, dependencies, use-case link handling, uniqueness against existing features, and inventory consistency. Use when the user wants to create or update a feature in docs/features.md, create docs/features/f-nxx/feature.md, split feature scope, or decide feature boundaries.
---

# Plan Feature

Define or refine one plan-product feature. Use `.plan-product/config.json` for paths and `paths.featureTemplate` for file shape.

## Operating Rules

- Preserve existing user-authored content unless the user asks to replace it.
- Ask one blocking question at a time only for missing required information. In Codex, present numbered choices in chat and wait for the user answer. If a runtime provides an AskUserQuestion tool, use that tool.
- Do not invent feature ownership, user need, acceptance checks, dependencies, or delivery status. Mark inferred items as `[inferred]` and confirm them before writing.
- Keep `Summary`, `User Need`, `Use Cases`, `Scope`, `Out of Scope`, `Inputs`, `Outputs`, `Acceptance`, and `Dependencies` as separate output sections.
- Keep feature boundaries at the capability level. Put actor workflows, entry routes, process trees, failures, and workflow-specific acceptance in use-case files through `plan-use-case`.
- Do not create use-case files unless the user asks to break the feature into specific use cases. When writing the feature guide, list only real use-case files or write `None yet.`; never leave template placeholder use-case links.
- Do not finalize a feature that duplicates or contradicts another feature. Narrow it, merge it, split it, or ask the user to resolve the conflict.
- If a request spans unrelated ownership areas, phases, or delivery milestones, propose a split into multiple features before writing.
- Use the configured feature ID, folder, file, and inventory paths from `.plan-product/config.json`. Do not hard-code paths beyond examples.
- When updating an older guide with `## Use Case` singular, convert it to template order: move the singular paragraph into `## User Need` when it describes the need, then create `## Use Cases` with real `UC-nnn` links or `None yet.`.

## Workflow

1. Read `.plan-product/config.json`.
2. Read the configured feature inventory, usually `docs/features.md`, and the configured feature template.
3. Determine the target feature:
   - If the user named a feature ID, derive the configured feature guide path from `structure.features.featurePathPattern` for that ID.
   - If the user named an existing feature by title, match it against the inventory and open its feature guide.
   - If the user wants a new feature, inspect existing `F-Nxx` IDs in the inventory and feature folders, choose the next ID in the requested phase, and derive the lowercase folder path from the configured pattern.
   - If the target is still ambiguous, present the current feature inventory and ask whether to update an existing feature or create a new one.
4. For an existing feature, read its current feature guide before interviewing. For any feature, scan other feature guides under the configured `structure.features.root` and sibling use-case files matching `structure.features.useCaseFilePattern` for nearby ownership, dependencies, and use-case links.
5. Ask the user to describe the feature in their own words before drafting. Get enough detail to answer:
   - What capability is this feature adding or refining?
   - Who or what needs it, and what outcome do they need?
   - What does this feature own?
   - What is explicitly out of scope?
   - What inputs does it read, such as files, commands, configs, screens, prompts, or user decisions?
   - What outputs does it create, such as files, reports, commands, screens, state changes, or documentation?
   - Are there existing or planned use cases that should be linked from the feature guide?
   - What concrete checks prove the feature is done?
   - Which earlier features or external prerequisites does it depend on?
   - What inventory name, phase, status, group, or link should change?
6. Restate the candidate feature before writing, with `ID`, `Name`, `Phase`, `Status`, `Summary`, `User Need`, `Use Cases`, `Scope`, `Out of Scope`, `Inputs`, `Outputs`, `Acceptance`, `Dependencies`, `Inventory Changes`, and `Open Unknowns`. Mark inferred items as `[inferred]`, then ask the user to confirm or correct them. Only record `Unknown; not inferred.` when the user explicitly says they do not know.
7. Run an adversarial boundary pass before writing:
   - Each scope bullet must name a concrete responsibility, artifact, command, screen, data contract, or behavior this feature owns.
   - Each out-of-scope bullet must identify an adjacent responsibility that might otherwise be confused with this feature.
   - Inputs and outputs must be concrete enough that an implementer can find or create the artifacts.
   - Acceptance checks must trace to the user need, scope, outputs, and configured path contract.
   - Dependencies must be earlier feature IDs or explicit external prerequisites, not vague sequencing notes.
   - If the feature only describes one actor workflow, ask whether it should instead be a use case under an existing feature.
8. Run a final uniqueness and consistency check:
   - Compare the candidate against every other feature guide and the feature inventory.
   - Compare user need, scope, out-of-scope boundaries, inputs, outputs, acceptance checks, dependencies, phase, status, and use-case links.
   - If another feature already owns the same capability, stop and ask whether to merge, replace, or narrow the new feature.
   - If another feature partially overlaps, note the closest related features in the confirmation and encode the boundary in `Scope`, `Out of Scope`, or `Dependencies`.
   - If the candidate contradicts another feature's ownership, path contract, phase order, dependency chain, or acceptance checks, stop and ask the user to resolve the contradiction before writing.
9. Write or update the feature guide from the configured feature template. If updating an older feature without `User Need` or `Use Cases`, add those sections in the template order and normalize `## Use Case` singular as described above.
10. Update the configured feature inventory when the feature ID, name, summary, phase, status, group, checkbox state, or link changes. Ensure the inventory link points to the configured feature guide path.
11. After writing, verify the feature guide has no template placeholders, no fake `UC-nnn` links, and no unresolved duplicate coverage or contradictions.
12. If the configured roadmap file from `paths.roadmap` exists and the feature's ID, status, or dependencies changed, remind the user to run `plan-roadmap` so slice coverage stays in sync. Do not edit the roadmap in this skill.

Do not create use-case files unless the user asks to break the feature into specific use cases. Use `plan-use-case` for that pass.
