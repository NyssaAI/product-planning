# lib (`lib`) — module

**Inject with your task doc.** Read the minimum in-scope module set for the spec — usually one module file; add a directly-coupled module (via its dependsOn/usedBy edges) only when the feature crosses that module's boundary. Never inject all module files or the full code map.

**What this module does:** Shared utilities for both generators: plugin-root resolution, ast-grep resolution, skip-dirs, scan parsing, and endpoint extraction.

## Capabilities (owns)

- Feature code and services under `scripts/lib/`

## Public API

| Symbol | Summary |
|--------|---------|
| `extractEndpoints` |  |
| `nextRouteSegment` |  |
| `findPluginRoot` |  |
| `resolveAstGrepBinary` | Resolve ast-grep binary shipped with the plan-product plugin. |
| `parseScanJson` |  |
| `symbolNameFromMatch` |  |
| `loadUsageSettings` |  |
| `recordUsageEvent` | Best-effort local usage capture. |
| `readUsageEvents` |  |
| `writeEffectivenessReport` |  |
| `buildEffectivenessModel` |  |
| `renderEffectivenessMarkdown` |  |

## Boundaries

| | Path |
|--|------|
| Root | `scripts/lib/` |
| Used by | code-map, module-map |
| Out of scope | node_modules/, .git/, dist/, build/, .next/, scripts/module-map/, scripts/code-map/ |

## Flows

- Feature code and services under `scripts/lib/`

## Tests

- `test/` (mirrors module source layout)

## Configuration

- `package.json`
- `plan-product.config.json`

## Key symbols (sample)

- `scripts/lib/endpoint-extractor.mjs`: extractEndpoints, nextRouteSegment
- `scripts/lib/plugin-root.mjs`: findPluginRoot
- `scripts/lib/resolve-ast-grep.mjs`: resolveAstGrepBinary
- `scripts/lib/sg-result.mjs`: parseScanJson, symbolNameFromMatch
- `scripts/lib/skip-dirs.mjs`: BASE_SKIP_DIRS
- `scripts/lib/usage.mjs`: loadUsageSettings, recordUsageEvent, readUsageEvents, writeEffectivenessReport, buildEffectivenessModel, renderEffectivenessMarkdown

## After planning

- **Code-map slice:** filter [`code-map.json`](../code-map.json) by `moduleId: lib` to get this module's files, symbols, and endpoints
- Open only files your plan names

