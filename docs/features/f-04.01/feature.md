---
id: F-04.01
group: "04"
status: complete
---

# F-04.01 Legacy Planning Document Upgrade

## Summary

Upgrade older planning documents to the current functional grouping and numbering conventions automatically while preserving every product decision and local note.

## User Need

Teams with existing planning documents written under an earlier numbering convention need a safe, effortless way to adopt the current `F-gg.nn`, `UC-gg.nn.uu`, and `R-pp.ss` scheme without manually renaming files, fixing links, or losing their written content.

## Conceptual Context

- [C-01: Canonical Planning Taxonomy & Hierarchy](../../concepts/c-01-canonical-planning-taxonomy.md) — migrates legacy v1 identifiers (`F-Nxx`, `UC-nnn`, `R-NNN`) into the v2 canonical taxonomy.
- [C-03: Path Authority & Non-Destructive Preservation](../../concepts/c-03-path-authority-and-preservation.md) — upgrades legacy v1 repositories to v2 while preserving all user-authored notes and custom paths.

## Use Cases

None yet.

## Scope

- Detect when a project's planning documents use an earlier numbering convention.
- Translate feature IDs, use case IDs, roadmap step IDs, folder names, and cross-document links to the current scheme.
- Clean up legacy checklist summaries by moving inline links and descriptions into the detailed feature inventory section.
- Keep legacy upgrade rules isolated to the maintenance workflow so day-to-day planning stays focused solely on the current model.

## Out of Scope

- Inventing new product requirements or altering user-written scope decisions during an upgrade.

## Inputs

- Existing project planning documents written under an earlier convention.
- User confirmation to proceed with the upgrade.

## Outputs

- Upgraded planning documents, folders, and cross-links matching the current numbering and formatting conventions.

## Acceptance

- Upgrading an older project updates all feature, use-case, and roadmap identifiers and links without breaking references.
- All user-authored product descriptions, scope boundaries, and custom notes are preserved intact.
- Day-to-day planning workflows remain completely free of legacy numbering rules.

## Dependencies

- F-00.01, F-01.03, F-03.01.
