# test (`test`) — module

**Inject with your task doc only.** Do not load other module files or the full code map for planning.

**What this module does:** `test` — 14 files under `test/`.

## Capabilities (owns)

- Code under `test/`

## Does not own

- scripts-ai-plan concerns → scripts-ai-plan module
- scripts-code-map concerns → scripts-code-map module

## Public API

| Symbol | Signature | Summary |
|--------|-----------|---------|
| `analyze_main_session` | `def analyze_main_session(filepath)` |  |
| `format_tokens` | `def format_tokens(n)` |  |
| `calculate_cost` | `def calculate_cost(usage, input_cost_per_m=3.0, output_cost_per_m=15.0)` |  |
| `main` | `def main()` |  |

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

## Key symbols (sample)

- `test/claude-code/analyze-token-usage.py`: analyze_main_session, format_tokens, calculate_cost, main

## After planning

- Symbols: [`code-map.json`](../code-map.json)
- Open only files your plan names

