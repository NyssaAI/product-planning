---
name: using-ai-plan
description: Use when implementation planning needs scoped repo context from docs/agent-plan/context module graphs or code maps
---

# Using AI Plan

**Canonical source** for ai-plan behavior. The `/ai-plan` command, `scripts/bootstrap-templates/AGENTS.md`, `.cursor/rules/ai-plan.mdc`, `hooks/hooks.json` (the TaskCreated prompt), and the embedded module-map table in `CLAUDE.md` / `AGENTS.md` are thin wrappers that must stay in sync with this skill — update this skill first when rules change.

Repository-agnostic **code map + module graph** for planning. Outputs live under `docs/agent-plan/context/` in the **target repository** (not inside the plugin).

**Announce at start:** "I'm using the using-ai-plan skill to load planning context."

## When to Use

- **write-plan** — REQUIRED when `docs/agent-plan/context/index.md` exists or the repo has `package.json` / polyglot source roots (invoked by design-spec)
- **design-spec** (existing codebases) — read `index.md` and `module-map.json` summary for module boundaries; auto-regenerates index if stale
- After **plan-product** or when `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` exist

Do **not** use for greenfield repos with no source yet (skip until code exists).

## Progressive Disclosure (mandatory)

**Primary ai-plan artifact:** `docs/agent-plan/context/modules/<module-id>.md` — a self-contained architectural description of one code module (boundaries, `dependsOn` / `usedBy`, routes, test roots, sample symbols). This is not a duplicate of `docs/agent-plan/specs/` or `docs/agent-plan/plans/`; those are *work-item* docs. Module files are *module* docs.

| Level | Inject | When |
|-------|--------|------|
| L0 | Task + `docs/agent-plan/specs/…-design.md` (if feature work) | Always |
| L1 | **In-scope** `docs/agent-plan/context/modules/<module-id>.md` set | **During write-plan** — Read the minimum in-scope module set now (Read tool). Do not defer or summarize. |
| L2 | `docs/product.md`, `docs/roadmap.md`, or `docs/tech-stack.md` | When product context needed |
| L3 | `docs/agent-plan/context/code-map.json` | **After** plan names symbols — implementation only |

`module-map.json` informs task ordering; do not paste the whole file into context.

Read the minimum in-scope module set for the spec — usually one module file; add a directly-coupled module (via its dependsOn/usedBy edges) only when the feature crosses that module's boundary. Never inject all module files or the full code map.

## Generate (target repo)

Requires in the **project repo** (not the plugin):

1. `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` (or paths in `ai-plan.config.json`)

**@ast-grep/cli** is provided by the dev-tools plugin (`node_modules` under the plugin root). On first `code-map` run it auto-installs there if missing — **do not** add `@ast-grep/cli` to the project repo.

From the **project root**, using scripts bundled in the dev-tools plugin:

```bash
# One-time bootstrap (creates docs, configs, AGENTS.md stubs)
node "<PLUGIN_ROOT>/scripts/ai-plan/generate.mjs" --init --write-scripts

# Regenerate map + module files (run code-map first internally via npm script, or both):
node "<PLUGIN_ROOT>/scripts/code-map/generate-code-map.mjs"
node "<PLUGIN_ROOT>/scripts/ai-plan/generate.mjs"
```

Replace `<PLUGIN_ROOT>` with `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or the installed dev-tools plugin directory.

**Validate:** `node "<PLUGIN_ROOT>/scripts/ai-plan/generate.mjs" --doctor`

**Project `package.json` scripts** (after `--init --write-scripts`):

```json
{
  "scripts": {
    "code-map": "node scripts/code-map/generate-code-map.mjs",
    "ai-plan": "npm run code-map && node scripts/ai-plan/generate.mjs"
  }
}
```

If `--write-scripts` copied tooling into the repo, prefer `npm run ai-plan` from the project root.

## Pick the Module File(s) (write-plan)

1. Read `docs/agent-plan/context/index.md` — module table links to `modules/<id>.md`
2. Match the spec / roadmap item to its **Primary modules** — the minimum set needed for the behavior (ask if ambiguous)
3. Read each in-scope `docs/agent-plan/context/modules/<id>.md` now (use the Read tool). Do not summarize or skip — capabilities, boundaries, `dependsOn` / `usedBy`, Public API, routes, test roots. Read the minimum in-scope module set for the spec — usually one module file; add a directly-coupled module (via its dependsOn/usedBy edges) only when the feature crosses that module's boundary. Never inject all module files or the full code map
4. Use `docs/agent-plan/context/module-map.json` only for dependency ordering between tasks (do not paste the whole file into context)

Record in the plan header:

```markdown
**Planning module:** `docs/agent-plan/context/modules/<module-id>.md`
```

## Staleness

Regenerate when:

- Module folders added/removed/renamed
- Public API or route structure changed materially
- Module file missing for the module you need

**Staleness gate:** run `npm run ai-plan` (or `node scripts/ai-plan/generate.mjs`) **before any planning step** when any of these hold — do not proceed with stale context:

- `docs/agent-plan/context/index.md` is missing
- any source file is newer than `index.md`
- the embedded module-map section in `CLAUDE.md` / `AGENTS.md` is missing, or its generated timestamp is older than `index.md` (the generator stamps that section when it writes it)

Tell your human partner: "Module graph was stale — regenerated before planning."

## Repo layout

Generated artifacts live under `docs/agent-plan/context/` per **`standards/project-structure.md`** (bundled in dev-tools). Do not invent alternate paths.

## Integration

| Skill | Role |
|-------|------|
| **plan-product** | Creates docs that feed ai-plan |
| **design-spec** | Auto-regenerates index if stale; reads index + module-map; **minimum module set per spec** |
| **using-core-standards** | Project structure, test layout, timestamp rules |
| **using-git-worktrees** | Before write-plan |
| **write-plan** | Consumes L1 module file + module-map edges + standards from spec |
| **execute-plan** / **execute-plan-run** / **execute-plan-run-inline** | L3 code-map for named symbols only |

See `scripts/ai-plan/README.md` and `docs/standards.md` in the plugin for details.
