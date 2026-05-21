# Agent context — any repository using AI Plan

## Required project docs

The repo must provide (default paths under `docs/`):

- **product.md** — what the product is
- **roadmap.md** — direction and priorities
- **tech-stack.md** — stack and conventions

## Feature planning (inject at task time)

| Level | File |
|-------|------|
| L0 | Your task / backlog / bug detail |
| L1 | `docs/ai-plan/scopes/<module>.md` (**one** module) |
| L2 | `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` (optional) |
| L3 | `docs/ai-plan/CODE_MAP.json` (after plan names symbols) |

Regenerate: `npm run ai-plan` (project scripts) or:

```bash
node "<PLUGIN_ROOT>/scripts/code-map/generate-code-map.mjs"
node "<PLUGIN_ROOT>/scripts/ai-plan/generate.mjs"
```

(`PLUGIN_ROOT` = dev-tools plugin directory, e.g. `CLAUDE_PLUGIN_ROOT`.)

Setup: `node "<PLUGIN_ROOT>/scripts/ai-plan/generate.mjs" --init --write-scripts` then `--doctor`.

## Workflow artifacts

- Backlog: `docs/backlog/{YYYY.MM.DD-HHMMSS-slug}/`
- Bugs: `docs/bugs/{YYYY.MM.DD-HHMMSS-slug}/`
