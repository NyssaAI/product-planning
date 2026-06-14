# Dev-Tools Directory Reorganization

**Date:** 2026-06-11
**Status:** Approved
**Target repo:** `jamaynor/dev-tools` plugin

## Summary

Reorganize the dev-tools plugin's project structure standard to separate human-authored product docs from agent-generated and workflow artifacts. All dev-tools outputs move under `docs/agent-plan/`, with generated code maps isolated in `docs/agent-plan/context/`. Three new artifact types are added to the standard: `docs/features.md` (feature inventory), `docs/use-cases/` (structured use-case detail files), and `docs/design/` (reserved folder for UI design artifacts).

## Scope

**In scope:**
- New directory structure standard (`standards/project-structure.md` rewrite)
- Updated paths in all generator scripts and skills
- New artifact formats: `features.md`, `use-cases/f{n}-u{n}.md`
- Migration command (`--migrate`) with scaffolding
- `design-spec` skill updated to accept use-case files as a third input type

**Out of scope:**
- Code mapper overhaul (separate spec — Item 2)
- `docs/design/` format convention (reserved folder only, no enforced schema)
- `--init` bootstrap rework (path updates only; new stubs added to `--migrate`)

---

## New Directory Structure

```
docs/
├── product.md                               human: PRD
├── roadmap.md                               human: priority and phase plan
├── tech-stack.md                            human: technologies and standards
├── features.md                              human: feature inventory (NEW)
├── design/                                  human: UI wireframes and mockups (NEW)
├── use-cases/                               human: structured use-case detail (NEW)
│   └── f{n}-u{n}.md
└── agent-plan/
    ├── context/                             generated — do not hand-edit
    │   ├── index.md
    │   ├── code-map.json
    │   ├── module-map.json
    │   └── modules/
    │       └── <module-id>.md
    ├── specs/                               workflow: approved design docs
    │   └── YYYY-MM-DD-<topic>-design.md
    ├── plans/                               workflow: implementation plans
    │   └── YYYY-MM-DD-<feature-name>.md
    ├── backlog/                             workflow: queued work items
    │   └── {YYYY.MM.DD-HHMMSS-slug}/
    │       └── {timestamp}-{slug}-detail.md
    └── bugs/                               workflow: bug reports and resolutions
        └── {YYYY.MM.DD-HHMMSS-slug}/
            ├── {timestamp}-{slug}-detail.md
            └── {timestamp}-{slug}-resolution.md
```

**Rule:** `docs/` root is human-only product docs. `docs/agent-plan/` is everything the plugin touches. `docs/agent-plan/context/` is machine-generated and freely overwritten.

---

## New Artifact Types

### docs/features.md

Human-maintained feature inventory. Linked from use-case frontmatter.

```markdown
# Features

| #  | Feature            | Status  | Summary                                              |
|----|--------------------|---------|------------------------------------------------------|
| F1 | Actor Registration | active  | Provisional registration workflow with accept/reject |
| F2 | Host Registry      | planned | SSH tunnel registration and management               |
```

Status values: `planned` | `active` | `complete` | `deferred`

### docs/use-cases/f{n}-u{n}.md

One file per use case. Forms the third input type for `design-spec` alongside ad-hoc ideas and backlog items.

```markdown
---
product: <Product Name>
feature: F1
feature-name: Actor Registration
use-case: F1-U1
use-case-name: Register a new actor
status: active
---

# F1-U1: Register a new actor

Brief prose describing what the actor is trying to do and why it matters.

## Process

​```
Actor submits registration
└── System validates actor id and kind
    ├── [new] Create pending registration
    │   └── Notify permission-holders for acceptance
    └── [existing pending] Refresh registration profile
        └── Return idempotent response
​```

## Success criteria

- [ ] A new actor id creates a pending registration
- [ ] Re-submitting a pending registration refreshes it idempotently
- [ ] Invalid actor id or kind returns a clear error
- [ ] Admitted actors cannot re-register via this path
```

### docs/design/

Reserved folder for UI wireframes, mockups, and layout specs. No enforced schema. Plugin creates the directory during migration; teams populate it freely.

---

## Progressive Specificity Chain

Each level adds specificity to the previous. This chain becomes the canonical input path into `design-spec`:

