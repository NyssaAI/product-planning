# hooks (`hooks`) — module

**Inject with your task doc.** Read the minimum in-scope module set for the spec — usually one module file; add a directly-coupled module (via its dependsOn/usedBy edges) only when the feature crosses that module's boundary. Never inject all module files or the full code map.

**What this module does:** `hooks` — 1 file under `hooks/`.

## Capabilities (owns)

- Code under `hooks/`

## Boundaries

| | Path |
|--|------|
| Root | `hooks/` |
| Out of scope | node_modules/, .git/, dist/, build/, .next/, .opencode/, scripts/, scripts/ai-plan/ |

## Flows

- Feature code and services under `hooks/`

## Tests

- `test/` (mirrors module layout per standards/project-structure.md)

## Configuration

- `package.json`
- `code-map.config.json`

## After planning

- **No code-map coverage** for `moduleId: hooks` — its root is outside the code-map scan roots or fully delegated to child modules, so [`code-map.json`](../code-map.json) has no slice for it
- Open only files your plan names

