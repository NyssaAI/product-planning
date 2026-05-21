# Agent context — any repository using AI Plan

Mirrors **dev-tools:using-ai-plan** (canonical skill in the dev-tools plugin). When the plugin is installed, invoke that skill for full workflow integration with **writing-plans**.

## Required project docs

The repo must provide (default paths under `docs/`):

- **product.md** — what the product is
- **roadmap.md** — direction and priorities
- **tech-stack.md** — stack and conventions

## Feature planning (progressive disclosure)

| Level | Inject | When |
|-------|--------|------|
| L0 | Task / backlog / bug detail | Always |
| L1 | **One** `docs/ai-plan/scopes/<module>.md` | During planning — pick module from `docs/ai-plan/INDEX.md` |
| L2 | `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` | When product context needed |
| L3 | `docs/ai-plan/CODE_MAP.json` | After the plan names symbols — implementation only |

Never inject all scope files or the full CODE_MAP during planning.

## Regenerate

From project root (after `--init --write-scripts`):

```bash
npm run ai-plan
```

Or via plugin scripts (`PLUGIN_ROOT` = dev-tools plugin directory, e.g. `CLAUDE_PLUGIN_ROOT`):

```bash
node "<PLUGIN_ROOT>/scripts/ai-plan/generate.mjs" --init --write-scripts
node "<PLUGIN_ROOT>/scripts/ai-plan/generate.mjs" --doctor
node "<PLUGIN_ROOT>/scripts/code-map/generate-code-map.mjs"
node "<PLUGIN_ROOT>/scripts/ai-plan/generate.mjs"
```

## Workflow artifacts

- Backlog: `docs/backlog/{YYYY.MM.DD-HHMMSS-slug}/`
- Bugs: `docs/bugs/{YYYY.MM.DD-HHMMSS-slug}/` — use **dev-tools:bugfix-lifecycle** when the plugin is installed
