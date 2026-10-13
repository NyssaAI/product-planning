---
name: plan-use-case
description: Interview the user to define a specific plan-product use case under a feature folder, including the actor, entry route, trigger, concrete workflow steps shown as an ASCII process tree, complex step details, uniqueness against existing use cases, contradiction checks, failures, and acceptance checks. Use when the user wants to create or update docs/features/f-nxx/uc-nnn-short-slug.md or clarify one workflow for a feature.
---

# Plan Use Case

Define one use case under an existing feature folder. Use `.plan-product/config.json` for structure and `paths.useCaseTemplate` for file shape.

## Operating Rules

- Preserve existing user-authored content unless the user asks to replace it.
- Ask one blocking question at a time only for missing required information. In Codex, present numbered choices in chat and wait for the user answer. If a runtime provides an AskUserQuestion tool, use that tool.
- Do not invent a happy path from the feature summary. The user must explain the workflow steps, or explicitly say a step is unknown.
- Require an entry route: how the actor gets to the workflow, if known. This might be a screen, command, file, prompt, link, menu item, automation trigger, background event, or prerequisite state.
- Preserve `Starting Context`, `Entry Route`, `Trigger`, `Process`, and `Step Details` as separate output sections. Do not merge the entry route into the trigger.
- Show the workflow as an ASCII tree in `Process`, using only ASCII tree markers such as `+--`, `|`, and `\--`.
- Put explanations for complex tree nodes under `Step Details`. Keep simple steps in the tree only.
- Do not finalize a use case that duplicates or contradicts another use case. Narrow it, merge it, or ask the user to resolve the conflict.
- Challenge vague answers before writing. If the flow jumps from trigger to success, ask what the actor sees, chooses, runs, edits, or waits for in between.
- Keep triggers, preconditions, flow steps, failure cases, and acceptance checks distinct.

## Workflow

1. Read `.plan-product/config.json`.
2. Read the configured feature inventory, usually `docs/features.md`.
3. Read the parent feature guide resolved from `structure.features.featurePathPattern`.
4. If the user named an existing use case, read its file before interviewing. Otherwise, scan sibling use-case files matching `structure.features.useCaseFilePattern`, choose the next `UC-nnn` id, and derive the configured path from `structure.features.useCasePathPattern`.
5. If the user did not name a use case, ask which workflow to document.
6. Ask the user to describe the workflow in their own words before drafting. Get enough detail to answer:
   - Who or what is the actor?
   - What outcome do they need?
   - What starting context, prerequisite state, or input do they already have?
   - What trigger starts the workflow?
   - How does the actor get to the first step, if they know?
   - What are the concrete steps from start to success, and how do they branch?
   - What decisions, branches, or handoffs happen during the flow?
   - Which steps are complex enough to need a short description below the tree?
   - What failure cases matter?
   - What proves the use case is supported?
7. Restate the candidate use case before writing, with `Actor`, `Goal`, `Starting Context`, `Entry Route`, `Trigger`, `Process`, `Step Details`, `Failure Cases`, `Acceptance`, and `Open Unknowns`. Mark inferred items as `[inferred]`, then ask the user to confirm or correct them. Only record `Unknown; not inferred.` when the user explicitly says they do not know.
8. Run an adversarial completeness pass before writing:
   - Each process tree node must identify who or what acts, the concrete action, and the observable input, output, artifact, or state change.
   - If a node has multiple decisions, hidden prerequisites, external handoffs, or meaningful validation rules, add a matching `Step Details` subsection.
   - Do not accept generic steps like "the system handles it", "run the workflow", or "complete setup"; ask what happens next from the actor's point of view.
   - If the entry route is missing, ask how the actor discovers, invokes, opens, or reaches the workflow. If the user does not know, record that as unknown instead of guessing.
   - If failure cases are generic, ask which real input, permission, validation, timeout, missing-data, or invalid-state cases matter.
   - If acceptance checks do not trace back to the actor's goal, tighten them before writing.
9. Run a final uniqueness and consistency check:
   - Compare the candidate against every sibling use-case file matching `structure.features.useCaseFilePattern` in the parent feature folder and any use cases linked from the parent feature guide.
   - Compare actor, goal, starting context, entry route, trigger, process tree, failure cases, and acceptance checks.
   - If another use case already covers the same actor, trigger, goal, and process, stop and ask whether to merge, replace, or narrow the new use case.
   - If another use case partially overlaps, record the closest related use cases and the specific boundary that makes this use case distinct.
   - If the candidate contradicts another use case's preconditions, flow, failure behavior, ownership, or acceptance checks, stop and ask the user to resolve the contradiction before writing.
   - Record the result in `Consistency Check`.
10. Read `paths.useCaseTemplate` immediately before writing, then write or update the use-case file from that template. If updating an older use case without `Starting Context`, `Entry Route`, `Process`, `Step Details`, or `Consistency Check`, add those sections in the template order.
11. Add or update the use-case link in the parent feature guide. Prefer a `## Use Cases` list of markdown links using this format: `- [UC-nnn: Title](uc-nnn-short-slug.md)`, linking the actual file name. If the guide has `## Use Case` singular, convert it only when adding the first linked use-case list.

Keep the use case focused on behavior. Put broader feature boundaries in `feature.md`.
