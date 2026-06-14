# dev-tools — AI planning index

Generated: 2026-06-14T23:58:09.107Z. Regenerate: `npm run ai-plan`.

## Progressive disclosure (for planning agents)

| Level | Inject | When |
|-------|--------|------|
| L0 task | Your feature/bug doc and acceptance criteria | Always for feature planning |
| L1 module-scope | docs/agent-plan/context/modules/<module-id>.md (one file) | Always for feature planning |
| L2 product-docs | docs/product.md, docs/roadmap.md, and/or docs/tech-stack.md | Product intent or stack constraints matter |
| L3 code-map | docs/agent-plan/context/code-map.json | Plan lists symbols; need line numbers |

**Default for a feature:** L0 task + **one** L1 module file. Add L2 only if product/stack context is unclear.

## Module files (pick one)

| Module | What it does | Owns | Module file |
|--------|--------------|------|-------------|
| hooks (`hooks`) | `hooks` — 1 file under `hooks/`. | Code under `hooks/` | [modules/hooks.md](./modules/hooks.md) |
| .opencode (`opencode`) | `.opencode` — 1 file under `.opencode/`. | DevToolsPlugin | [modules/opencode.md](./modules/opencode.md) |
| scripts (`scripts`) | `scripts` — 1 file under `scripts/`. | Code under `scripts/` | [modules/scripts.md](./modules/scripts.md) |
| ai-plan (`scripts-ai-plan`) | `ai-plan` — 35 files under `scripts/ai-plan/`. | ADAPTERS; API_ROUTE_CANDIDATES; CODE_ROOT_CANDIDATES | [modules/scripts-ai-plan.md](./modules/scripts-ai-plan.md) |
| code-map (`scripts-code-map`) | `code-map` — 7 files under `scripts/code-map/`. | DEFAULT_SCAN_ROOTS; SOURCE_EXTENSIONS; SUPPORTED_LANGUAGES | [modules/scripts-code-map.md](./modules/scripts-code-map.md) |
| lib (`scripts-lib`) | `lib` — 2 files under `scripts/lib/`. | findPluginRoot; resolveAstGrepBinary | [modules/scripts-lib.md](./modules/scripts-lib.md) |
| skills (`skills`) | `skills` — 4 files under `skills/`. | waitForEvent; waitForEventCount; waitForEventMatch | [modules/skills.md](./modules/skills.md) |
| test (`test`) | `test` — 26 files under `test/`. | Code under `test/` | [modules/test.md](./modules/test.md) |

## Code organization (Node/TypeScript)

Read the module doc for the role you are touching; filter `code-map.json` by `moduleId` to get that module's slice (files, symbols, endpoints).

### Shared & core libraries

- **lib** (`moduleId: scripts-lib`) — `scripts/lib/` — [module doc](./modules/scripts-lib.md)

### Other modules

- **hooks** (`moduleId: hooks`) — `hooks/` — [module doc](./modules/hooks.md)
- **.opencode** (`moduleId: opencode`) — `.opencode/` — [module doc](./modules/opencode.md)
- **scripts** (`moduleId: scripts`) — `scripts/` — [module doc](./modules/scripts.md)
- **ai-plan** (`moduleId: scripts-ai-plan`) — `scripts/ai-plan/` — [module doc](./modules/scripts-ai-plan.md)
- **code-map** (`moduleId: scripts-code-map`) — `scripts/code-map/` — [module doc](./modules/scripts-code-map.md)
- **skills** (`moduleId: skills`) — `skills/` — [module doc](./modules/skills.md)
- **test** (`moduleId: test`) — `test/` — [module doc](./modules/test.md)

### Public entry points

- `test`: `test/ai-plan-adapters/fixtures/typescript-repo/src/shared/index.ts`

## Artifacts

- **Module graph:** [module-map.json](./module-map.json)
- **Symbol index:** [`code-map.json`](./code-map.json)
- **Product docs:** `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` (read directly — do not duplicate in BRIEF)

- Source docs: `docs/product.md`, roadmap, tech-stack

## Conventions


## Cross-repo workflow

- Bootstrap: `node <PLUGIN_ROOT>/scripts/ai-plan/generate.mjs --init` (dev-tools plugin)
- Validate: `node <PLUGIN_ROOT>/scripts/ai-plan/generate.mjs --doctor`
- Backlog: `docs/agent-plan/backlog/{YYYY.MM.DD-HHMMSS-slug}/`
- Bugs: `docs/agent-plan/bugs/{YYYY.MM.DD-HHMMSS-slug}/`

