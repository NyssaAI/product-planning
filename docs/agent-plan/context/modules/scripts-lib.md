# lib (`scripts-lib`) — module

**Inject with your task doc.** Read the minimum in-scope module set for the spec — usually one module file; add a directly-coupled module (via its dependsOn/usedBy edges) only when the feature crosses that module's boundary. Never inject all module files or the full code map.

**What this module does:** `lib` — 4 files under `scripts/lib/`.

## Capabilities (owns)

- BASE_SKIP_DIRS
- findPluginRoot
- parseScanJson

## Public API

| Symbol | Summary |
|--------|---------|
| `findPluginRoot` |  |
| `resolveAstGrepBinary` | Resolve ast-grep binary shipped with the dev-tools plugin. |
| `parseScanJson` |  |
| `symbolNameFromMatch` |  |

## Boundaries

| | Path |
|--|------|
| Root | `scripts/lib/` |
| Used by | scripts-ai-plan, scripts-code-map |
| Out of scope | node_modules/, .git/, dist/, build/, .next/, hooks/, .opencode/, scripts/ |

## Flows

- Feature code and services under `scripts/lib/`

## Tests

- `test/` (mirrors module layout per standards/project-structure.md)

## Configuration

- `package.json`
- `code-map.config.json`

## Key symbols (sample)

- `scripts/lib/plugin-root.mjs`: findPluginRoot
- `scripts/lib/resolve-ast-grep.mjs`: resolveAstGrepBinary
- `scripts/lib/sg-result.mjs`: parseScanJson, symbolNameFromMatch
- `scripts/lib/skip-dirs.mjs`: BASE_SKIP_DIRS

## After planning

- **Code-map slice:** filter [`code-map.json`](../code-map.json) by `moduleId: scripts-lib` to get this module's files, symbols, and endpoints
- Open only files your plan names

