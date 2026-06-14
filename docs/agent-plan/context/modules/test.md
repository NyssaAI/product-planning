# test (`test`) — module

**Inject with your task doc only.** Do not load other module files or the full code map for planning.

**What this module does:** `test` — 20 files under `test/`.

## Capabilities (owns)

- Code under `test/`

## Does not own

- scripts-ai-plan concerns → scripts-ai-plan module
- scripts-code-map concerns → scripts-code-map module

## Boundaries

| | Path |
|--|------|
| Root | `test/` |
| Depends on modules | scripts-ai-plan, scripts-code-map |
| Out of scope | node_modules/, .git/, dist/, build/, .next/, hooks/, .opencode/, scripts/ |

## Flows

- Feature code and services under `test/`

## Entry points

- `test/ai-plan-adapters/fixtures/typescript-repo/src/shared/index.ts`

## Tests

- `test/` (mirrors module layout per standards/project-structure.md)

## Configuration

- `package.json`
- `code-map.config.json`

## After planning

- Symbols: [`code-map.json`](../code-map.json)
- Open only files your plan names

