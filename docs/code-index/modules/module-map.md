# module-map (`module-map`) — module

**Inject with your task doc.** Read the minimum in-scope module set for the spec — usually one module file; add a directly-coupled module (via its dependsOn/usedBy edges) only when the feature crosses that module's boundary. Never inject all module files or the full code map.

**What this module does:** Module-graph generator: module discovery, enrichment, rendering, doctor, and bootstrap.

## Capabilities (owns)

- Feature code and services under `scripts/module-map/`

## Does not own

- code-map concerns → code-map module
- lib concerns → lib module

## Public API

| Symbol | Summary |
|--------|---------|
| `selectAdapter` | Select an adapter for the repo. |
| `runBatchedScan` | Run `ast-grep scan` over the given absolute file paths, batching the argv so no single invocation exceeds the OS command |
| `batchByArgLength` | Split absolute file paths into batches whose joined length stays under maxLen, so no single spawn exceeds the OS command |
| `loadArchitectureModel` |  |
| `normalizeArchitectureModel` |  |
| `renderSystemArchitecture` |  |
| `renderArchitectureMermaid` |  |
| `createMermaidNodeIds` |  |
| `sanitizeMermaidId` |  |
| `preserveMarkedRegion` |  |
| `readProjectName` |  |
| `detectCodeMapRoots` |  |
| `detectApiRoutes` |  |
| `detectSrcChildModules` |  |
| `bootstrapRepo` |  |
| `buildCodeIndexerModel` |  |
| `loadCodeIndexerConfig` |  |
| `validateRequiredDocs` |  |
| `resolveDocPath` |  |
| `writeStarterConfigs` |  |

## Boundaries

| | Path |
|--|------|
| Root | `scripts/module-map/` |
| Depends on modules | code-map, lib |
| Used by | code-map |
| Out of scope | node_modules/, .git/, dist/, build/, .next/, scripts/code-map/, scripts/lib/ |

## Flows

- Feature code and services under `scripts/module-map/`

## Tests

- `test/` (mirrors module source layout)
- `test/module-map/` (mirrors module source layout)

## Configuration

- `package.json`
- `code-indexer.config.json`

## Key symbols (sample)

- `scripts/module-map/lib/adapters/index.mjs`: selectAdapter
- `scripts/module-map/lib/adapters/sg-scan.mjs`: runBatchedScan, batchByArgLength
- `scripts/module-map/lib/architecture.mjs`: loadArchitectureModel, normalizeArchitectureModel, renderSystemArchitecture, renderArchitectureMermaid, createMermaidNodeIds, sanitizeMermaidId, preserveMarkedRegion
- `scripts/module-map/lib/auto-detect.mjs`: DEFAULT_DOC_CANDIDATES, MODULE_GLOB_CANDIDATES, readProjectName, detectCodeMapRoots, detectApiRoutes, detectSrcChildModules
- `scripts/module-map/lib/bootstrap.mjs`: bootstrapRepo
- `scripts/module-map/lib/build.mjs`: buildCodeIndexerModel
- `scripts/module-map/lib/config.mjs`: loadCodeIndexerConfig, validateRequiredDocs, resolveDocPath, writeStarterConfigs
- `scripts/module-map/lib/detection/derive-modules.mjs`: deriveModules
- `scripts/module-map/lib/detection/metrics.mjs`: internalExternalRatio, modularity, cohesion, coupling
- `scripts/module-map/lib/detection/partitions.mjs`: DEFAULT_EXCLUDE, topLevelAreas, filesInArea, maxDepth, partitionAtDepth, sizeByModule

## After planning

- **Code-map slice:** filter [`code-map.json`](../code-map.json) by `moduleId: module-map` to get this module's files, symbols, and endpoints
- Open only files your plan names

