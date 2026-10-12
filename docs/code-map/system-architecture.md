# plan-product System Architecture

Generated from `docs/code-map/module-map.json` at 2026-10-12T01:45:30.716Z. Regenerate with `map-architecture`.

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
|-- code-map
|   |-- root: scripts/code-map
|   |-- depends on: lib, module-map
|   `-- used by: lib, map-code, module-map
|-- lib
|   |-- root: scripts/lib
|   |-- depends on: code-map, module-map
|   `-- used by: code-map, map-code, module-map
|-- module-map
|   |-- root: scripts/module-map
|   |-- depends on: code-map, lib
|   `-- used by: code-map, lib, map-code
`-- map-code
    |-- root: scripts/map-code
    |-- depends on: code-map, lib, module-map
    `-- used by: -
```

## Module Responsibilities

| Module | Owns | Depends on | Used by | Module file |
|--------|------|------------|---------|-------------|
| code-map | ast-grep-based symbol and endpoint indexer that feeds the module graph. | lib, module-map | lib, map-code, module-map | `docs/code-map/modules/code-map.md` |
| lib | Shared utilities for both generators: plugin-root resolution, ast-grep resolution, skip-dirs, scan parsing, and<br>endpoint extraction. | code-map, module-map | code-map, map-code, module-map | `docs/code-map/modules/lib.md` |
| module-map | Module-graph generator: module discovery, enrichment, rendering, doctor, and bootstrap. | code-map, lib | code-map, lib, map-code | `docs/code-map/modules/module-map.md` |
| map-code | Public mapping workflow, freshness checks, and bounded evidence queries. | code-map, lib, module-map | - | `docs/code-map/modules/map-code.md` |

## Dependency Flows

- `code-map` -> `lib`
- `code-map` -> `module-map`
- `lib` -> `code-map`
- `lib` -> `module-map`
- `map-code` -> `code-map`
- `map-code` -> `lib`
- `map-code` -> `module-map`
- `module-map` -> `code-map`
- `module-map` -> `lib`

<!-- plan-product:system-architecture generated 2026-10-12T01:45:30.716Z -->
