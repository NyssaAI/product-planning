# ai-plan (`scripts-ai-plan`) — module

**Inject with your task doc only.** Do not load other module files or the full code map for planning.

**What this module does:** `ai-plan` — 33 files under `scripts/ai-plan/`.

## Capabilities (owns)

- ADAPTERS
- API_ROUTE_CANDIDATES
- CODE_ROOT_CANDIDATES

## Does not own

- scripts-lib concerns → scripts-lib module

## Public API

| Symbol | Signature | Summary |
|--------|-----------|---------|
| `selectAdapter` | `export function selectAdapter(repoRoot, forcedId)` | Select an adapter for the repo. |
| `matches` | `export function matches(repoRoot)` |  |
| `extract` | `export function extract(repoRoot, files)` |  |
| `matches` | `export function matches(repoRoot)` |  |
| `extract` | `export function extract(repoRoot, files)` |  |
| `readProjectName` | `export function readProjectName(repoRoot)` |  |
| `detectCodeMapRoots` | `export function detectCodeMapRoots(repoRoot)` |  |
| `detectApiRoutes` | `export function detectApiRoutes(repoRoot)` |  |
| `detectSrcChildModules` | `export function detectSrcChildModules(repoRoot)` |  |
| `bootstrapRepo` | `export function bootstrapRepo(repoRoot, options = {})` |  |
| `buildAiPlanModel` | `export function buildAiPlanModel(repoRoot, config, codeMapFiles)` |  |
| `loadAiPlanConfig` | `export function loadAiPlanConfig(repoRoot, opts = {})` |  |
| `validateRequiredDocs` | `export function validateRequiredDocs(repoRoot, config)` |  |
| `resolveDocPath` | `export function resolveDocPath(repoRoot, candidates)` |  |
| `writeStarterConfigs` | `export function writeStarterConfigs(repoRoot)` |  |
| `deriveModules` | `export function deriveModules(repoRoot, fileGraph, options = {})` |  |
| `internalExternalWeights` | `export function internalExternalWeights(edges, assign)` | Internal vs. |
| `internalExternalRatio` | `export function internalExternalRatio(edges, assign)` | internal / (internal + external). |
| `modularity` | `export function modularity(edges, assign)` | Newman modularity Q for an assignment (weighted, undirected). |
| `cohesion` | `export function cohesion(edges, assign, moduleId)` | Cohesion of one module: internal weight / (internal + boundary). |

## Boundaries

| | Path |
|--|------|
| Root | `scripts/ai-plan/` |
| Depends on modules | scripts-lib |
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
- `scripts/ai-plan/lib/adapters/typescript.mjs`: matches, extract
- `scripts/ai-plan/lib/auto-detect.mjs`: DEFAULT_DOC_CANDIDATES, CODE_ROOT_CANDIDATES, API_ROUTE_CANDIDATES, MODULE_GLOB_CANDIDATES, readProjectName, detectCodeMapRoots, detectApiRoutes, detectSrcChildModules
- `scripts/ai-plan/lib/bootstrap.mjs`: bootstrapRepo
- `scripts/ai-plan/lib/build.mjs`: buildAiPlanModel
- `scripts/ai-plan/lib/config.mjs`: loadAiPlanConfig, validateRequiredDocs, resolveDocPath, writeStarterConfigs
- `scripts/ai-plan/lib/detection/derive-modules.mjs`: deriveModules
- `scripts/ai-plan/lib/detection/metrics.mjs`: internalExternalWeights, internalExternalRatio, modularity, cohesion, coupling
- `scripts/ai-plan/lib/detection/partitions.mjs`: DEFAULT_EXCLUDE, topLevelAreas, filesInArea, maxDepth, partitionAtDepth, sizeByModule

## After planning

- Symbols: [`code-map.json`](../code-map.json)
- Open only files your plan names

