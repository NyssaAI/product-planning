# test (`test`) — module

**Inject with your task doc.** Read the minimum in-scope module set for the spec — usually one module file; add a directly-coupled module (via its dependsOn/usedBy edges) only when the feature crosses that module's boundary. Never inject all module files or the full code map.

**What this module does:** `test` — 29 files under `test/`.

## Capabilities (owns)

- Code under `test/`

## Does not own

- scripts-ai-plan concerns → scripts-ai-plan module
- scripts-code-map concerns → scripts-code-map module
- scripts-test-gate concerns → scripts-test-gate module

## Boundaries

| | Path |
|--|------|
| Root | `test/` |
| Depends on modules | scripts-ai-plan, scripts-code-map, scripts-test-gate |
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

- **No code-map coverage** for `moduleId: test` — its root is outside the code-map scan roots or fully delegated to child modules, so [`code-map.json`](../code-map.json) has no slice for it
- Open only files your plan names

