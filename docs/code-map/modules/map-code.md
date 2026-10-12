# map-code (`map-code`) — module

**Optional module context.** Use this when it helps orient the task; targeted source reading is also sufficient. Add a directly coupled module only when the work crosses its boundary. Use bounded queries for detailed evidence and verify relevant source.

**What this module does:** Public mapping workflow, freshness checks, and bounded evidence queries.

## Capabilities (owns)

- Feature code and services under `scripts/map-code/`

## Does not own

- code-map concerns → code-map module
- lib concerns → lib module
- module-map concerns → module-map module

## Public API

| Symbol | Summary |
|--------|---------|
| `mapCodeOutputs` |  |
| `queryCodeMap` | Bounded queries over canonical file records; callers means file dependents, not runtime calls. |

## Boundaries

| | Path |
|--|------|
| Root | `scripts/map-code/` |
| Depends on modules | code-map, lib, module-map |
| Out of scope | node_modules/, .git/, dist/, build/, .next/, scripts/module-map/, scripts/code-map/, scripts/lib/ |

## Flows

- Feature code and services under `scripts/map-code/`

## Entry points

- `scripts/map-code/generate.mjs`

## Tests

- `test/` (mirrors module source layout)

## Configuration

- `package.json`
- `plan-product.config.json`

## Key symbols (sample)

- `scripts/map-code/generate.mjs`: mapCodeOutputs
- `scripts/map-code/query.mjs`: queryCodeMap

## After planning

- **Code-map slice:** query `module map-code` (`moduleId: map-code`) in [code-map.json](../code-map.json) for files, symbols, endpoints, and file dependencies. Symbols above are a sample (2 total); absence of a symbol is not absence of code.
- Open only files your plan names
