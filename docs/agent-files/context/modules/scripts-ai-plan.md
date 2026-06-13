# ai-plan (`scripts-ai-plan`) — module

**Inject with your task doc only.** Do not load other module files or the full code map for planning.

**What this module does:** `ai-plan` — 32 files under `scripts/ai-plan/`.

## Capabilities (owns)

- ADAPTERS
- API_ROUTE_CANDIDATES
- CODE_ROOT_CANDIDATES

## Does not own

- scripts-lib concerns → scripts-lib module

## Public API

| Symbol | Signature | Summary |
|--------|-----------|---------|
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
| `discoverModules` | `export function discoverModules(repoRoot, config)` |  |
| `parseNavEntries` | `export function parseNavEntries(navPath)` |  |
| `loadProjectBrief` | `export function loadProjectBrief(repoRoot, config)` |  |
| `extractConventionsFromTechStack` | `export function extractConventionsFromTechStack(techStackExcerpt)` | Pull bullet lines from tech-stack excerpt for planner conventions. |
| `checkRuntimeReadiness` | `export function checkRuntimeReadiness(repoRoot = process.cwd())` |  |
| `runDoctor` | `export function runDoctor(repoRoot, options = {})` |  |
| `formatDoctorReport` | `export function formatDoctorReport(report)` |  |
| `renderModuleMapTable` | `export function renderModuleMapTable(modules)` |  |
| `embedModuleMap` | `export function embedModuleMap(repoRoot, tableMarkdown)` | Embeds the current module capability table into CLAUDE.md and AGENTS.md (whichever exist at the repo root). |
| `createLogger` | `export function createLogger(bindings = {})` |  |

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

## Configuration

- `package.json`

## Key symbols (sample)

- `scripts/ai-plan/lib/auto-detect.mjs`: DEFAULT_DOC_CANDIDATES, CODE_ROOT_CANDIDATES, API_ROUTE_CANDIDATES, MODULE_GLOB_CANDIDATES, readProjectName, detectCodeMapRoots, detectApiRoutes, detectSrcChildModules
- `scripts/ai-plan/lib/bootstrap.mjs`: bootstrapRepo
- `scripts/ai-plan/lib/build.mjs`: buildAiPlanModel
- `scripts/ai-plan/lib/config.mjs`: loadAiPlanConfig, validateRequiredDocs, resolveDocPath, writeStarterConfigs
- `scripts/ai-plan/lib/discover-modules.mjs`: discoverModules, parseNavEntries
- `scripts/ai-plan/lib/docs.mjs`: loadProjectBrief, extractConventionsFromTechStack
- `scripts/ai-plan/lib/doctor.mjs`: checkRuntimeReadiness, runDoctor, formatDoctorReport
- `scripts/ai-plan/lib/embed.mjs`: renderModuleMapTable, embedModuleMap
- `scripts/ai-plan/lib/logger.mjs`: createLogger, log
- `scripts/ai-plan/lib/migrate.mjs`: runMigrate, formatMigrateReport

## After planning

- Symbols: [`code-map.json`](../code-map.json)
- Open only files your plan names

