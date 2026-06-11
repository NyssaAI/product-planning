# dev-tools — AI planning index

Generated: 2026-06-11T13:16:41.536Z. Regenerate: `npm run ai-plan`.

## Progressive disclosure (for planning agents)

| Level | Inject | When |
|-------|--------|------|
| L0 task | Your feature/bug doc and acceptance criteria | Always for feature planning |
| L1 module-scope | docs/ai-plan/scopes/<module-id>.md (one file) | Always for feature planning |
| L2 product-docs | docs/product.md, docs/roadmap.md, and/or docs/tech-stack.md | Product intent or stack constraints matter |
| L3 code-map | docs/ai-plan/CODE_MAP.json | Plan lists symbols; need line numbers |

**Default for a feature:** L0 task + **one** L1 scope file. Add L2 only if product/stack context is unclear.

## Module scopes (pick one)

| Module | Scope file |
|--------|------------|
| dev-tools (`main`) | [scopes/main.md](./scopes/main.md) |

## Artifacts

- **Module graph:** [MODULE_MAP.json](./MODULE_MAP.json)
- **Symbol index:** [`CODE_MAP.json`](./CODE_MAP.json)
- **Product docs:** `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` (read directly — do not duplicate in BRIEF)

- Source docs: `docs/product.md`, roadmap, tech-stack

## Conventions


## Cross-repo workflow

- Bootstrap: `node <PLUGIN_ROOT>/scripts/ai-plan/generate.mjs --init` (dev-tools plugin)
- Validate: `node <PLUGIN_ROOT>/scripts/ai-plan/generate.mjs --doctor`
- Backlog: `docs/backlog/{YYYY.MM.DD-HHMMSS-slug}/`
- Bugs: `docs/bugs/{YYYY.MM.DD-HHMMSS-slug}/`

