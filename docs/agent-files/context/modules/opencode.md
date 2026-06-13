# .opencode (`opencode`) — module

**Inject with your task doc only.** Do not load other module files or the full code map for planning.

**What this module does:** `.opencode` — 1 file under `.opencode/`.

## Capabilities (owns)

- DevToolsPlugin

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

## After planning

- Symbols: [`code-map.json`](../code-map.json)
- Open only files your plan names

