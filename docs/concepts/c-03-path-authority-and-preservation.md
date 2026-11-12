---
id: C-03
kind: domain-model
status: active
---

# C-03: Path Authority & Non-Destructive Preservation

## Summary

Every planning workflow resolves document and template locations from layered configuration (`user_home` -> `repo_root`) while guaranteeing that user-authored content, custom templates, and local notes are never overwritten destructively. Setup, updates, and model upgrades operate idempotently and fail safely before writing if any path escapes `repo_root` or collides.

## Core Model / Stages

- **Layered Path Authority** (`user_home` `~/.nyssa-ai/plan-product/` -> `repo_root` `<repo_root>/.nyssa-ai/plan-product/config.json`): Owns `repo_root`-relative locations for core documents, Ubiquitous Language glossary, feature and concept roots, development plan, starter templates, and naming patterns, while routing mutable telemetry strictly to `runtime_root`.
- **Template-Only Detection**: A document that matches its configured starter template byte-for-byte is classified as `template only` and can be seeded directly from an interview; any document with user edits requires merge-by-heading preservation.
- **Merge-by-Heading Preservation**: Updates modify only the targeted sections while retaining unmatched headings, comments, custom templates, and local notes intact.
- **Pre-Write Safety Boundary**: Path containment within `repo_root`, symlink/junction escape checks, and file/folder collision checks run in full before the first file is written.

## Invariants & Rules

- **`repo_root` Containment**: All configured planning paths must resolve inside `repo_root`; absolute paths, parent traversals (`..`), and external directory junctions are rejected before any write occurs.
- **Read Template Immediately Before Write**: Workflows must read the user's configured template file right before generating or updating a document so team template customizations are always respected.
- **Non-Destructive Unknown Handling**: When a user skips a question or marks a detail unknown, `To be defined.` may only be written into an empty section—never replacing existing user-written content.
- **Idempotent Repair & Upgrade**: Re-running project initialization or model migration restores missing templates and upgrades legacy identifiers while leaving existing user decisions byte-for-byte intact.

## Participating Features

- [F-00.01: Custom Planning Locations](../features/f-00.01/feature.md) — enforces `repo_root`-relative path resolution, `user_home` -> `repo_root` precedence, and pre-write safety checks.
- [F-00.02: Core Product Overview Documents](../features/f-00.02/feature.md) — applies template-only detection and merge-by-heading preservation when updating overview and glossary docs.
- [F-00.03: Customizable Document Templates](../features/f-00.03/feature.md) — preserves custom starter templates and restores missing templates at their configured paths.
- [F-04.01: Legacy Planning Document Upgrade](../features/f-04.01/feature.md) — upgrades legacy repositories to v2 while preserving all user-authored notes and custom paths.
