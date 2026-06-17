# test-gate (`scripts-test-gate`) — module

**Inject with your task doc.** Read the minimum in-scope module set for the spec — usually one module file; add a directly-coupled module (via its dependsOn/usedBy edges) only when the feature crosses that module's boundary. Never inject all module files or the full code map.

**What this module does:** `test-gate` — 2 files under `scripts/test-gate/`.

## Capabilities (owns)

- detectPlaywright
- detectTestCommands
- resolveTestPlan

## Public API

| Symbol | Summary |
|--------|---------|
| `detectTestCommands` | Produce the ordered polyglot list of unit/integration test commands. |
| `detectPlaywright` | Detect Playwright E2E. |
| `resolveTestPlan` | Resolve the effective test plan, honoring ai-plan.config.json `test` field. |
| `runGate` | Run the gate for a repo. |

## Boundaries

| | Path |
|--|------|
| Root | `scripts/test-gate/` |
| Used by | test |
| Out of scope | node_modules/, .git/, dist/, build/, .next/, hooks/, .opencode/, scripts/ |

## Flows

- Feature code and services under `scripts/test-gate/`

## Tests

- `test/` (mirrors module layout per standards/project-structure.md)
- `test/test-gate/` (mirrors module layout per standards/project-structure.md)

## Configuration

- `package.json`
- `code-map.config.json`

## Key symbols (sample)

- `scripts/test-gate/detect.mjs`: detectTestCommands, detectPlaywright, resolveTestPlan
- `scripts/test-gate/run.mjs`: runGate

## After planning

- **Code-map slice:** filter [`code-map.json`](../code-map.json) by `moduleId: scripts-test-gate` to get this module's files, symbols, and endpoints
- Open only files your plan names

