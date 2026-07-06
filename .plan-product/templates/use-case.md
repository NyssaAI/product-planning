---
feature: F-000
id: UC-001
status: planned
---

# UC-001 Use Case Name

## Actor

Name the user, agent, or tool performing the workflow.

## Goal

Describe the outcome the actor needs.

## Starting Context

Describe what the actor already has, sees, knows, or what state exists before the workflow starts.

## Entry Route

Describe how the actor reaches or invokes the workflow. If the user does not know, write `Unknown; not inferred.`

## Trigger

Describe what starts the workflow.

## Process

```text
Actor reaches the goal
+-- Starting context: what already exists
+-- Entry route: how the actor gets to the workflow
+-- Trigger: what starts the workflow
+-- Step 1: concrete actor or system action
|   +-- Decision or branch, if any
|   \-- Failure path, if any
+-- Step 2: concrete actor or system action
\-- Success: completed state
```

## Step Details

Add short descriptions only for complex process nodes. If no step needs extra explanation, write `None.` Otherwise, add one subsection per complex node using `### Step N: Name`.

## Success

Describe the completed state.

## Failure Cases

- Missing input.
- Invalid state.
- Permission or validation failure.

## Consistency Check

- Unique coverage: Describe what this use case covers that existing sibling use cases do not.
- Closest related use cases: List related `UC-nnn` files and the boundary between them.
- Contradictions: Write `None found.` or describe the resolved contradiction.

## Acceptance

- The ASCII process tree can be followed from the feature guide.
- Expected outputs are clear.
- Failure cases produce clear guidance.
- The consistency check shows no unresolved duplicate coverage or contradictions.
