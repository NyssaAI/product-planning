# AI Plan — generate code & module graph

Generate `docs/ai-plan/` in the **current project repository** (module graph, scopes, CODE_MAP).

## Prerequisites (project repo)

- `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md`
- Node.js + npm on the machine (ast-grep is installed into the **plugin** on first run — not into your project)

## Commands

Run from the **project root**. Use the dev-tools plugin root for script paths.

**Bootstrap once** (creates docs stubs, configs, optional `scripts/` copy via `--write-scripts`):

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/ai-plan/generate.mjs" --init --write-scripts
```

**Regenerate** (code-map + module scopes):

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/code-map/generate-code-map.mjs"
node "${CLAUDE_PLUGIN_ROOT}/scripts/ai-plan/generate.mjs"
```

**Doctor**:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/ai-plan/generate.mjs" --doctor
```

On Cursor, use `CURSOR_PLUGIN_ROOT` instead of `CLAUDE_PLUGIN_ROOT` if needed.

## Agent workflow

After generate, use **dev-tools:using-ai-plan** when invoking **dev-tools:writing-plans** — inject one `docs/ai-plan/scopes/<module>.md` file only.
