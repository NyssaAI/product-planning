# scripts (`scripts`) — module

**Inject with your task doc only.** Do not load other module files or the full code map for planning.

**What this module does:** `scripts` — 1 file under `scripts/`.

## Capabilities (owns)

- Code under `scripts/`

## Boundaries

| | Path |
|--|------|
| Root | `scripts/` |
| Out of scope | node_modules/, .git/, dist/, build/, .next/, hooks/, .opencode/, scripts/ai-plan/ |

## Flows

- Feature code and services under `scripts/`

## Tests

- `test/` (mirrors module layout per standards/project-structure.md)

## Configuration

- `package.json`
- `code-map.config.json`

## After planning

- **No code-map coverage** for `moduleId: scripts` — its root is outside the code-map scan roots or fully delegated to child modules, so [`code-map.json`](../code-map.json) has no slice for it
- Open only files your plan names

