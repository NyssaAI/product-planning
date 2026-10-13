# plan-product Code Map

Generated: 2026-10-13T20:44:17.909Z. Regenerate with `node <PLUGIN_ROOT>/scripts/map-code/generate.mjs`, or `npm run map-code` when package scripts were installed.

## Progressive disclosure (for planning agents)

| Level | Inject | When |
|-------|--------|------|
| L0 task | Your feature/bug doc and acceptance criteria | Always |
| L1 module-scope | docs/code-map/modules/<module-id>.md (one file) | Module orientation helps the task |
| L2 product-docs | docs/product.md, docs/features.md, and/or docs/tech-stack.md | Product intent or stack constraints matter |
| L3 code-map | A bounded query via <PLUGIN_ROOT>/scripts/map-code/query.mjs (symbol, module, callers, or coverage) | Plan lists symbols; need line numbers |

**Maps are optional orientation.** Targeted search and source reading are sufficient when they answer the task. When maps help, read the minimum in-scope module set and add a directly coupled module only when the work crosses its boundary. Use bounded queries for detailed evidence; verify relevant source before making changes.

## Module files (pick the in-scope set)

| Module | What it does | Owns | Module file |
|--------|--------------|------|-------------|
| map-code (`map-code`) | Public mapping workflow, freshness checks, and bounded evidence queries. | Feature code and services under `scripts/map-code/` | [modules/map-code.md](./modules/map-code.md) |
| module-map (`module-map`) | Module-graph generator: module discovery, enrichment, rendering, doctor, and bootstrap. | Feature code and services under `scripts/module-map/` | [modules/module-map.md](./modules/module-map.md) |
| code-map (`code-map`) | ast-grep-based symbol and endpoint indexer that feeds the module graph. | Feature code and services under `scripts/code-map/` | [modules/code-map.md](./modules/code-map.md) |
| lib (`lib`) | Shared utilities for both generators: plugin-root resolution, ast-grep resolution, skip-dirs, scan parsing, and<br>endpoint extraction. | Feature code and services under `scripts/lib/` | [modules/lib.md](./modules/lib.md) |

## Code organization (Node/TypeScript)

Read the module doc for the role you are touching; filter `code-map.json` by `moduleId` to get that module's slice (files, symbols, endpoints).

### Shared & core libraries

- **lib** (`moduleId: lib`) — `scripts/lib/` — [module doc](./modules/lib.md)

### Other modules

- **map-code** (`moduleId: map-code`) — `scripts/map-code/` — [module doc](./modules/map-code.md)
- **module-map** (`moduleId: module-map`) — `scripts/module-map/` — [module doc](./modules/module-map.md)
- **code-map** (`moduleId: code-map`) — `scripts/code-map/` — [module doc](./modules/code-map.md)

### Public entry points

- `map-code`: `scripts/map-code/generate.mjs`
- `module-map`: `scripts/module-map/lib/stack-profiles/index.mjs`, `scripts/module-map/lib/adapters/index.mjs`

## Artifacts

- **Module graph:** [module-map.json](./module-map.json)
- **Symbols and file dependencies:** [code-map.json](code-map.json)
- **Coverage:** 70 scanned files; 0 unowned; 0 unsupported; 0 dependency diagnostics.
- Query bounded evidence: `node <PLUGIN_ROOT>/scripts/map-code/query.mjs module <id> --limit 20` (also `symbol`, `callers`, `coverage`). File dependencies are static references, not a call graph.
- **Product docs:** `docs/product.md`, `docs/features.md`, `docs/tech-stack.md` (read directly — do not duplicate in BRIEF)

## Conventions

- Configuration: `.plan-product/config.json` is the repo-relative path contract; committed config must not contain machine-specific absolute paths.
- Secrets: plan-product should not store credentials, API keys, or local install secrets in committed files.
- Logging: Prefer explicit command output and validation summaries; avoid writing local absolute paths into generated artifacts.
- Observability and health: plan-product should expose clear validation/audit results for missing files, stale paths, malformed config, generated context health, and local usage/effectiveness signals.
- Error handling: Missing or incomplete product artifacts should produce actionable messages, not silent fallbacks.
- Security and access: plan-product owns local repo artifacts only; it does not manage external auth, authorization, or secret storage.
- Persistence and recovery: Markdown and JSON files are the source of truth and should be recoverable through normal git history.
- Background work: No background services are required for the first version.

## Cross-repo workflow

- Bootstrap: `node <PLUGIN_ROOT>/scripts/module-map/generate-module-map.mjs --init` (plan-product plugin)
- Validate: `node <PLUGIN_ROOT>/scripts/module-map/generate-module-map.mjs --doctor`