```
docs/product.md          PRD — what the product is
       ↓
docs/features.md         Feature inventory — one step more detailed than PRD
       ↓
docs/use-cases/f{n}-u{n}.md   Use-case detail — one step more detailed than feature
       ↓
docs/agent-plan/specs/  Design spec — technical design for one use case (design-spec output)
       ↓
docs/agent-plan/plans/  Implementation plan (write-plan output)
```

---

## Plugin Surface Area

### Generator scripts

| File | Change |
|------|--------|
| `scripts/code-map/generate-code-map.mjs` | Default output → `docs/agent-plan/context/code-map.json` |
| `scripts/code-map/lib/code-map-config.mjs` | `DEFAULT_OUTPUT` constant updated |
| `scripts/ai-plan/generate.mjs` | All outputs under `docs/ai-plan/` → `docs/agent-plan/context/` |
| `scripts/ai-plan/lib/*.mjs` | Path constants throughout |

### Skills

| Skill | Change |
|-------|--------|
| `using-ai-plan` | `docs/ai-plan/index.md` → `docs/agent-plan/context/index.md`; all scope references updated |
| `design-spec` | `docs/specs/` → `docs/agent-plan/specs/`; add use-case file as third input type |
| `write-plan` | `docs/plans/` → `docs/agent-plan/plans/` |
| `add-backlog` | `docs/backlog/` → `docs/agent-plan/backlog/` |
| `fix-bug` / `fix-bug-log` | `docs/bugs/` → `docs/agent-plan/bugs/` |

### Standards

`standards/project-structure.md` — complete rewrite to reflect new tree, new artifact types, and the progressive-specificity chain.

### Bootstrap templates

`scripts/bootstrap-templates/` and generated `AGENTS.md` stubs updated to reference new paths.

---

## design-spec Input Chain (updated)

`design-spec` gains a third input type:

**Use-case input:** When given a path under `docs/use-cases/`, `design-spec`:
1. Reads the use-case file (summary, process, success criteria)
2. Looks up the linked feature row in `docs/features.md`
3. Reads `docs/product.md` for product context
4. Carries the use-case success criteria forward as spec acceptance criteria
5. Asks clarifying questions only for gaps not covered by the use-case

---

## Migration Command

`node "<PLUGIN_ROOT>/scripts/ai-plan/generate.mjs" --migrate`

Steps (all idempotent — skips if target already exists):

1. Move `docs/ai-plan/` → `docs/agent-plan/context/`
   - Rename `INDEX.md` → `index.md`
   - Rename `CODE_MAP.json` → `code-map.json`
   - Rename `MODULE_MAP.json` → `module-map.json`
   - Rename `scopes/` → `modules/` (contents move unchanged)
2. Move `docs/specs/` → `docs/agent-plan/specs/`
3. Move `docs/plans/` → `docs/agent-plan/plans/`
4. Move `docs/backlog/` → `docs/agent-plan/backlog/`
5. Move `docs/bugs/` → `docs/agent-plan/bugs/`
6. Patch cross-references in moved files:
   - `module-map.json` `"codeMap"` field: `docs/ai-plan/CODE_MAP.json` → `docs/agent-plan/context/code-map.json`
   - `index.md` module links: relative `./scopes/` references → `./modules/` (the directory is renamed in step 1, so old relative links break)
   - `module-map.json` `"planningScope"` keys: rename to `"planningModule"`; values `docs/ai-plan/scopes/` → `docs/agent-plan/context/modules/`
7. Create `docs/design/` with `.gitkeep`
8. Create `docs/use-cases/` with `.gitkeep`
9. Create `docs/features.md` stub (table header + one commented example row)
10. Print a summary of every action taken (moved, created, skipped)

---

## Breaking Change and Versioning

This is a breaking change to all repos using dev-tools. The plugin increments its major version when this ships. Repos on the old layout continue working on the previous major version; migration is opt-in until a deprecation window is announced.

---

## Standards Applied

| Standard | Key constraint for this design |
|----------|-------------------------------|
| `project-structure` | Defines the authoritative layout being replaced; rewrite must cover all artifact types the current standard covers |
| `timestamp-format` | Unchanged — artifact naming timestamps carry over as-is |
| `bug-workflow` | Path update only — workflow logic unchanged |
| `backlog-workflow` | Path update only — workflow logic unchanged |
