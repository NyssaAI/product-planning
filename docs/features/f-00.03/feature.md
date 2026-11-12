---
id: F-00.03
group: "00"
status: complete
---

# F-00.03 Customizable Document Templates

## Summary

Provide editable starter templates so every new product, glossary, concept, feature, use-case, and development plan document starts with a consistent structure tailored to the team.

## User Need

Teams want new planning documents to follow a predictable, readable layout without having to format headings by hand—and if they customize a template for their workflow, they need future documents to use their customized layout.

## Conceptual Context

- [C-03: Path Authority & Non-Destructive Preservation](../../concepts/c-03-path-authority-and-preservation.md) — preserves custom starter templates and restores missing templates at their configured paths.

## Use Cases

None yet.

## Scope

- Provide starter templates for the product overview, Ubiquitous Language glossary, domain concepts, feature catalog, technology overview, individual feature guides, actor use cases, and phased development plan.
- Restore any missing starter templates automatically during project setup.
- Respect and preserve any customizations a team makes to its templates when creating new documents.

## Out of Scope

- Overwriting existing user-edited templates or completed planning documents.
- Upgrading documents written under older numbering conventions (owned by F-04.01).

## Inputs

- The team's customized starter templates, or the default starter layouts when none have been customized.

## Outputs

- Ready-to-use document templates that shape newly created planning documents.

## Acceptance

- Every new product, glossary, concept, feature, use-case, or development plan document follows the team's current template layout.
- Custom edits made to any starter template survive repeated setup runs untouched.
- If a template is accidentally deleted, setup restores it without disturbing existing planning documents.

## Dependencies

- F-00.01.
