# ai-plan (`scripts-ai-plan`) — module

**Inject with your task doc.** Read the minimum in-scope module set for the spec — usually one module file; add a directly-coupled module (via its dependsOn/usedBy edges) only when the feature crosses that module's boundary. Never inject all module files or the full code map.

**What this module does:** `ai-plan` — 35 files under `scripts/ai-plan/`.

## Capabilities (owns)

- ADAPTERS
- API_ROUTE_CANDIDATES
- CODE_ROOT_CANDIDATES

## Does not own

- scripts-code-map concerns → scripts-code-map module
- scripts-lib concerns → scripts-lib module

## Public API

| Symbol | Summary |
|--------|---------|
| `selectAdapter` | Select an adapter for the repo. |
| `matches` |  |
| `extract` |  |
| `runBatchedScan` | Run `ast-grep scan` over the given absolute file paths, batching the argv so no single invocation exceeds the OS command |
| `batchByArgLength` | Split absolute file paths into batches whose joined length stays under maxLen, so no single spawn exceeds the OS command |
| `matches` |  |
| `extract` |  |
| `readProjectName` |  |
| `detectCodeMapRoots` |  |
| `detectApiRoutes` |  |
| `detectSrcChildModules` |  |
| `bootstrapRepo` |  |
| `buildAiPlanModel` |  |
| `loadAiPlanConfig` |  |
| `validateRequiredDocs` |  |
| `resolveDocPath` |  |
| `writeStarterConfigs` |  |
| `deriveModules` |  |
| `internalExternalWeights` | Internal vs. |
| `internalExternalRatio` | internal / (internal + external). |

## Boundaries

| | Path |
|--|------|
| Root | `scripts/ai-plan/` |
| Depends on modules | scripts-code-map, scripts-lib |
| Used by | scripts-code-map, test |
| Out of scope | node_modules/, .git/, dist/, build/, .next/, hooks/, .opencode/, scripts/ |

## Flows

- Feature code and services under `scripts/ai-plan/`

## Tests

- `test/` (mirrors module layout per standards/project-structure.md)
- `test/ai-plan/` (mirrors module layout per standards/project-structure.md)

## Configuration

- `package.json`
- `code-map.config.json`

## Key symbols (sample)

- `scripts/ai-plan/lib/adapters/index.mjs`: ADAPTERS, selectAdapter
- `scripts/ai-plan/lib/adapters/python.mjs`: matches, extract
- `scripts/ai-plan/lib/adapters/sg-scan.mjs`: MAX_SCAN_ARG_LENGTH, runBatchedScan, batchByArgLength
- `scripts/ai-plan/lib/adapters/typescript.mjs`: matches, extract
- `scripts/ai-plan/lib/auto-detect.mjs`: DEFAULT_DOC_CANDIDATES, CODE_ROOT_CANDIDATES, API_ROUTE_CANDIDATES, MODULE_GLOB_CANDIDATES, readProjectName, detectCodeMapRoots, detectApiRoutes, detectSrcChildModules
- `scripts/ai-plan/lib/bootstrap.mjs`: bootstrapRepo
- `scripts/ai-plan/lib/build.mjs`: buildAiPlanModel
- `scripts/ai-plan/lib/config.mjs`: loadAiPlanConfig, validateRequiredDocs, resolveDocPath, writeStarterConfigs
- `scripts/ai-plan/lib/detection/derive-modules.mjs`: deriveModules
- `scripts/ai-plan/lib/detection/metrics.mjs`: internalExternalWeights, internalExternalRatio, modularity, cohesion, coupling

## After planning

- **Code-map slice:** filter [`code-map.json`](../code-map.json) by `moduleId: scripts-ai-plan` to get this module's files, symbols, and endpoints
- Open only files your plan names

