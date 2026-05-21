# AI Plan

**Shipped in the [jamaynor/dev-tools](https://github.com/jamaynor/dev-tools) plugin** at `scripts/code-map/` and `scripts/ai-plan/`. Workflow integration: **dev-tools:using-ai-plan** skill and **dev-tools:writing-plans**.

From a project repo with the dev-tools plugin installed:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/ai-plan/generate.mjs" --init --write-scripts
npm run ai-plan   # after init adds project scripts
```

Upstream also lives in [jamaynor/ai-tools](https://github.com/jamaynor/ai-tools) (DevJoy CLI: `devjoy ai-plan`).

---

**Repository-agnostic** planning context for AI agents. The only required inputs are your standard product documents:

| Document | Typical path |
|----------|----------------|
| Product | `docs/product.md` |
| Roadmap | `docs/roadmap.md` |
| Tech stack | `docs/tech-stack.md` |

Everything else is **auto-detected** (modules, code roots, HTTP routes, dependencies).

## Quick start (any repository)

1. Add the three markdown files (or set paths in `ai-plan.config.json`).
2. Use scripts from the dev-tools plugin (`${CLAUDE_PLUGIN_ROOT}/scripts/…`) — no project `npm i @ast-grep/cli` required.
3. Run once:

```bash
npm run ai-plan -- --init   # optional: writes minimal configs
npm run ai-plan             # code-map + MODULE_MAP + scopes
```

5. Add to `package.json`:

```json
{
  "scripts": {
    "code-map": "node path/to/scripts/code-map/generate.mjs",
    "ai-plan": "node path/to/scripts/ai-plan/generate.mjs",
    "postbuild": "npm run code-map && node path/to/scripts/ai-plan/generate.mjs"
  }
}
```

## What gets generated

| Output | Purpose |
|--------|---------|
| `docs/ai-plan/CODE_MAP.json` | Symbol index (exports, routes, line numbers) |
| `docs/ai-plan/MODULE_MAP.json` | Module graph (`dependsOn` / `usedBy`) |
| `docs/ai-plan/scopes/<id>.md` | **Primary artifact** — one module architecture per file |
| `docs/ai-plan/INDEX.md` | Progressive disclosure guide |

## Module discovery (`modules.discover`)

| Value | Behavior |
|-------|----------|
| **`auto`** (default) | npm workspaces → `packages/*`, `apps/*`, … → `src/*` children → fallback `src` |
| `workspaces` | Only `package.json` workspaces |
| `glob` | `modules.globs` patterns |
| `manual` | Only `modules.manual` list |

Optional `modules.manual` adds modules workspaces miss (e.g. an app shell folder).

## Planning workflow (progressive disclosure)

```text
L0  Task / backlog / bug detail
L1  docs/ai-plan/scopes/<module>.md   ← one module
L2  docs/product.md, roadmap.md, tech-stack.md  ← optional
L3  docs/ai-plan/CODE_MAP.json       ← after plan names symbols
```

Do **not** inject all scopes or the full code map during planning.

## Configuration

`ai-plan.config.json` is **optional**. Defaults:

- Search common paths for the three docs
- `discover: auto`
- Detect Next.js-style APIs under `src/app/api` (and other common layouts)
- `code-map` roots: `src`, `lib`, `apps`, `packages`, …

See `ai-plan.config.example.json`.

## dev-tools plugin CLI

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/ai-plan/generate.mjs" --init --write-scripts
node "${CLAUDE_PLUGIN_ROOT}/scripts/ai-plan/generate.mjs" --doctor
node "${CLAUDE_PLUGIN_ROOT}/scripts/code-map/generate-code-map.mjs"
node "${CLAUDE_PLUGIN_ROOT}/scripts/ai-plan/generate.mjs"
```

Set `LOG_LEVEL=debug` or `DEBUG_AI_PLAN=1` for structured trace logs on stderr.

## DevJoy (optional)

Same scripts in [jamaynor/ai-tools](https://github.com/jamaynor/ai-tools):

```bash
devjoy ai-plan init
devjoy ai-plan doctor
devjoy ai-plan generate
```

## Agent entrypoint matrix

| Runtime | Repo-committed entry | Global skill/plugin | Notes |
|---------|---------------------|---------------------|-------|
| **Cursor** | `.cursor/rules/ai-plan.mdc`, optional `.cursor/skills/` | `dev-tools` local plugin | Rules reference one L1 scope |
| **Claude Code** | `AGENTS.md`, `CLAUDE.md` | marketplace plugin | Plugins global by design |
| **Codex** | `AGENTS.md`, optional `.agents/skills/` | `~/.agents/skills` symlink | agentskills.io compatible |
| **OpenClaw** | `<repo>/skills/` | `~/.openclaw/skills` | Configure via `openclaw.json` |
| **Hermes** | repo path in `~/.hermes/config.yaml` `skills.load.extraDirs` | `~/.hermes/skills` | agentskills.io `SKILL.md` |

Run `devjoy ai-plan doctor --runtimes` to print per-runtime readiness (paths, project entries).

## dev-tools workflow integration

Install global defaults after bootstrap:

```bash
devjoy ai-plan init --with-skills global
```

Workflow skills (from `dev-tools` v5.0.8+) use generated context:

- **Planning** — L0 task + spec + one `docs/ai-plan/scopes/<module>.md`; product docs at L2 if needed
- **Backlog** — `docs/backlog/{YYYY.MM.DD-HHMMSS-slug}/{timestamp-slug}-detail.md`
- **Bug** — `docs/bugs/{YYYY.MM.DD-HHMMSS-slug}/` with detail + resolution files

Regenerate after module structure changes: `devjoy ai-plan`.

See `install/skills-templates/dev-tools/AI_PLAN.md` for the integration contract.
