---
description: Interview the user and create or update one use case under a feature folder, checked for distinct, non-contradictory coverage.
argument-hint: "[feature id + use-case name]"
---

# plan-use-case - define a feature use case

Load the `plan-use-case` skill and follow its workflow. The skill owns the entry-route/trigger separation, the ASCII process-tree shape, the sibling-comparison consistency check, and the failure-case rules; this command file is only the entry point.

Interview the user and create or update one use case under a feature folder.

## Writes

- the configured use-case path from `structure.features.useCasePathPattern`
- the use-case list in the configured parent feature guide from `structure.features.featurePathPattern`

Use `paths.useCaseTemplate` for file shape. The use-case process should be shown as an ASCII tree, with descriptions below only for complex steps. Before finalizing, compare against sibling use cases to confirm it is distinct and does not contradict them.
