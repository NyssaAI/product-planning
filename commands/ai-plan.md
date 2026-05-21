# AI Plan — generate code & module graph

**Agent workflow:** Invoke **dev-tools:using-ai-plan** first — it defines L0–L3 progressive disclosure, module scope selection, and staleness rules.

This command runs **generation only** in the current project repository.

## Prerequisites (project repo)

- `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md`
- Node.js + npm (`@ast-grep/cli` installs into the **plugin** on first code-map run)

## Commands (project root)

Replace `${PLUGIN_ROOT}` with `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or your dev-tools plugin directory.

**Bootstrap once:**

```bash
node "${PLUGIN_ROOT}/scripts/ai-plan/generate.mjs" --init --write-scripts
node "${PLUGIN_ROOT}/scripts/ai-plan/generate.mjs" --doctor
```

**Regenerate:**

```bash
npm run ai-plan
```

Or without project scripts:

```bash
node "${PLUGIN_ROOT}/scripts/code-map/generate-code-map.mjs"
node "${PLUGIN_ROOT}/scripts/ai-plan/generate.mjs"
```

Maintainer reference: `scripts/ai-plan/README.md`.
