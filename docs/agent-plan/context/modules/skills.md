# skills (`skills`) — module

**Inject with your task doc.** Read the minimum in-scope module set for the spec — usually one module file; add a directly-coupled module (via its dependsOn/usedBy edges) only when the feature crosses that module's boundary. Never inject all module files or the full code map.

**What this module does:** `skills` — 4 files under `skills/`.

## Capabilities (owns)

- waitForEvent
- waitForEventCount
- waitForEventMatch

## Public API

| Symbol | Summary |
|--------|---------|
| `waitForEvent` | Wait for a specific event type to appear in thread Example: await waitForEvent(threadManager, agentThreadId, 'TOOL_RESUL |
| `waitForEventCount` | Wait for a specific number of events of a given type Example: // Wait for 2 AGENT_MESSAGE events (initial response + con |
| `waitForEventMatch` | Wait for an event matching a custom predicate Useful when you need to check event data, not just type Example: // Wait f |

## Boundaries

| | Path |
|--|------|
| Root | `skills/` |
| Out of scope | node_modules/, .git/, dist/, build/, .next/, hooks/, .opencode/, scripts/ |

## Flows

- Feature code and services under `skills/`

## Tests

- `test/` (mirrors module layout per standards/project-structure.md)
- `test/skills/` (mirrors module layout per standards/project-structure.md)

## Configuration

- `package.json`
- `code-map.config.json`

## Key symbols (sample)

- `skills/systematic-debugging/condition-based-waiting-example.ts`: waitForEvent, waitForEventCount, waitForEventMatch

## After planning

- **Code-map slice:** filter [`code-map.json`](../code-map.json) by `moduleId: skills` to get this module's files, symbols, and endpoints
- Open only files your plan names

