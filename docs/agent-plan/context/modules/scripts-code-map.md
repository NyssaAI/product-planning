# code-map (`scripts-code-map`) — module

**Inject with your task doc only.** Do not load other module files or the full code map for planning.

**What this module does:** `code-map` — 5 files under `scripts/code-map/`.

## Capabilities (owns)

- DEFAULT_SCAN_ROOTS
- SOURCE_EXTENSIONS
- SUPPORTED_LANGUAGES

## Does not own

- scripts-ai-plan concerns → scripts-ai-plan module
- scripts-lib concerns → scripts-lib module

## Public API

| Symbol | Signature | Summary |
|--------|-----------|---------|
| `loadCodeMapConfig` | `export function loadCodeMapConfig(repoRoot)` |  |
| `extractDocComment` | `export function extractDocComment(filePath, lineNumber)` | Scans backwards from a symbol's declaration line for a leading comment block (`//`, `/* … *​/`, `#`, `"""`) and extracts |
| `extractFileHeaderComment` | `export function extractFileHeaderComment(content)` |  |
| `extractSignature` | `export function extractSignature(filePath, lineNumber)` | Extracts the declaration signature starting at the given line. |
| `DEFAULT_SCAN_ROOTS` | `export const DEFAULT_SCAN_ROOTS = ['src', 'native']; /** @type` |  |

## Boundaries

| | Path |
|--|------|
| Root | `scripts/code-map/` |
| Depends on modules | scripts-ai-plan, scripts-lib |
| Used by | test |
| Out of scope | node_modules/, .git/, dist/, build/, .next/, hooks/, .opencode/, scripts/ |

## Flows

- Feature code and services under `scripts/code-map/`

## Tests

- `test/` (mirrors module layout per standards/project-structure.md)
- `test/code-map/` (mirrors module layout per standards/project-structure.md)

## Configuration

- `package.json`

## Key symbols (sample)

- `scripts/code-map/lib/code-map-config.mjs`: DEFAULT_SCAN_ROOTS, SUPPORTED_LANGUAGES, SOURCE_EXTENSIONS, loadCodeMapConfig
- `scripts/code-map/lib/comment-extractor.mjs`: extractDocComment
- `scripts/code-map/lib/file-header-comment.mjs`: extractFileHeaderComment
- `scripts/code-map/lib/signature-extractor.mjs`: extractSignature

## After planning

- Symbols: [`code-map.json`](../code-map.json)
- Open only files your plan names

