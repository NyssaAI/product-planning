# plan-product Code Map

Generated: 2026-07-07T13:41:17.783Z. Regenerate with `node <PLUGIN_ROOT>/scripts/map-code/generate.mjs`, or `npm run map-code` when package scripts were installed.

## Progressive disclosure (for planning agents)

| Level | Inject | When |
|-------|--------|------|
| L0 task | Your feature/bug doc and acceptance criteria | Always for feature planning |
| L1 module-scope | docs/code-map/modules/<module-id>.md (one file) | Always for feature planning |
| L2 product-docs | docs/product.md, docs/features.md, and/or docs/tech-stack.md | Product intent or stack constraints matter |
| L3 code-map | docs/code-map/code-map.json | Plan lists symbols; need line numbers |

**Default for a feature:** L0 task + the minimum in-scope L1 module set — usually one module file; add a directly-coupled module (via its dependsOn/usedBy edges) only when the feature crosses that module's boundary. Never inject all module files or the full code map. Add L2 only if product/stack context is unclear.

## Module files (pick the in-scope set)

| Module | What it does | Owns | Module file |
|--------|--------------|------|-------------|
| module-map (`module-map`) | Module-graph generator: module discovery, enrichment, rendering, doctor, and bootstrap. | Feature code and services under `scripts/module-map/` | [modules/module-map.md](./modules/module-map.md) |
| code-map (`code-map`) | ast-grep-based symbol and endpoint indexer that feeds the module graph. | Feature code and services under `scripts/code-map/` | [modules/code-map.md](./modules/code-map.md) |
| lib (`lib`) | Shared utilities for both generators: plugin-root resolution, ast-grep resolution, skip-dirs, scan parsing, and<br>endpoint extraction. | Feature code and services under `scripts/lib/` | [modules/lib.md](./modules/lib.md) |

## Code organization (Node/TypeScript)

Read the module doc for the role you are touching; filter `code-map.json` by `moduleId` to get that module's slice (files, symbols, endpoints).

### Shared & core libraries

- **lib** (`moduleId: lib`) — `scripts/lib/` — [module doc](./modules/lib.md)

### Other modules

- **module-map** (`moduleId: module-map`) — `scripts/module-map/` — [module doc](./modules/module-map.md)
- **code-map** (`moduleId: code-map`) — `scripts/code-map/` — [module doc](./modules/code-map.md)

## Artifacts

- **Module graph:** [module-map.json](./module-map.json)
- **Symbol index:** [`code-map.json`](./code-map.json)
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

