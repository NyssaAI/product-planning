---
feature: F-102
id: UC-001
status: complete
---

# UC-001 Author a Feature Guide From the Template

## Actor

A coding agent (Claude Code, Codex, Cursor, or Gemini) running the `plan-feature` workflow.

## Goal

Produce one complete `docs/features/f-nxx/feature.md` that captures a feature's scope, inputs, outputs, acceptance criteria, and dependencies without duplicating another feature's ownership.

## Starting Context

- `.plan-product/config.json` exists and resolves `paths.featureTemplate` and `structure.features.featurePathPattern`.
- `docs/features.md` lists the feature IDs already in use.
- The feature template at `.plan-product/templates/feature.md` is present.

## Entry Route

The user invokes the `plan-feature` command or asks the agent to define a feature.

## Trigger

The user names a feature to add or deepen.

## Process

```text
Agent writes a complete feature guide
+-- Starting context: config, inventory, and template are present
+-- Entry route: user invokes plan-feature
+-- Trigger: user names the feature
+-- Step 1: resolve paths from .plan-product/config.json
+-- Step 2: scan docs/features.md and existing folders for used IDs
|   \-- Decision: choose the next unused ID in the correct phase band (F-0xx/F-1xx/F-2xx)
+-- Step 3: read paths.featureTemplate immediately before writing
+-- Step 4: interview the user for scope, inputs, outputs, acceptance, dependencies
+-- Step 5: run the uniqueness and contradiction pass against sibling guides
|   \-- Failure path: overlap found -> narrow boundary or merge before writing
+-- Step 6: write feature.md, marking unknown sections To be defined.
\-- Success: feature.md exists and is linked from docs/features.md
```

## Step Details

### Step 2: Choose the next unused ID

Read the checklist and inventory in `docs/features.md` plus the existing `docs/features/f-*/` folders. Never renumber an existing feature; pick the lowest unused number inside the phase band that matches the feature's delivery phase.

### Step 5: Uniqueness and contradiction pass

Compare the candidate scope against every other feature guide. If two guides claim the same ownership or state conflicting boundaries, resolve the overlap before writing rather than shipping a contradictory inventory.

## Success

`docs/features/f-nxx/feature.md` exists, follows the template section order, is linked from `docs/features.md`, and does not duplicate or contradict a sibling guide.

## Failure Cases

- Missing template: `paths.featureTemplate` does not exist — run `--init` to restore it before writing.
- Duplicate ownership: the candidate scope overlaps an existing feature — narrow the boundary or merge.
- ID collision: the chosen ID is already used — select the next unused ID in the correct phase band.

## Consistency Check

- Unique coverage: This use case covers authoring the feature guide itself. UC files for other features cover their own workflows, not the guide-authoring step.
- Closest related use cases: None yet. When a `plan-product` inventory use case is added, the boundary is that this use case writes one guide while an inventory use case maintains the `docs/features.md` index.
- Contradictions: None found.

## Acceptance

- The ASCII process tree can be followed from the F-102 feature guide.
- Expected outputs are clear: one linked `feature.md`.
- Failure cases produce clear guidance.
- The consistency check shows no unresolved duplicate coverage or contradictions.
