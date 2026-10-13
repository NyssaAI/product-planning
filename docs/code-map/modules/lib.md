# lib (`lib`) — module

**Optional module context.** Use this when it helps orient the task; targeted source reading is also sufficient. Add a directly coupled module only when the work crosses its boundary. Use bounded queries for detailed evidence and verify relevant source.

**What this module does:** Shared utilities for both generators: plugin-root resolution, ast-grep resolution, skip-dirs, scan parsing, and endpoint extraction.

## Capabilities (owns)

- Feature code and services under `scripts/lib/`

## Does not own

- code-map concerns → code-map module
- module-map concerns → module-map module

## Public API

| Symbol | Summary |
|--------|---------|
| `resolveCodeMapOutput` | Resolve the shared code-map output contract used by both generators. |
| `extractEndpoints` |  |
| `nextRouteSegment` |  |
| `scanEndpointSyntax` | Parse the explicit endpoint source inventory once, in bounded batches. |
| `resolveGeneratorConfigPath` | New repositories use the namespaced file. |
| `hasGeneratorConfig` |  |
| `isExcludedGoFile` | The single Go file-exclusion policy: vendored, fixture, generated, and test Go files stay out of the symbol index, the e |
| `readGoWorkMembers` | Parses `use` directives from a root go.work file: every block form (`use ( ... |
| `readGoModulePath` |  |
| `captureMapInputs` | Capture content, inventory, configuration, resolver metadata and generator identity. |
| `beginMapScan` | Invalidate the previous success before either generator can write partial outputs. |
| `completeMapScan` | Call only after both core generators succeed. |
| `checkMapFreshness` | Shared freshness result for the CLI, doctor and regeneration hooks. |
| `isPlanProductPluginRoot` | True when an environment-provided directory is a plan-product plugin root: a supported plugin manifest or package.json m |
| `findPluginRoot` |  |
| `isPathContained` |  |
| `resolveRepoContainedPath` | Resolve a configured path and reject escapes from the repository. |
| `resolveRepoRelativePath` | Validate a configured path and return its normalized repo-relative form. |
| `astGrepPlatformPackage` | The @ast-grep/cli optionalDependency holding this platform's prebuilt binary. |
| `resolveAstGrepBinary` | Resolve ast-grep binary shipped with the plan-product plugin. |

## Boundaries

| | Path |
|--|------|
| Root | `scripts/lib/` |
| Depends on modules | code-map, module-map |
| Used by | code-map, map-code, module-map |
| Out of scope | node_modules/, .git/, dist/, build/, .next/, scripts/map-code/, scripts/module-map/, scripts/code-map/ |

## Flows

- Feature code and services under `scripts/lib/`

## Tests

- `test/` (mirrors module source layout)

## Configuration

- `package.json`
- `.jamaynor/plan-product/config.json`

## Key symbols (sample)

- `scripts/lib/code-map-output.mjs`: DEFAULT_CODE_MAP_OUTPUT, resolveCodeMapOutput
- `scripts/lib/endpoint-extractor.mjs`: extractEndpoints, nextRouteSegment
- `scripts/lib/endpoint-syntax.mjs`: scanEndpointSyntax
- `scripts/lib/generator-config.mjs`: GENERATOR_CONFIG, LEGACY_GENERATOR_CONFIG, resolveGeneratorConfigPath, hasGeneratorConfig
- `scripts/lib/go-mod.mjs`: isExcludedGoFile, readGoWorkMembers, readGoModulePath
- `scripts/lib/map-freshness.mjs`: captureMapInputs, beginMapScan, completeMapScan, checkMapFreshness
- `scripts/lib/plugin-root.mjs`: isPlanProductPluginRoot, findPluginRoot
- `scripts/lib/repo-paths.mjs`: isPathContained, resolveRepoContainedPath, resolveRepoRelativePath
- `scripts/lib/resolve-ast-grep.mjs`: astGrepPlatformPackage, resolveAstGrepBinary
- `scripts/lib/sg-result.mjs`: parseScanJson, symbolNameFromMatch

## After planning

- **Code-map slice:** query `module lib` (`moduleId: lib`) in [code-map.json](../code-map.json) for files, symbols, endpoints, and file dependencies. Symbols above are a sample (33 total); absence of a symbol is not absence of code.
- Open only files your plan names
