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
| L1 | **One** `docs/agent-plan/context/modules/<module>.md` | During planning — pick module from `docs/agent-plan/context/index.md` |
| L2 | `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` | When product context needed |
| L3 | `docs/agent-plan/context/code-map.json` | After the plan names symbols — implementation only |

Never inject all module files or the full code map during planning.

## Regenerate (conditional startup step)

Regenerate **only when needed**: if `docs/agent-plan/context/index.md` is missing, or source files are newer than it. If the index is current, skip this section entirely.

**Pre-flight checks — run before regenerating, skip (do not abort the session) if any fail:**

1. `"autoRegenerate": false` in `ai-plan.config.json` → skip regeneration entirely; the team manages it manually.
2. Node 18+ available (`node --version`). If not: note *"ai-plan: skipped — Node 18+ not available."* and continue.
3. Required docs present: `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md`. If not: note *"ai-plan: skipped — MISSING_DOCS"* and continue.
4. ast-grep available: the plugin auto-installs `@ast-grep/cli` into its own root on first run. If the run fails with an ast-grep error: note *"ai-plan: skipped — AST_GREP_NOT_FOUND. Run npm install in the dev-tools plugin root."* and continue.

**Regenerate** from the project root (after `--init --write-scripts`):

```bash
npm run ai-plan
```

Or via plugin scripts (`PLUGIN_ROOT` = dev-tools plugin directory, e.g. `CLAUDE_PLUGIN_ROOT`):

```bash
node "<PLUGIN_ROOT>/scripts/ai-plan/generate.mjs" --doctor
node "<PLUGIN_ROOT>/scripts/code-map/generate-code-map.mjs"
node "<PLUGIN_ROOT>/scripts/ai-plan/generate.mjs"
```

**On failure:** report the named error code from the output (`MISSING_DOCS`, `AST_GREP_NOT_FOUND`, `CODE_MAP_STALE`, `NO_MODULES_FOUND`) and proceed with whatever context is available — never abort the session over regeneration.

## Workflow artifacts

- Backlog: `docs/agent-plan/backlog/{YYYY.MM.DD-HHMMSS-slug}/`
- Plans: `docs/agent-plan/plans/` — use **dev-tools:execute-plan** when the plugin is installed (not internal run/finish sub-skills)
- Bugs: `docs/agent-plan/bugs/{YYYY.MM.DD-HHMMSS-slug}/` — use **dev-tools:fix-bug** when the plugin is installed
