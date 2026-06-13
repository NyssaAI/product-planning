# lib (`scripts-lib`) — module

**Inject with your task doc only.** Do not load other module files or the full code map for planning.

**What this module does:** `lib` — 2 files under `scripts/lib/`.

## Capabilities (owns)

- findPluginRoot
- resolveAstGrepBinary

## Public API

| Symbol | Signature | Summary |
|--------|-----------|---------|
| `findPluginRoot` | `export function findPluginRoot(startDir)` |  |
| `resolveAstGrepBinary` | `export function resolveAstGrepBinary(options)` | Resolve ast-grep binary shipped with the dev-tools plugin. |

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

## Key symbols (sample)

- `scripts/lib/plugin-root.mjs`: findPluginRoot
- `scripts/lib/resolve-ast-grep.mjs`: resolveAstGrepBinary

## After planning

- Symbols: [`code-map.json`](../code-map.json)
- Open only files your plan names

