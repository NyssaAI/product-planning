# ai-plan (`scripts-ai-plan`) — module

**Inject with your task doc only.** Do not load other module files or the full code map for planning.

**What this module does:** `ai-plan` — 35 files under `scripts/ai-plan/`.

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
| `runBatchedScan` | `export function runBatchedScan(binary, repoRoot, absPaths, ruleArgs)` | Run `ast-grep scan` over the given absolute file paths, batching the argv so no single invocation exceeds the OS command |
| `batchByArgLength` | `export function batchByArgLength(absPaths, maxLen = MAX_SCAN_ARG_LENGTH)` | Split absolute file paths into batches whose joined length stays under maxLen, so no single spawn exceeds the OS command |
| `parseScanJson` | `export function parseScanJson(stdout)` |  |
| `matches` | `export function matches(repoRoot)` |  |
| `extract` | `export function extract(repoRoot, files)` |  |
| `readProjectName` | `export function readProjectName(repoRoot)` |  |
| `detectCodeMapRoots` | `export function detectCodeMapRoots(repoRoot)` |  |
| `detectApiRoutes` | `export function detectApiRoutes(repoRoot)` |  |
| `detectSrcChildModules` | `export function detectSrcChildModules(repoRoot)` |  |
| `bootstrapRepo` | `export function bootstrapRepo(repoRoot, options = {})` |  |
| `buildAiPlanModel` | `export function buildAiPlanModel(repoRoot, config, codeMapInput)` |  |
| `loadAiPlanConfig` | `export function loadAiPlanConfig(repoRoot, opts = {})` |  |
| `validateRequiredDocs` | `export function validateRequiredDocs(repoRoot, config)` |  |
| `resolveDocPath` | `export function resolveDocPath(repoRoot, candidates)` |  |
| `writeStarterConfigs` | `export function writeStarterConfigs(repoRoot)` |  |
| `deriveModules` | `export function deriveModules(repoRoot, fileGraph, options = {})` |  |
| `internalExternalWeights` | `export function internalExternalWeights(edges, assign)` | Internal vs. |

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
- `scripts/ai-plan/lib/adapters/sg-scan.mjs`: MAX_SCAN_ARG_LENGTH, runBatchedScan, batchByArgLength, parseScanJson
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

