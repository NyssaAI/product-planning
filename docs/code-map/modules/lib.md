# lib (`lib`) — module

**Inject with your task doc.** Read the minimum in-scope module set for the spec — usually one module file; add a directly-coupled module (via its dependsOn/usedBy edges) only when the feature crosses that module's boundary. Never inject all module files or the full code map.

**What this module does:** Shared utilities for both generators: plugin-root resolution, ast-grep resolution, skip-dirs, scan parsing, and endpoint extraction.

## Capabilities (owns)

- Feature code and services under `scripts/lib/`

## Public API

| Symbol | Summary |
|--------|---------|
| `resolveCodeMapOutput` | Resolve the shared code-map output contract used by both generators. |
| `extractEndpoints` |  |
| `nextRouteSegment` |  |
| `isExcludedGoFile` | The single Go file-exclusion policy: vendored, fixture, generated, and test Go files stay out of the symbol index, the e |
| `readGoWorkMembers` | Parses `use` directives from a root go.work file: every block form (`use ( ... |
| `readGoModulePath` |  |
| `isPlanProductPluginRoot` | True when an environment-provided directory is a plan-product plugin root: it carries Claude's plugin manifest or a pack |
| `findPluginRoot` |  |
| `isPathContained` |  |
| `resolveRepoContainedPath` | Resolve a configured path and reject escapes from the repository. |
| `resolveRepoRelativePath` | Validate a configured path and return its normalized repo-relative form. |
| `astGrepPlatformPackage` | The @ast-grep/cli optionalDependency holding this platform's prebuilt binary. |
| `resolveAstGrepBinary` | Resolve ast-grep binary shipped with the plan-product plugin. |
| `parseScanJson` |  |
| `symbolNameFromMatch` |  |
| `loadUsageSettings` |  |
| `recordUsageEvent` |  |
| `readUsageEvents` |  |
| `writeEffectivenessReport` |  |
| `buildEffectivenessModel` |  |

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

- `scripts/lib/code-map-output.mjs`: DEFAULT_CODE_MAP_OUTPUT, resolveCodeMapOutput
- `scripts/lib/endpoint-extractor.mjs`: extractEndpoints, nextRouteSegment
- `scripts/lib/go-mod.mjs`: isExcludedGoFile, readGoWorkMembers, readGoModulePath
- `scripts/lib/plugin-root.mjs`: isPlanProductPluginRoot, findPluginRoot
- `scripts/lib/repo-paths.mjs`: isPathContained, resolveRepoContainedPath, resolveRepoRelativePath
- `scripts/lib/resolve-ast-grep.mjs`: astGrepPlatformPackage, resolveAstGrepBinary
- `scripts/lib/sg-result.mjs`: parseScanJson, symbolNameFromMatch
- `scripts/lib/skip-dirs.mjs`: BASE_SKIP_DIRS
- `scripts/lib/usage.mjs`: loadUsageSettings, recordUsageEvent, readUsageEvents, writeEffectivenessReport, buildEffectivenessModel, renderEffectivenessMarkdown
- `scripts/lib/write-artifact.mjs`: writeArtifactIfChanged

## After planning

- **Code-map slice:** filter [`code-map.json`](../code-map.json) by `moduleId: lib` to get this module's files, symbols, and endpoints
- Open only files your plan names

