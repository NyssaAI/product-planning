---
id: F-00.01
group: "00"
status: complete
---

# F-00.01 Custom Planning Locations

## Summary

Allow teams to choose where their product, feature, and roadmap documents live so planning fits naturally into their existing project organization.

## User Need

Teams want their planning documents stored in the folders they already use for project documentation, and they need those locations to work identically for every teammate without broken links.

## Conceptual Context

- [C-03: Path Authority & Non-Destructive Preservation](../../concepts/c-03-path-authority-and-preservation.md) — enforces repo-relative path resolution, alias synchronization, and pre-write safety checks.

## Use Cases

None yet.

## Scope

- Let teams define custom project locations for product overviews, feature catalogs, feature guides, use cases, roadmaps, and document templates.
- Keep all document locations portable across different people's computers and workspaces.
- Prevent invalid locations that point outside the project or collide with existing folders before any files are written.

## Out of Scope

- Managing files or settings unrelated to product planning.
- Automatically moving existing documents when a team changes its preferred folder preferences.

## Inputs

- The team's preferred folder and document locations within the project.

## Outputs

- A shared, project-wide agreement on where each planning document and starter template lives.

## Acceptance

- Teams can customize where planning documents live and have every planning workflow respect those locations.
- Re-running setup preserves the team's custom locations without resetting them to defaults.
- Unsafe or conflicting document locations are rejected clearly before any files are created or changed.

## Dependencies

- None.
