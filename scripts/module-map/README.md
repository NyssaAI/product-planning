# code-indexer

**Agent workflow:** **code-indexer:using-code-indexer** skill (canonical — L0–L3 rules, module scope selection, staleness).

**Maintainer / CLI reference** for generators and config. End users with the code-indexer plugin should follow the skill; use this file for script paths and `code-indexer.config.json` details.

**Shipped in the [jamaynor/code-indexer](https://github.com/jamaynor/code-indexer) plugin** at `scripts/code-map/` and `scripts/module-map/`.

**Plugin maintainers:** run `npm install` once at the code-indexer plugin root before publishing so `node_modules/@ast-grep/cli` exists; end users get auto-install on first code-map run if the marketplace copy omits `node_modules`.

From a project repo with the code-indexer plugin installed:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/module-map/generate.mjs" --init --write-scripts
npm run code-indexer   # after init adds project scripts
```

---

**Repository-agnostic** planning context for AI agents. The only required inputs are your standard product documents:

| Document | Typical path |
|----------|----------------|
| Product | `docs/product.md` |
| Roadmap | `docs/roadmap.md` |
| Tech stack | `docs/tech-stack.md` |

Everything else is **auto-detected** (modules, code roots, HTTP/MCP endpoint surfaces, dependencies).

## Quick start (any repository)

1. Add the three markdown files (or set paths in `code-indexer.config.json`).
2. Use scripts from the code-indexer plugin (`${CLAUDE_PLUGIN_ROOT}/scripts/…`) — no project `npm i @ast-grep/cli` required.
3. Run once:

```bash
npm run code-indexer -- --init   # optional: writes minimal configs
npm run code-indexer             # code-map + MODULE_MAP + scopes
```

5. Add to `package.json`:

```json
{
  "scripts": {
    "code-map": "node path/to/scripts/code-map/generate.mjs",
    "code-indexer": "node path/to/scripts/module-map/generate.mjs",
    "postbuild": "npm run code-map && node path/to/scripts/module-map/generate.mjs"
  }
}
```

## What gets generated

| Output | Purpose |
|--------|---------|
| `docs/code-index/context/code-map.json` | Symbol index plus endpoint index (HTTP routes, MCP tools/resources/prompts, line numbers) |
| `docs/code-index/context/module-map.json` | Module graph (`dependsOn` / `usedBy`) |
| `docs/code-index/context/modules/<id>.md` | **Primary artifact** — one module architecture per file |
| `docs/code-index/context/index.md` | Progressive disclosure guide |

## Module discovery (`modules.discover`)

| Value | Behavior |
|-------|----------|
| **`auto`** (default) | npm workspaces → **cohesion-based detection** (when a language adapter matches, e.g. C#) → stack profile → `packages/*`/`src/*` children → fallback `src` |
| `workspaces` | Only `package.json` workspaces |
| `glob` | `modules.globs` patterns |
| `manual` | Only `modules.manual` list |

Optional `modules.manual` adds modules workspaces miss (e.g. an app shell folder).

### Cohesion-based detection

Under `auto`, when a language adapter matches the repo (currently **C#**; others pluggable via `scripts/module-map/lib/adapters/`), modules are derived from the code's dependency graph: directories are grouped at the depth that maximizes coupling/cohesion (Newman modularity), producing **feature-level** modules instead of one-per-project. Deterministic; falls back to directory structure when the graph is sparse. Tune with `modules.minFiles` / `modules.maxFiles`; force an adapter with `modules.adapter`.

### Pinning (adjusting derived modules)

Derived modules are recomputed every run. To freeze and adjust one, **eject** it into config:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/module-map/generate.mjs" --pin <module-id>    # eject into modules.pinned[]
node "${CLAUDE_PLUGIN_ROOT}/scripts/module-map/generate.mjs" --unpin <module-id>  # return to auto-derivation
```

`--pin` writes the module's current definition into `code-indexer.config.json` → `modules.pinned[]`. Edit its `id`/`name`/`description`/`capabilities`, or change `root` to merge a parent (or split into children) — a pinned root is authoritative and excluded from re-derivation, so adjustments survive regeneration. Generated `modules/<id>.md` files are **read-only projections**; adjust via pins, not by editing them.

## Planning workflow (progressive disclosure)

```text
L0  Task / backlog / bug detail
L1  docs/code-index/context/modules/<module>.md   ← minimum module set
L2  docs/product.md, features.md, roadmap.md, tech-stack.md  ← optional
L3  docs/code-index/context/code-map.json       ← after plan names symbols
```

Do **not** inject all scopes or the full code map during planning.

## Configuration

`code-indexer.config.json` is **optional**. Defaults:

- Search common paths for the three docs
- `discover: auto`
- Detect Next.js-style APIs under `src/app/api` (and other common layouts)
- `code-map` roots: `src`, `lib`, `apps`, `packages`, …

See `code-indexer.config.example.json`.

## code-indexer plugin CLI

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/module-map/generate.mjs" --init --write-scripts
node "${CLAUDE_PLUGIN_ROOT}/scripts/module-map/generate.mjs" --doctor
node "${CLAUDE_PLUGIN_ROOT}/scripts/code-map/generate-code-map.mjs"
node "${CLAUDE_PLUGIN_ROOT}/scripts/module-map/generate.mjs"
node "${CLAUDE_PLUGIN_ROOT}/scripts/module-map/generate.mjs" --pin <module-id>     # freeze a derived module
node "${CLAUDE_PLUGIN_ROOT}/scripts/module-map/generate.mjs" --unpin <module-id>   # return it to auto
```

Set `LOG_LEVEL=debug` or `DEBUG_CODE_INDEXER=1` for structured trace logs on stderr.

## Agent entrypoint matrix

| Runtime | Repo-committed entry | Global skill/plugin | Notes |
|---------|---------------------|---------------------|-------|
| **Cursor** | `.cursor/rules/code-indexer.mdc`, optional `.cursor/skills/` | `code-indexer` local plugin | Rules reference one L1 scope |
| **Claude Code** | `AGENTS.md`, `CLAUDE.md` | marketplace plugin | Plugins global by design |
| **Codex** | `AGENTS.md`, optional `.agents/skills/` | `~/.agents/skills` symlink | agentskills.io compatible |
| **OpenClaw** | `<repo>/skills/` | `~/.openclaw/skills` | Configure via `openclaw.json` |
| **Hermes** | repo path in `~/.hermes/config.yaml` `skills.load.extraDirs` | `~/.hermes/skills` | agentskills.io `SKILL.md` |

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/module-map/generate.mjs" --doctor --runtimes` to print per-runtime readiness (paths, project entries).

Bootstrap templates copied to consumer repos on `--init`: `scripts/bootstrap-templates/`. Agent workflow: **code-indexer:using-code-indexer** skill.
