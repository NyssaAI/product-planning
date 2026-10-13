# module-map (`module-map`) — module

**Optional module context.** Use this when it helps orient the task; targeted source reading is also sufficient. Add a directly coupled module only when the work crosses its boundary. Use bounded queries for detailed evidence and verify relevant source.

**What this module does:** Module-graph generator: module discovery, enrichment, rendering, doctor, and bootstrap.

## Capabilities (owns)

- Feature code and services under `scripts/module-map/`

## Does not own

- code-map concerns → code-map module
- lib concerns → lib module

## Public API

| Symbol | Summary |
|--------|---------|
| `selectAdapters` | Select every adapter represented in the configured inventory, including markerless source. |
| `selectAdapter` | Select an adapter for the repo. |
| `runBatchedScan` | Run `ast-grep scan` over the given absolute file paths, batching the argv so no single invocation exceeds the OS command |
| `batchByArgLength` | Split absolute file paths into batches whose joined length stays under maxLen, so no single spawn exceeds the OS command |
| `tsConfigInputs` | Exact config files consulted by the adapter, including inherited package configs. |
| `loadArchitectureModel` |  |
| `normalizeArchitectureModel` |  |
| `renderSystemArchitecture` |  |
| `renderArchitectureTree` |  |
| `sortModulesByDependencyCount` |  |
| `preserveMarkedRegion` |  |
| `readProjectName` |  |
| `detectCodeMapRoots` |  |
| `detectApiRoutes` |  |
| `detectSrcChildModules` |  |
| `bootstrapRepo` |  |
| `buildPlanProductModel` |  |
| `loadPlanProductConfig` |  |
| `validateRequiredDocs` |  |
| `resolveDocPath` |  |

## Boundaries

| | Path |
|--|------|
| Root | `scripts/module-map/` |
| Depends on modules | code-map, lib |
| Used by | code-map, lib, map-code |
| Out of scope | node_modules/, .git/, dist/, build/, .next/, scripts/map-code/, scripts/code-map/, scripts/lib/ |

## Flows

- Feature code and services under `scripts/module-map/`

## Entry points

- `scripts/module-map/lib/stack-profiles/index.mjs`
- `scripts/module-map/lib/adapters/index.mjs`

## Tests

- `test/` (mirrors module source layout)
- `test/module-map/` (mirrors module source layout)

## Configuration

- `package.json`
- `.jamaynor/plan-product/config.json`

## Key symbols (sample)

- `scripts/module-map/lib/adapters/index.mjs`: selectAdapters, selectAdapter
- `scripts/module-map/lib/adapters/sg-scan.mjs`: runBatchedScan, batchByArgLength
- `scripts/module-map/lib/adapters/typescript.mjs`: tsConfigInputs
- `scripts/module-map/lib/architecture.mjs`: loadArchitectureModel, normalizeArchitectureModel, renderSystemArchitecture, renderArchitectureTree, sortModulesByDependencyCount, preserveMarkedRegion
- `scripts/module-map/lib/auto-detect.mjs`: DEFAULT_DOC_CANDIDATES, MODULE_GLOB_CANDIDATES, readProjectName, detectCodeMapRoots, detectApiRoutes, detectSrcChildModules
- `scripts/module-map/lib/bootstrap.mjs`: bootstrapRepo
- `scripts/module-map/lib/build.mjs`: buildPlanProductModel
- `scripts/module-map/lib/config.mjs`: loadPlanProductConfig, validateRequiredDocs, resolveDocPath, writeStarterConfigs
- `scripts/module-map/lib/detection/derive-modules.mjs`: deriveModules
- `scripts/module-map/lib/detection/metrics.mjs`: internalExternalRatio, modularity, cohesion, coupling

## After planning

- **Code-map slice:** query `module module-map` (`moduleId: module-map`) in [code-map.json](../code-map.json) for files, symbols, endpoints, and file dependencies. Symbols above are a sample (66 total); absence of a symbol is not absence of code.
- Open only files your plan names
