---
name: using-ai-plan
description: Use when writing implementation plans in a repo with code — generates or consumes docs/ai-plan module graph and CODE_MAP for scoped planning context
---

# Using AI Plan

**Canonical source** for ai-plan behavior. The `/ai-plan` command, `install/bootstrap-templates/AGENTS.md`, and `.cursor/rules/ai-plan.mdc` are thin wrappers — update this skill first when rules change.

Repository-agnostic **code map + module graph** for planning. Outputs live under `docs/ai-plan/` in the **target repository** (not inside the plugin).

**Announce at start:** "I'm using the using-ai-plan skill to load planning context."

## When to Use

- **writing-plans** — REQUIRED when `docs/ai-plan/INDEX.md` exists or the repo has `package.json` / polyglot source roots
- **brainstorming** (existing codebases) — read `INDEX.md` and `MODULE_MAP.json` summary for module boundaries
- After **plan-product** or when `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` exist

Do **not** use for greenfield repos with no source yet (skip until code exists).

## Progressive Disclosure (mandatory)

**Primary ai-plan artifact:** `docs/ai-plan/scopes/<module-id>.md` — a self-contained architectural description of one code module (boundaries, `dependsOn` / `usedBy`, routes, test roots, sample symbols). This is not a duplicate of `docs/specs/` or `docs/plans/`; those are *work-item* docs. Scopes are *module* docs.

| Level | Inject | When |
|-------|--------|------|
| L0 | Task + `docs/specs/…-design.md` (if feature work) | Always |
| L1 | **One** `docs/ai-plan/scopes/<module-id>.md` | **During writing-plans** — pick module from INDEX |
| L2 | `docs/product.md`, `docs/roadmap.md`, or `docs/tech-stack.md` | When product context needed |
| L3 | `docs/ai-plan/CODE_MAP.json` | **After** plan names symbols — implementation only |

`MODULE_MAP.json` informs task ordering; do not paste the whole file into context.

**Never** inject all scope files or the full CODE_MAP during planning.

## Generate (target repo)

Requires in the **project repo** (not the plugin):

1. `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` (or paths in `ai-plan.config.json`)

**@ast-grep/cli** is provided by the dev-tools plugin (`node_modules` under the plugin root). On first `code-map` run it auto-installs there if missing — **do not** add `@ast-grep/cli` to the project repo.

From the **project root**, using scripts bundled in the dev-tools plugin:

```bash
# One-time bootstrap (creates docs, configs, AGENTS.md stubs)
node "<PLUGIN_ROOT>/scripts/ai-plan/generate.mjs" --init --write-scripts

# Regenerate map + scopes (run code-map first internally via npm script, or both):
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

## Pick a Module Scope (writing-plans)

1. Read `docs/ai-plan/INDEX.md` — module table links to `scopes/<id>.md`
2. Match the spec / roadmap item to **one** module (ask if ambiguous)
3. Read **only** that scope file — boundaries, `dependsOn` / `usedBy`, routes, test roots, sample symbols
4. Use `docs/ai-plan/MODULE_MAP.json` only for dependency ordering between tasks (do not paste the whole file into context)

Record in the plan header:

```markdown
**Planning scope:** `docs/ai-plan/scopes/<module-id>.md`
```

## Staleness

Regenerate when:

- Module folders added/removed/renamed
- Public API or route structure changed materially
- Scope file missing for the module you need

Tell your human partner: "Module graph may be stale — run `npm run ai-plan` in the project repo."

## Repo layout

Generated artifacts live under `docs/ai-plan/` per **`standards/project-structure.md`** (bundled in dev-tools). Do not invent alternate paths.

## Integration

| Skill | Role |
|-------|------|
| **plan-product** | Creates docs that feed ai-plan |
| **brainstorming** | Spec + roadmap item; optional INDEX for boundaries |
| **using-core-standards** | Project structure, test layout, timestamp rules |
| **using-git-worktrees** | Before writing-plans |
| **writing-plans** | Consumes L1 scope + MODULE_MAP edges + standards from spec |
| **subagent-driven-development** / **executing-plans** | L3 CODE_MAP for named symbols only |

See `scripts/ai-plan/README.md` and `docs/standards.md` in the plugin for details.
