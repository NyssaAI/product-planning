---
description: Interview the user and create or update one use case under a feature folder, checked for distinct, non-contradictory coverage.
argument-hint: "[feature id + use-case name]"
---

> [!IMPORTANT] Scope Directive
> Entrypoint command for documenting feature use cases. Invokes the `plan-product` facade skill and executes its internal `workflows/use-case.md` runbook.

# plan-use-case - define a feature use case

Load the `plan-product` skill and execute its `workflows/use-case.md` runbook. The workflow owns the entry-route/trigger separation, the ASCII process-tree shape, the sibling-comparison consistency check, and the failure-case rules; this command file is only the entry point.

Interview the user and create or update one use case under a feature folder.

## Invocation Context

Target use case: $ARGUMENTS

## Writes

- the configured use-case path from `structure.features.useCasePathPattern`
- the use-case list in the configured parent feature guide from `structure.features.featurePathPattern`

Use `paths.useCaseTemplate` for file shape. The use-case process should be shown as an ASCII tree, with descriptions below only for complex steps. Before finalizing, compare against sibling use cases to confirm it is distinct and does not contradict them.
