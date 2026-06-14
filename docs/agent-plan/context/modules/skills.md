# skills (`skills`) — module

**Inject with your task doc only.** Do not load other module files or the full code map for planning.

**What this module does:** `skills` — 4 files under `skills/`.

## Capabilities (owns)

- waitForEvent
- waitForEventCount
- waitForEventMatch

## Public API

| Symbol | Signature | Summary |
|--------|-----------|---------|
| `waitForEvent` | `export function waitForEvent( threadManager: ThreadManager, threadId: string, eventType: LaceEventType, timeoutMs = 5000 ): Promise<LaceEvent>` | Wait for a specific event type to appear in thread Example: await waitForEvent(threadManager, agentThreadId, 'TOOL_RESUL |
| `waitForEventCount` | `export function waitForEventCount( threadManager: ThreadManager, threadId: string, eventType: LaceEventType, count: number, timeoutMs = 5000 ): Promise<LaceEvent[]>` | Wait for a specific number of events of a given type Example: // Wait for 2 AGENT_MESSAGE events (initial response + con |
| `waitForEventMatch` | `export function waitForEventMatch( threadManager: ThreadManager, threadId: string, predicate: (event: LaceEvent) => boolean, description: string, timeoutMs = 5000 ): Promise<LaceEvent>` | Wait for an event matching a custom predicate Useful when you need to check event data, not just type Example: // Wait f |

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

- Symbols: [`code-map.json`](../code-map.json)
- Open only files your plan names

