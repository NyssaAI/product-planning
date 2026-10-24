---
id: F-01.02
group: "01"
status: complete
---

# F-01.02 Feature Scope Guides & Actor Use Cases

## Summary

Define clear capability boundaries for each feature and map step-by-step actor workflows, including decision branches and failure handling.

## User Need

Before building a capability, teams need to agree on who needs it, what is in or out of scope, how a user or actor actually walks through the workflow, and what happens when something goes wrong—without duplicating or contradicting another feature.

## Use Cases

- [UC-01.02.01: Define a Feature Guide Through Guided Interview](uc-01.02.01-author-feature-guide.md)

## Scope

- Capture each feature's summary, user need, included scope, explicit out-of-scope boundaries, user-level inputs and outputs, acceptance checks, and feature dependencies in plain, non-technical language.
- Capture concrete actor workflows as use cases with starting context, entry route, trigger, visual process tree, complex step explanations, and failure cases.
- Compare new or updated features and use cases against existing ones to catch overlapping ownership or contradictions before saving.

## Out of Scope

- Technical implementation architecture, database schemas, framework choices, or code design.
- Product-wide build sequencing (owned by F-03.01).

## Inputs

- User answers describing the capability's purpose, boundaries, actors, workflow steps, and edge cases.
- Existing feature guides and use cases for overlap and contradiction checks.

## Outputs

- A confirmed feature guide and any requested use-case workflow documents, synchronized with the feature catalog.

## Acceptance

- Feature guides and use cases contain only user-outcome and actor-behavior language, with no technology selections or implementation details leaked in.
- Overlapping or contradictory scope across features or sibling use cases is flagged and resolved with the user before writing.
- Each use case traces the actor's path from entry route and trigger through decision branches and failure outcomes.

## Dependencies

- F-01.01.
