# plan-feature - define a feature

Interview the user and create or update one plan-product feature guide. Confirm the feature boundary before writing, then check for duplicate or contradictory ownership across existing feature guides.

## Writes

- the configured feature inventory path, usually `docs/features.md`
- the configured feature guide path from `structure.features.featurePathPattern`

Use `.plan-product/config.json` for paths and `paths.featureTemplate` for file shape. The feature guide should keep `Summary`, `User Need`, `Use Cases`, `Scope`, `Out of Scope`, `Inputs`, `Outputs`, `Acceptance`, and `Dependencies` distinct.

Do not leave placeholder use-case links. List only real `UC-nnn` files or write `None yet.`. When updating older guides with `## Use Case` singular, normalize them to `## User Need` plus `## Use Cases`. Use `plan-use-case` only when the user asks to document specific workflows.
