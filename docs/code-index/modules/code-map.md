# code-map (`code-map`) — module

**Inject with your task doc.** Read the minimum in-scope module set for the spec — usually one module file; add a directly-coupled module (via its dependsOn/usedBy edges) only when the feature crosses that module's boundary. Never inject all module files or the full code map.

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
| `extractEndpoints` |  |
| `nextRouteSegment` |  |
| `extractFileHeaderComment` |  |
| `annotateCodeMapWithModules` | Add module ownership to a code-map document and expose a flat symbol index. |
| `extractSignature` | Extracts the declaration signature starting at the given line. |
| `SOURCE_EXTENSIONS` | Extensions that drive file detection. |

## Boundaries

| | Path |
|--|------|
| Root | `scripts/code-map/` |
| Depends on modules | lib, module-map |
| Used by | module-map |
| Out of scope | node_modules/, .git/, dist/, build/, .next/, scripts/module-map/, scripts/lib/ |

## Flows

- Feature code and services under `scripts/code-map/`

## Tests

- `test/` (mirrors module source layout)
- `test/code-map/` (mirrors module source layout)

## Configuration

- `package.json`
- `code-indexer.config.json`

## Key symbols (sample)

- `scripts/code-map/lib/code-map-config.mjs`: SUPPORTED_LANGUAGES, SOURCE_EXTENSIONS, loadCodeMapConfig
- `scripts/code-map/lib/comment-extractor.mjs`: extractDocComment
- `scripts/code-map/lib/endpoint-extractor.mjs`: extractEndpoints, nextRouteSegment
- `scripts/code-map/lib/file-header-comment.mjs`: extractFileHeaderComment
- `scripts/code-map/lib/module-linker.mjs`: annotateCodeMapWithModules
- `scripts/code-map/lib/signature-extractor.mjs`: extractSignature

## After planning

- **Code-map slice:** filter [`code-map.json`](../code-map.json) by `moduleId: code-map` to get this module's files, symbols, and endpoints
- Open only files your plan names

