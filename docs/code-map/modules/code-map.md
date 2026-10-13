# code-map (`code-map`) — module

**Optional module context.** Use this when it helps orient the task; targeted source reading is also sufficient. Add a directly coupled module only when the work crosses its boundary. Use bounded queries for detailed evidence and verify relevant source.

**What this module does:** ast-grep-based symbol and endpoint indexer that feeds the module graph.

## Capabilities (owns)

- Feature code and services under `scripts/code-map/`

## Does not own

- lib concerns → lib module
- module-map concerns → module-map module

## Public API

| Symbol | Summary |
|--------|---------|
| `loadCodeMapConfig` |  |
| `extractDocComment` | Scans backwards from a symbol's declaration line for a leading comment block (`//`, `/* … *​/`, `#`, `"""`) and extracts |
| `extractFileHeaderComment` |  |
| `annotateCodeMapWithModules` | Store ownership once per file; files[].symbols is the canonical symbol index. |
| `loadPatternCatalogs` |  |
| `loadJsonArtifact` |  |
| `buildPatternReport` |  |
| `renderPatternsMarkdown` | Render a bounded reading guide; patterns.json retains the complete evidence. |
| `loadPatternRuntimeConfig` |  |
| `partitionPatternEligibleFiles` |  |
| `runPatternScan` |  |
| `writeTempAstGrepConfig` |  |
| `cleanupTempAstGrepConfig` |  |
| `extractSignature` | Extracts the declaration signature starting at the given line. |
| `isInSkippedDir` | Whether a repo-relative path sits under a directory the source walkers skip. |
| `sourceFilesInRoots` |  |
| `sourceInventory` | Shared source boundary for symbols, endpoints, patterns, and dependency adapters. |
| `languageForFile` |  |
| `isLanguageEnabled` | True when the file maps to a configured language. |
| `isKnownSourceFile` |  |

## Boundaries

| | Path |
|--|------|
| Root | `scripts/code-map/` |
| Depends on modules | lib, module-map |
| Used by | lib, map-code, module-map |
| Out of scope | node_modules/, .git/, dist/, build/, .next/, scripts/map-code/, scripts/module-map/, scripts/lib/ |

## Flows

- Feature code and services under `scripts/code-map/`

## Tests

- `test/` (mirrors module source layout)
- `test/code-map/` (mirrors module source layout)

## Configuration

- `package.json`
- `.jamaynor/plan-product/config.json`

## Key symbols (sample)

- `scripts/code-map/lib/code-map-config.mjs`: SUPPORTED_LANGUAGES, SOURCE_EXTENSIONS, loadCodeMapConfig
- `scripts/code-map/lib/comment-extractor.mjs`: extractDocComment
- `scripts/code-map/lib/file-header-comment.mjs`: extractFileHeaderComment
- `scripts/code-map/lib/module-linker.mjs`: annotateCodeMapWithModules
- `scripts/code-map/lib/patterns/catalog.mjs`: loadPatternCatalogs
- `scripts/code-map/lib/patterns/model.mjs`: loadJsonArtifact, buildPatternReport
- `scripts/code-map/lib/patterns/render.mjs`: renderPatternsMarkdown
- `scripts/code-map/lib/patterns/runtime-config.mjs`: loadPatternRuntimeConfig
- `scripts/code-map/lib/patterns/scanner.mjs`: partitionPatternEligibleFiles, runPatternScan
- `scripts/code-map/lib/patterns/temp-rules.mjs`: writeTempAstGrepConfig, cleanupTempAstGrepConfig

## After planning

- **Code-map slice:** query `module code-map` (`moduleId: code-map`) in [code-map.json](../code-map.json) for files, symbols, endpoints, and file dependencies. Symbols above are a sample (26 total); absence of a symbol is not absence of code.
- Open only files your plan names
