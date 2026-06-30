# ci - generate code & module graph

**Alias:** `/code-indexer`

**Agent workflow:** Invoke **code-indexer:using-code-indexer** first - it defines L0-L3 progressive disclosure, module scope selection, staleness rules, `/ci arch`, and `/ci patterns`.

This command runs code-indexer workflows in the current project repository.

## Prerequisites (project repo)

- `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md`
- Node.js + npm (`@ast-grep/cli` installs into the **plugin** on first code-map run)

## Commands (project root)

Replace `${PLUGIN_ROOT}` with `CODE_INDEXER_PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or your code-indexer plugin directory.

**Bootstrap once:**

```bash
node "${PLUGIN_ROOT}/scripts/module-map/generate.mjs" --init --write-scripts
node "${PLUGIN_ROOT}/scripts/module-map/generate.mjs" --doctor
```

**Regenerate:**

```bash
npm run code-indexer
```

Or without project scripts:

```bash
node "${PLUGIN_ROOT}/scripts/code-map/generate-code-map.mjs"
node "${PLUGIN_ROOT}/scripts/module-map/generate.mjs"
```

**System architecture (`/ci arch`):**

Use only for repo onboarding, cross-module architecture review, or handoff. Apply the skill's staleness gate first; if stale, run normal `/ci`, then:

```bash
node "${PLUGIN_ROOT}/scripts/module-map/generate.mjs" --arch
# Machine-readable result (JSON to stdout):
node "${PLUGIN_ROOT}/scripts/module-map/generate.mjs" --arch --json
```

**Patterns (`/ci patterns`):**

Use for architecture/style discovery and codebase consistency review. Apply the skill's staleness gate first; if stale, run normal `/ci`, then:

```bash
node "${PLUGIN_ROOT}/scripts/code-map/generate-patterns.mjs"
# Machine-readable result (JSON to stdout):
node "${PLUGIN_ROOT}/scripts/code-map/generate-patterns.mjs" --json
```

Add `--json` to any command for a single JSON object on stdout (useful for agent pipelines). The object always includes `ok`, `wrote`, `warnings`, and `errors` fields.

Maintainer reference: `scripts/module-map/README.md`.
