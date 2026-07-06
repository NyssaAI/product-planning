# plan-product System Architecture

Generated from `docs/code-map/module-map.json` at 2026-07-06T12:33:31.650Z. Regenerate with `map-architecture`.

## Use This When

- Use for repo onboarding, cross-module architecture review, and human handoff.
- For routine implementation planning, start with the generated index and the minimum relevant module files.

## System Overview

<!-- plan-product:system-overview:start -->
Summarize the system architecture here after reviewing the generated component tree, module responsibilities, dependency flows, and relevant product docs.
<!-- plan-product:system-overview:end -->

## Component Tree

```text
plan-product
|-- lib
|   |-- root: scripts/lib
|   |-- depends on: -
|   `-- used by: code-map, module-map
|-- code-map
|   |-- root: scripts/code-map
|   |-- depends on: lib, module-map
|   `-- used by: module-map
`-- module-map
    |-- root: scripts/module-map
    |-- depends on: code-map, lib
    `-- used by: code-map
```

## Module Responsibilities

| Module | Owns | Depends on | Used by | Module file |
|--------|------|------------|---------|-------------|
| lib | Shared utilities for both generators: plugin-root resolution, ast-grep resolution, skip-dirs, scan parsing. | - | code-map, module-map | `docs/code-map/modules/lib.md` |
| code-map | ast-grep-based symbol and endpoint indexer that feeds the module graph. | lib, module-map | module-map | `docs/code-map/modules/code-map.md` |
| module-map | Module-graph generator: module discovery, enrichment, rendering, doctor, and bootstrap. | code-map, lib | code-map | `docs/code-map/modules/module-map.md` |

## Dependency Flows

- `code-map` -> `lib`
- `code-map` -> `module-map`
- `module-map` -> `code-map`
- `module-map` -> `lib`

<!-- plan-product:system-architecture generated 2026-07-06T12:33:31.650Z -->
