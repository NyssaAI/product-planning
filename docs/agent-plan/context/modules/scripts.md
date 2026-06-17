# scripts (`scripts`) — module

**Inject with your task doc.** Read the minimum in-scope module set for the spec — usually one module file; add a directly-coupled module (via its dependsOn/usedBy edges) only when the feature crosses that module's boundary. Never inject all module files or the full code map.

**What this module does:** `scripts` — 2 files under `scripts/`.

## Capabilities (owns)

- setupTestGate

## Does not own

- scripts-lib concerns → scripts-lib module

## Public API

| Symbol | Summary |
|--------|---------|
| `setupTestGate` | Install (or refresh) the test gate into `repo`. |

## Boundaries

| | Path |
|--|------|
| Root | `scripts/` |
| Depends on modules | scripts-lib |
| Out of scope | node_modules/, .git/, dist/, build/, .next/, hooks/, .opencode/, scripts/ai-plan/ |

## Flows

- Feature code and services under `scripts/`

## Tests

- `test/` (mirrors module layout per standards/project-structure.md)

## Configuration

- `package.json`
- `code-map.config.json`

## Key symbols (sample)

- `scripts/setup-test-gate.mjs`: setupTestGate

## After planning

- **Code-map slice:** filter [`code-map.json`](../code-map.json) by `moduleId: scripts` to get this module's files, symbols, and endpoints
- Open only files your plan names

