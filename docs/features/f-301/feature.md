---
id: F-301
phase: 3
status: complete
---

# F-301 Product Roadmap

## Summary

Sequence product deliverables independently of feature phase numbering.

## User Need

Product owners need an ordered view of what becomes usable first, what depends on it, and how each deliverable can be accepted.

## Use Cases

None yet.

## Scope

- Ordered `R-NNN` slices with one parent feature and optional `after:` dependencies.
- Stable IDs, immutable completion history, coverage checks, and cycle detection.
- User-observable `Verify:` checkpoints and validated deferral references.
- Configured roadmap path and template, supplied through initialization.

## Out of Scope

- Feature definitions and phase ownership, which remain in the inventory and feature guides.
- Engineering plans and execution.

## Inputs

Planning configuration, approved feature inventory and guides, roadmap template, and user decisions.

## Outputs

The configured roadmap; inventory status corrections only when authorized.

## Acceptance

Every slice resolves to one feature. Open features have coverage. Open slices follow declared dependencies. Verification deferrals resolve to later concrete checkpoints. Completed history and stable IDs survive edits.

## Dependencies

F-101, F-102, F-103.
