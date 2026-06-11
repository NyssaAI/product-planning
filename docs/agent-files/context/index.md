# dev-tools — AI planning index

Generated: 2026-06-11T16:46:29.809Z. Regenerate: `npm run ai-plan`.

## Progressive disclosure (for planning agents)

| Level | Inject | When |
|-------|--------|------|
| L0 task | Your feature/bug doc and acceptance criteria | Always for feature planning |
| L1 module-scope | docs/agent-files/context/modules/<module-id>.md (one file) | Always for feature planning |
| L2 product-docs | docs/product.md, docs/roadmap.md, and/or docs/tech-stack.md | Product intent or stack constraints matter |
| L3 code-map | docs/agent-files/context/code-map.json | Plan lists symbols; need line numbers |

**Default for a feature:** L0 task + **one** L1 module file. Add L2 only if product/stack context is unclear.

## Module files (pick one)

| Module | What it does | Owns | Module file |
|--------|--------------|------|-------------|
| dev-tools (`main`) | Application code (auto-detected single module). | Feature code and services under `./` | [modules/main.md](./modules/main.md) |

## Artifacts

- **Module graph:** [module-map.json](./module-map.json)
- **Symbol index:** [`code-map.json`](./code-map.json)
- **Product docs:** `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` (read directly — do not duplicate in BRIEF)

- Source docs: `docs/product.md`, roadmap, tech-stack

## Conventions


## Cross-repo workflow

- Bootstrap: `node <PLUGIN_ROOT>/scripts/ai-plan/generate.mjs --init` (dev-tools plugin)
- Validate: `node <PLUGIN_ROOT>/scripts/ai-plan/generate.mjs --doctor`
- Backlog: `docs/agent-files/backlog/{YYYY.MM.DD-HHMMSS-slug}/`
- Bugs: `docs/agent-files/bugs/{YYYY.MM.DD-HHMMSS-slug}/`

