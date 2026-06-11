# Agent context — any repository using AI Plan

Mirrors **dev-tools:using-ai-plan** (canonical skill in the dev-tools plugin). When the plugin is installed, invoke that skill for full workflow integration with **write-plan** (via **design-spec**).

## Required project docs

The repo must provide (default paths under `docs/`):

- **product.md** — what the product is
- **roadmap.md** — direction and priorities
- **tech-stack.md** — stack and conventions

## Feature planning (progressive disclosure)

| Level | Inject | When |
|-------|--------|------|
| L0 | Task / backlog / bug detail | Always |
| L1 | **One** `docs/agent-files/context/modules/<module>.md` | During planning — pick module from `docs/agent-files/context/index.md` |
| L2 | `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` | When product context needed |
| L3 | `docs/agent-files/context/code-map.json` | After the plan names symbols — implementation only |

Never inject all scope files or the full code map during planning.

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

- Backlog: `docs/agent-files/backlog/{YYYY.MM.DD-HHMMSS-slug}/`
- Plans: `docs/agent-files/plans/` — use **dev-tools:execute-plan** when the plugin is installed (not internal run/finish sub-skills)
- Bugs: `docs/agent-files/bugs/{YYYY.MM.DD-HHMMSS-slug}/` — use **dev-tools:fix-bug** when the plugin is installed
