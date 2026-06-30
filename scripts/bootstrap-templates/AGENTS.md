# Agent context — any repository using code-indexer

Mirrors **code-indexer:using-code-indexer** (canonical skill in the code-indexer plugin). When the plugin is installed, invoke that skill to load scoped planning context before implementation work.

## Required project docs

The repo must provide (default paths under `docs/`):

- **product.md** — what the product is
- **features.md** — feature-level breakdown (`F-001…`); roadmap sequences these
- **roadmap.md** — direction and priorities
- **tech-stack.md** — stack and conventions

## Feature planning (progressive disclosure)

| Level | Inject | When |
|-------|--------|------|
| L0 | Task / backlog / bug detail | Always |
| L1 | The **minimum module set** `docs/code-index/modules/<module>.md` for the behavior | During planning — pick modules from `docs/code-index/index.md` |
| L2 | `docs/product.md`, `docs/features.md`, `docs/roadmap.md`, `docs/tech-stack.md` | When product context needed |
| L3 | `docs/code-index/code-map.json` | After the plan names symbols — implementation only |

Never inject all module files or the full code map during planning.

## Regenerate (conditional startup step)

Regenerate **only when needed**: if `docs/code-index/index.md` is missing, or source files are newer than it. If the index is current, skip this section entirely.

**Pre-flight checks — run before regenerating, skip (do not abort the session) if any fail:**

1. `"autoRegenerate": false` in `code-indexer.config.json` → skip regeneration entirely; the team manages it manually.
2. Node 18+ available (`node --version`). If not: note *"code-indexer: skipped — Node 18+ not available."* and continue.
3. Required docs present: `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md`. If not: note *"code-indexer: skipped — MISSING_DOCS"* and continue.
4. ast-grep available: the plugin auto-installs `@ast-grep/cli` into its own root on first run. If the run fails with an ast-grep error: note *"code-indexer: skipped — AST_GREP_NOT_FOUND. Run npm install in the code-indexer plugin root."* and continue.

**Regenerate** from the project root (after `--init --write-scripts`):

```bash
npm run code-indexer
```

Or via plugin scripts (`PLUGIN_ROOT` = code-indexer plugin directory, e.g. `CODE_INDEXER_PLUGIN_ROOT`):

```bash
node "<PLUGIN_ROOT>/scripts/module-map/generate.mjs" --doctor
node "<PLUGIN_ROOT>/scripts/code-map/generate-code-map.mjs"
node "<PLUGIN_ROOT>/scripts/module-map/generate.mjs"
```

**On failure:** report the named error code from the output (`MISSING_DOCS`, `AST_GREP_NOT_FOUND`, `CODE_MAP_STALE`, `NO_MODULES_FOUND`) and proceed with whatever context is available — never abort the session over regeneration.

## Workflow artifacts

- Backlog: `docs/code-index/backlog/{YYYY.MM.DD-HHMMSS-slug}/`
- Plans: `docs/code-index/plans/`
- Bugs: `docs/code-index/bugs/{YYYY.MM.DD-HHMMSS-slug}/`

Load the relevant `docs/code-index/modules/<module>.md` before planning work in these areas.
