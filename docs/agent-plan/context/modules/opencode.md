# .opencode (`opencode`) — module

**Inject with your task doc.** Read the minimum in-scope module set for the spec — usually one module file; add a directly-coupled module (via its dependsOn/usedBy edges) only when the feature crosses that module's boundary. Never inject all module files or the full code map.

**What this module does:** `.opencode` — 1 file under `.opencode/`.

## Capabilities (owns)

- DevToolsPlugin

## Public API

| Symbol | Summary |
|--------|---------|
| `DevToolsPlugin` |  |

## Boundaries

| | Path |
|--|------|
| Root | `.opencode/` |
| Out of scope | node_modules/, .git/, dist/, build/, .next/, hooks/, scripts/, scripts/ai-plan/ |

## Flows

- Feature code and services under `.opencode/`

## Tests

- `test/` (mirrors module layout per standards/project-structure.md)

## Configuration

- `package.json`
- `code-map.config.json`

## Key symbols (sample)

- `.opencode/plugins/dev-tools.js`: DevToolsPlugin

## After planning

- **Code-map slice:** filter [`code-map.json`](../code-map.json) by `moduleId: opencode` to get this module's files, symbols, and endpoints
- Open only files your plan names

