# dev-tools — AI planning index

Generated: 2026-06-29T14:09:31.280Z. Regenerate: `npm run ai-plan`.

## Progressive disclosure (for planning agents)

| Level | Inject | When |
|-------|--------|------|
| L0 task | Your feature/bug doc and acceptance criteria | Always for feature planning |
| L1 module-scope | docs/agent-plan/context/modules/<module-id>.md (one file) | Always for feature planning |
| L2 product-docs | docs/product.md, docs/roadmap.md, and/or docs/tech-stack.md | Product intent or stack constraints matter |
| L3 code-map | docs/agent-plan/context/code-map.json | Plan lists symbols; need line numbers |

**Default for a feature:** L0 task + the minimum in-scope L1 module set — usually one module file; add a directly-coupled module (via its dependsOn/usedBy edges) only when the feature crosses that module's boundary. Never inject all module files or the full code map. Add L2 only if product/stack context is unclear.

## Module files (pick the in-scope set)

| Module | What it does | Owns | Module file |
|--------|--------------|------|-------------|
| ai-plan (`ai-plan`) | Code/module-graph generator: module discovery, enrichment, rendering, doctor, and bootstrap. | Feature code and services under `scripts/ai-plan/` | [modules/ai-plan.md](./modules/ai-plan.md) |
| code-map (`code-map`) | ast-grep-based symbol and endpoint indexer that feeds the module graph. | Feature code and services under `scripts/code-map/` | [modules/code-map.md](./modules/code-map.md) |
| lib (`lib`) | Shared utilities for both generators: plugin-root resolution, ast-grep resolution, skip-dirs, scan parsing. | Feature code and services under `scripts/lib/` | [modules/lib.md](./modules/lib.md) |

## Code organization (Node/TypeScript)

Read the module doc for the role you are touching; filter `code-map.json` by `moduleId` to get that module's slice (files, symbols, endpoints).

### Shared & core libraries

- **lib** (`moduleId: lib`) — `scripts/lib/` — [module doc](./modules/lib.md)

### Other modules

- **ai-plan** (`moduleId: ai-plan`) — `scripts/ai-plan/` — [module doc](./modules/ai-plan.md)
- **code-map** (`moduleId: code-map`) — `scripts/code-map/` — [module doc](./modules/code-map.md)

## Artifacts

- **Module graph:** [module-map.json](./module-map.json)
- **Symbol index:** [`code-map.json`](./code-map.json)
- **Product docs:** `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` (read directly — do not duplicate in BRIEF)

## Conventions


## Cross-repo workflow

- Bootstrap: `node <PLUGIN_ROOT>/scripts/ai-plan/generate.mjs --init` (dev-tools plugin)
- Validate: `node <PLUGIN_ROOT>/scripts/ai-plan/generate.mjs --doctor`
- Backlog: `docs/agent-plan/backlog/{YYYY.MM.DD-HHMMSS-slug}/`
- Bugs: `docs/agent-plan/bugs/{YYYY.MM.DD-HHMMSS-slug}/`

