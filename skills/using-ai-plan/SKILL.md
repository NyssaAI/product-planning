---
name: using-ai-plan
description: Use when implementation planning needs scoped repo context from docs/agent-plan/context module graphs or code maps
---

# Using AI Plan

**Canonical source** for ai-plan behavior. The `/ai-plan` command, `scripts/bootstrap-templates/AGENTS.md`, `.cursor/rules/ai-plan.mdc`, and the embedded module-map table in `CLAUDE.md` / `AGENTS.md` are thin wrappers that must stay in sync with this skill — update this skill first when rules change.

Repository-agnostic **code map + module graph** for planning. Outputs live under `docs/agent-plan/context/` in the **target repository** (not inside the plugin).

**Announce at start:** "I'm using the using-ai-plan skill to load planning context."

## When to Use

- **Before planning implementation work** in a repo that has `docs/agent-plan/context/` artifacts, or has `package.json` / polyglot source roots — load the in-scope module file(s) for the area you are about to change.
- When `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` exist and you need module boundaries for an existing codebase.

Do **not** use for greenfield repos with no source yet (skip until code exists).

## Progressive Disclosure (mandatory)

**Primary ai-plan artifact:** `docs/agent-plan/context/modules/<module-id>.md` — a self-contained architectural description of one code module (boundaries, `dependsOn` / `usedBy`, routes, test roots, sample symbols). This is not a duplicate of `docs/agent-plan/specs/` or `docs/agent-plan/plans/`; those are *work-item* docs. Module files are *module* docs.

Load context in levels — never inject everything at once:

| Level | Inject | When |
|-------|--------|------|
| L0 | The task / feature description (and a design doc if feature work) | Always |
| L1 | **In-scope** `docs/agent-plan/context/modules/<module-id>.md` set | When planning — read the minimum in-scope module set now (Read tool). Do not defer or summarize. |
| L2 | `docs/product.md`, `docs/roadmap.md`, or `docs/tech-stack.md` | When product context needed |
| L3 | `docs/agent-plan/context/code-map.json` | **After** the plan names symbols — implementation only |

`module-map.json` informs task ordering; do not paste the whole file into context.

Read the minimum in-scope module set — usually one module file; add a directly-coupled module (via its `dependsOn` / `usedBy` edges) only when the work crosses that module's boundary. Never inject all module files or the full code map.

## Planning context evidence

When you produce an implementation plan for a repo with ai-plan artifacts, record the module context you planned against so the plan stays reproducible:

- `**Planning module:** docs/agent-plan/context/modules/<module-id>.md` in the plan header
- A `## Planning context` section with the selected module id, description, capabilities, and does-not-own facts copied from the module file
- Task ordering that respects `module-map.json` dependency edges when multiple modules are in scope

If those fields are missing, regenerate or rewrite the plan before implementation rather than inferring the module context later.

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

## Pick the Module File(s) (when planning)

1. Read `docs/agent-plan/context/index.md` — module table links to `modules/<id>.md`
2. Match the task / roadmap item to its **Primary modules** — the minimum set needed for the behavior (ask if ambiguous)
3. Read each in-scope `docs/agent-plan/context/modules/<id>.md` now (use the Read tool). Do not summarize or skip — capabilities, boundaries, `dependsOn` / `usedBy`, Public API, routes, test roots. Read the minimum in-scope module set — usually one module file; add a directly-coupled module (via its `dependsOn` / `usedBy` edges) only when the work crosses that module's boundary. Never inject all module files or the full code map
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

Generated artifacts live under `docs/agent-plan/context/` in the target repository. Do not invent alternate paths.

See `scripts/ai-plan/README.md` in the plugin for generator and config details.
