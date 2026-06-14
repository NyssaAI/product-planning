# Dev-Tools Directory Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use **dev-tools:execute-plan** to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the dev-tools plugin's project structure standard to separate human-authored product docs from agent-generated and workflow artifacts. All dev-tools outputs move under `docs/agent-plan/`, with generated code maps isolated in `docs/agent-plan/context/`. Add three new artifact types: `docs/features.md`, `docs/use-cases/`, and `docs/design/`.

**Architecture:** Path constants updated throughout generator scripts and skills. A new `--migrate` command added to `generate.mjs` handles idempotent migration of existing consumer repos. The `design-spec` skill gains a third input type (use-case files).

**Planning scope:** `docs/ai-plan/scopes/main.md` (current layout — becomes `docs/agent-plan/context/modules/main.md` once this plan ships)

**Spec:** `docs/specs/2026-06-11-dev-tools-directory-reorganization-design.md`

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `standards/project-structure.md` | Authoritative layout standard | Complete rewrite |
| `scripts/code-map/lib/code-map-config.mjs` | Code map output path | Update `DEFAULT_OUTPUT` constant |
| `scripts/code-map/generate-code-map.mjs` | Code map generator entry | Update JSDoc comment path |
| `scripts/ai-plan/lib/config.mjs` | ai-plan path constants | Update 4 path strings |
| `scripts/ai-plan/lib/bootstrap.mjs` | Directory scaffolding | Update 3 directory paths |
| `scripts/ai-plan/lib/doctor.mjs` | Validation checks | Update 2 path strings |
| `scripts/ai-plan/lib/render.mjs` | INDEX.md renderer | Update 2 path strings in output |
| `scripts/ai-plan/generate.mjs` | Generator entry point | Add `--migrate` command handler |
| `skills/using-ai-plan/SKILL.md` | Planning skill | Update all `docs/ai-plan/` → `docs/agent-plan/context/`; `docs/specs/` → `docs/agent-plan/specs/` |
| `skills/design-spec/SKILL.md` | Design spec skill | Update `docs/specs/`, `docs/backlog/`, `docs/ai-plan/` paths; add use-case input type |
| `skills/design-spec/spec-document-reviewer-prompt.md` | Reviewer prompt | Update `docs/specs/` path |
| `skills/design-spec/references/policy.md` | Design policy | Update `docs/specs/` path |
| `skills/write-plan/SKILL.md` | Write plan skill | Update `docs/plans/`, `docs/ai-plan/` paths |
| `skills/add-backlog/SKILL.md` | Backlog skill | Update `docs/backlog/` → `docs/agent-plan/backlog/` |
| `skills/fix-bug-log/SKILL.md` | Bug logging skill | Update `docs/bugs/` → `docs/agent-plan/bugs/` |
| `skills/fix-bug/SKILL.md` | Bug fix orchestrator | Update `docs/bugs/` path |
| `skills/fix-bug/checklists/lifecycle-checklist.md` | Bug lifecycle | Update 2 `docs/bugs/` references |
| `skills/fix-bug/references/policy.md` | Bug policy | Update `docs/bugs/` reference |
| `skills/fix-bug/templates/fix-bug-summary-template.md` | Bug summary template | Update 2 `docs/bugs/` references |
| `skills/fix-bug-resolve/SKILL.md` | Bug resolution skill | Update `docs/bugs/` references |
| `skills/fix-bug-complete/SKILL.md` | Bug completion skill | Update `docs/bugs/` references |
| `scripts/bootstrap-templates/` | AGENTS.md stubs | Update path references |

---

### Task 1: Rewrite `standards/project-structure.md`

**Files:**
- Rewrite: `standards/project-structure.md`

This is the canonical layout reference. All downstream skills and scripts implement what this document defines. It must be rewritten before any other task.

- [ ] **Step 1: Read the current file**

Read `standards/project-structure.md` in full to understand the existing structure and all sections present.

- [ ] **Step 2: Rewrite the file**

Replace the entire `docs/` directory tree section with the new layout from the spec. The new layout is:

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

Add the rule: "`docs/` root is human-only product docs. `docs/agent-plan/` is everything the plugin touches. `docs/agent-plan/context/` is machine-generated and freely overwritten."

Add the new artifact type definitions for `docs/features.md`, `docs/use-cases/f{n}-u{n}.md` (with frontmatter and body format), and `docs/design/`.

Add the progressive-specificity chain:
```
docs/product.md → docs/features.md → docs/use-cases/f{n}-u{n}.md → docs/agent-plan/specs/ → docs/agent-plan/plans/
```

Update all references to old paths elsewhere in the document (backlog format, bugs format, etc.) to use the new paths.

- [ ] **Step 3: Verify the rewrite**

Read the file. Confirm:
- All old paths (`docs/specs/`, `docs/plans/`, `docs/backlog/`, `docs/bugs/`, `docs/ai-plan/`) are replaced
- All three new artifact types are documented
- Progressive-specificity chain is present
- The `docs/` root human-only rule is stated

- [ ] **Step 4: Commit**

```bash
git add standards/project-structure.md
git commit -m "feat(standards): rewrite project-structure for docs/agent-plan/ layout

Move all workflow and generated artifacts under docs/agent-plan/. Add
features.md, use-cases/, and design/ as human-authored artifact types.
Add progressive-specificity chain documentation."
```

---

### Task 2: Update code-map generator path constants

**Files:**
- Modify: `scripts/code-map/lib/code-map-config.mjs` (line 60)
- Modify: `scripts/code-map/generate-code-map.mjs` (line 3, JSDoc comment)

- [ ] **Step 1: Update `code-map-config.mjs`**

Read `scripts/code-map/lib/code-map-config.mjs`. Find the `DEFAULT_OUTPUT` constant (currently `'docs/ai-plan/CODE_MAP.json'`). Change it to `'docs/agent-plan/context/code-map.json'`.

- [ ] **Step 2: Update `generate-code-map.mjs` JSDoc**

Read `scripts/code-map/generate-code-map.mjs`. Find the JSDoc comment on line 3 that references `docs/ai-plan/CODE_MAP.json`. Update it to reference `docs/agent-plan/context/code-map.json`.

- [ ] **Step 3: Verify both files**

Read the changed lines in both files. Confirm the old path string `docs/ai-plan/CODE_MAP.json` no longer appears in either file.

- [ ] **Step 4: Commit**

```bash
git add scripts/code-map/lib/code-map-config.mjs scripts/code-map/generate-code-map.mjs
git commit -m "feat(code-map): update default output path to docs/agent-plan/context/

CODE_MAP.json now defaults to docs/agent-plan/context/code-map.json
(lowercase filename, new directory structure)."
```

---

### Task 3: Update ai-plan lib path constants

**Files:**
- Modify: `scripts/ai-plan/lib/config.mjs` (lines 17, 70, 74, 154)
- Modify: `scripts/ai-plan/lib/bootstrap.mjs` (lines 109, 110, 112)
- Modify: `scripts/ai-plan/lib/doctor.mjs` (lines 131, 132)
- Modify: `scripts/ai-plan/lib/render.mjs` (lines 60, 61)

- [ ] **Step 1: Update `config.mjs`**

Read `scripts/ai-plan/lib/config.mjs`. Make these changes:
- Line 17: JSDoc comment `docs/ai-plan/modules/<id>.md` → `docs/agent-plan/context/modules/<id>.md`
- Line 70: `'docs/ai-plan'` (default outputDir) → `'docs/agent-plan/context'`
- Line 74: `'docs/ai-plan/CODE_MAP.json'` (default codeMapOutput) → `'docs/agent-plan/context/code-map.json'`
- Line 154: `'docs/ai-plan/CODE_MAP.json'` (in writeStarterConfigs template) → `'docs/agent-plan/context/code-map.json'`

- [ ] **Step 2: Update `bootstrap.mjs`**

Read `scripts/ai-plan/lib/bootstrap.mjs`. Make these changes:
- Line 109: `'docs/backlog'` → `'docs/agent-plan/backlog'`
- Line 110: `'docs/bugs'` → `'docs/agent-plan/bugs'`
- Line 112: `'docs/ai-plan/scopes'` → `'docs/agent-plan/context/modules'` (the new layout names this directory `modules/` — see the spec tree; do NOT use `context/scopes`)

- [ ] **Step 3: Update `doctor.mjs`**

Read `scripts/ai-plan/lib/doctor.mjs`. Make these changes:
- Line 131: `'docs/backlog'` (in checkAgentEntrypoints array) → `'docs/agent-plan/backlog'`
- Line 132: `'docs/bugs'` (in checkAgentEntrypoints array) → `'docs/agent-plan/bugs'`

- [ ] **Step 4: Update `render.mjs`**

Read `scripts/ai-plan/lib/render.mjs`. Make these changes:
- Line 60: The backlog path in renderIndex output: `docs/backlog/{YYYY.MM.DD-HHMMSS-slug}/` → `docs/agent-plan/backlog/{YYYY.MM.DD-HHMMSS-slug}/`
- Line 61: The bugs path in renderIndex output: `docs/bugs/{YYYY.MM.DD-HHMMSS-slug}/` → `docs/agent-plan/bugs/{YYYY.MM.DD-HHMMSS-slug}/`
- Also update any reference to `docs/ai-plan/` or `docs/specs/` or `docs/plans/` in render.mjs to use the new paths.

- [ ] **Step 5: Grep for remaining old paths in scripts/ai-plan/lib/**

```bash
grep -rn "docs/ai-plan\|docs/specs\|docs/plans\|docs/backlog\|docs/bugs" scripts/ai-plan/lib/
```

Fix any remaining references not caught above.

- [ ] **Step 6: Verify all four files**

Read each changed file. Confirm no `docs/ai-plan`, `docs/backlog`, or `docs/bugs` strings remain (except in comments that need updating too).

- [ ] **Step 7: Commit**

```bash
git add scripts/ai-plan/lib/config.mjs scripts/ai-plan/lib/bootstrap.mjs scripts/ai-plan/lib/doctor.mjs scripts/ai-plan/lib/render.mjs
git commit -m "feat(ai-plan): update lib path constants to docs/agent-plan/

All generated artifacts now route to docs/agent-plan/context/.
Backlog and bugs route to docs/agent-plan/backlog/ and docs/agent-plan/bugs/."
```

---

### Task 4: Add `--migrate` command to `generate.mjs`

**Files:**
- Modify: `scripts/ai-plan/generate.mjs` (add new CLI handler)

This adds the migration command that existing consumer repos use to move their old layout to the new one. All steps are idempotent.

- [ ] **Step 1: Read `generate.mjs` entry point**

Read `scripts/ai-plan/generate.mjs` in full. Understand how existing CLI commands (`--init`, `--doctor`, `--write-scripts`) are handled so the new `--migrate` handler follows the same pattern.

- [ ] **Step 2: Implement `runMigrate(repoRoot)` function**

Add a `runMigrate(repoRoot)` function to `generate.mjs` (or a new `scripts/ai-plan/lib/migrate.mjs` module if the file is large — follow the existing pattern). The function must:

1. **Move `docs/ai-plan/` → `docs/agent-plan/context/`** (idempotent: skip if target exists)
   - Rename `INDEX.md` → `index.md`
   - Rename `CODE_MAP.json` → `code-map.json`
   - Rename `MODULE_MAP.json` → `module-map.json`
   - Rename `scopes/` → `modules/` (the old layout names this directory `scopes/`; contents move unchanged)

2. **Move `docs/specs/` → `docs/agent-plan/specs/`** (skip if target exists)

3. **Move `docs/plans/` → `docs/agent-plan/plans/`** (skip if target exists)

4. **Move `docs/backlog/` → `docs/agent-plan/backlog/`** (skip if target exists)

5. **Move `docs/bugs/` → `docs/agent-plan/bugs/`** (skip if target exists)

6. **Patch cross-references in moved files:**
   - In `docs/agent-plan/context/module-map.json`: replace the `"codeMap"` field value `docs/ai-plan/CODE_MAP.json` → `docs/agent-plan/context/code-map.json`
   - In `docs/agent-plan/context/module-map.json`: rename `"planningScope"` keys to `"planningModule"` and replace their values `docs/ai-plan/scopes/` → `docs/agent-plan/context/modules/` (old repos have the old field name and the `scopes/` directory)
   - In `docs/agent-plan/context/index.md`: replace `docs/ai-plan/` → `docs/agent-plan/context/` (for any links that aren't already relative)
   - In `docs/agent-plan/context/index.md`: replace relative `./scopes/` links → `./modules/` (the directory was renamed in step 1, so old relative links break)
   - Relative links already pointing at `./modules/` need no change

7. **Create `docs/design/`** with a `.gitkeep` file (skip if exists)

8. **Create `docs/use-cases/`** with a `.gitkeep` file (skip if exists)

9. **Create `docs/features.md` stub** (skip if exists):
   ```markdown
   # Features

   | # | Feature | Status | Summary |
   |---|---------|--------|---------|
   <!-- | F1 | Example Feature | planned | Brief description | -->
   ```

10. **Print a summary** of every action taken: moved, created, skipped — with source → destination for moves.

Use Node.js `fs` module (already used by the generator scripts). No new dependencies.

- [ ] **Step 3: Wire `--migrate` into the CLI argument handler**

In the existing CLI argument parsing section of `generate.mjs`, add:
```javascript
if (args.includes('--migrate')) {
  await runMigrate(repoRoot);
  process.exit(0);
}
```

Position it alongside the existing `--init`, `--doctor`, `--write-scripts` checks.

- [ ] **Step 4: Test the migrate command on a mock directory**

Create a temp directory with old-layout structure and run:
```bash
node scripts/ai-plan/generate.mjs --migrate
```
from that directory. Confirm:
- Directories are moved with correct renames
- Cross-references are patched
- `docs/design/`, `docs/use-cases/`, `docs/features.md` are created
- Running again produces "skipped" for everything (idempotency)

- [ ] **Step 5: Verify no regressions**

Run `--doctor` against a normal repo and confirm it still works:
```bash
node scripts/ai-plan/generate.mjs --doctor
```

- [ ] **Step 6: Commit**

```bash
git add scripts/ai-plan/generate.mjs scripts/ai-plan/lib/migrate.mjs
git commit -m "feat(ai-plan): add --migrate command for docs/agent-plan/ layout

Idempotent migration of docs/ai-plan/, docs/specs/, docs/plans/,
docs/backlog/, docs/bugs/ to new docs/agent-plan/ subtree.
Creates docs/design/, docs/use-cases/, docs/features.md stubs."
```

---

### Task 5: Update `using-ai-plan` skill

**Files:**
- Modify: `skills/using-ai-plan/SKILL.md`

- [ ] **Step 1: Read the skill file**

Read `skills/using-ai-plan/SKILL.md` in full.

- [ ] **Step 2: Apply path replacements**

Make these replacements throughout the file:
- `docs/ai-plan/INDEX.md` → `docs/agent-plan/context/index.md`
- `docs/ai-plan/CODE_MAP.json` → `docs/agent-plan/context/code-map.json`
- `docs/ai-plan/MODULE_MAP.json` → `docs/agent-plan/context/module-map.json`
- `docs/ai-plan/scopes/<module-id>.md` → `docs/agent-plan/context/modules/<module-id>.md` (the current skill text says `scopes/` — the rename to `modules/` happens here)
- `docs/ai-plan/scopes/` → `docs/agent-plan/context/modules/`
- `docs/ai-plan/` → `docs/agent-plan/context/` (any remaining)
- `docs/specs/…-design.md` → `docs/agent-plan/specs/…-design.md`
- `docs/specs/` → `docs/agent-plan/specs/`

Also update:
- Line 10: "Outputs live under `docs/ai-plan/`" → "Outputs live under `docs/agent-plan/context/`"
- Line 98: "Generated artifacts live under `docs/ai-plan/`" → "Generated artifacts live under `docs/agent-plan/context/`"
- The **Repo layout** section: update path reference

- [ ] **Step 3: Verify no old paths remain**

```bash
grep -n "docs/ai-plan\|docs/specs/\|context/scopes" skills/using-ai-plan/SKILL.md
```

Should return nothing.

- [ ] **Step 4: Commit**

```bash
git add skills/using-ai-plan/SKILL.md
git commit -m "feat(using-ai-plan): update all paths to docs/agent-plan/context/

Replaces docs/ai-plan/ with docs/agent-plan/context/ and docs/specs/
with docs/agent-plan/specs/ throughout the skill."
```

---

### Task 6: Update `design-spec` skill and supporting files

**Files:**
- Modify: `skills/design-spec/SKILL.md`
- Modify: `skills/design-spec/spec-document-reviewer-prompt.md`
- Modify: `skills/design-spec/references/policy.md`

- [ ] **Step 1: Read all three files**

Read each file in full.

- [ ] **Step 2: Update `SKILL.md` path references**

Apply these replacements:
- `docs/specs/` → `docs/agent-plan/specs/`
- `docs/backlog/` → `docs/agent-plan/backlog/`
- `docs/backlog/{id}/{id}-detail.md` → `docs/agent-plan/backlog/{id}/{id}-detail.md`
- `docs/ai-plan/INDEX.md` → `docs/agent-plan/context/index.md`
- `docs/ai-plan/scopes/{module-id}.md` → `docs/agent-plan/context/modules/{module-id}.md` (Module scope template section)
- `docs/ai-plan/` → `docs/agent-plan/context/`

Also add the third input type (use-case file) to the input chain section. When given a path under `docs/use-cases/`, `design-spec` should:
1. Read the use-case file (summary, process, success criteria)
2. Look up the linked feature row in `docs/features.md`
3. Read `docs/product.md` for product context
4. Carry the use-case success criteria forward as spec acceptance criteria
5. Ask clarifying questions only for gaps not covered by the use-case

The input type detection logic (existing: ad-hoc vs backlog path) needs a third branch:
- If input is a path under `docs/use-cases/`: use-case input flow

- [ ] **Step 3: Update `spec-document-reviewer-prompt.md`**

Find the reference to `docs/specs/` and update to `docs/agent-plan/specs/`.

- [ ] **Step 4: Update `references/policy.md`**

Find the reference to `docs/specs/…-design.md` and update to `docs/agent-plan/specs/…-design.md`.

- [ ] **Step 5: Verify no old paths remain**

```bash
grep -n "docs/specs\|docs/backlog\|docs/ai-plan" skills/design-spec/SKILL.md skills/design-spec/spec-document-reviewer-prompt.md skills/design-spec/references/policy.md
```

Should return nothing.

- [ ] **Step 6: Commit**

```bash
git add skills/design-spec/SKILL.md skills/design-spec/spec-document-reviewer-prompt.md skills/design-spec/references/policy.md
git commit -m "feat(design-spec): update paths to agent-plan; add use-case input type

Specs now saved to docs/agent-plan/specs/, backlog read from
docs/agent-plan/backlog/. Adds use-case file (docs/use-cases/f{n}-u{n}.md)
as a third input type that seeds acceptance criteria from success criteria."
```

---

### Task 7: Update `write-plan` skill

**Files:**
- Modify: `skills/write-plan/SKILL.md`

- [ ] **Step 1: Read the skill file**

Read `skills/write-plan/SKILL.md` in full.

- [ ] **Step 2: Apply path replacements**

- `docs/plans/` → `docs/agent-plan/plans/`
- `docs/ai-plan/INDEX.md` → `docs/agent-plan/context/index.md`
- `docs/ai-plan/scopes/<module-id>.md` → `docs/agent-plan/context/modules/<module-id>.md` (the current skill text says `scopes/`)
- `docs/ai-plan/` → `docs/agent-plan/context/`
- `docs/specs/` → `docs/agent-plan/specs/`

- [ ] **Step 3: Verify no old paths remain**

```bash
grep -n "docs/plans\|docs/ai-plan\|docs/specs" skills/write-plan/SKILL.md
```

Should return nothing.

- [ ] **Step 4: Commit**

```bash
git add skills/write-plan/SKILL.md
git commit -m "feat(write-plan): update paths to docs/agent-plan/

Plans now saved to docs/agent-plan/plans/, planning context read from
docs/agent-plan/context/."
```

---

### Task 8: Update `add-backlog` skill

**Files:**
- Modify: `skills/add-backlog/SKILL.md`

- [ ] **Step 1: Read the skill file**

Read `skills/add-backlog/SKILL.md` in full.

- [ ] **Step 2: Apply path replacements**

- `docs/backlog/` → `docs/agent-plan/backlog/`
- All example paths: `docs/backlog/2026.04.24-102847-…` → `docs/agent-plan/backlog/2026.04.24-102847-…`
- Reference to `docs/specs/` (handoff instruction) → `docs/agent-plan/specs/`

- [ ] **Step 3: Verify no old paths remain**

```bash
grep -n "docs/backlog\|docs/specs" skills/add-backlog/SKILL.md
```

Should return nothing.

- [ ] **Step 4: Commit**

```bash
git add skills/add-backlog/SKILL.md
git commit -m "feat(add-backlog): update paths to docs/agent-plan/backlog/

Backlog items now created under docs/agent-plan/backlog/."
```

---

### Task 9: Update `fix-bug` skill cluster

**Files:**
- Modify: `skills/fix-bug-log/SKILL.md`
- Modify: `skills/fix-bug/SKILL.md`
- Modify: `skills/fix-bug/checklists/lifecycle-checklist.md`
- Modify: `skills/fix-bug/references/policy.md`
- Modify: `skills/fix-bug/templates/fix-bug-summary-template.md`
- Modify: `skills/fix-bug-resolve/SKILL.md`
- Modify: `skills/fix-bug-complete/SKILL.md`

- [ ] **Step 1: Read all seven files**

Read each file in full.

- [ ] **Step 2: Update `fix-bug-log/SKILL.md`**

- Description: `docs/bugs/` → `docs/agent-plan/bugs/`
- All `docs/bugs/{bug_id}/` → `docs/agent-plan/bugs/{bug_id}/`
- All `docs/bugs/{bug_id}/{bug_id}-detail.md` → `docs/agent-plan/bugs/{bug_id}/{bug_id}-detail.md`

- [ ] **Step 3: Update `fix-bug/SKILL.md`**

- All `docs/bugs/` references → `docs/agent-plan/bugs/`

- [ ] **Step 4: Update `fix-bug/checklists/lifecycle-checklist.md`**

- `docs/bugs/{bug_id}/{bug_id}-detail.md` → `docs/agent-plan/bugs/{bug_id}/{bug_id}-detail.md`
- `docs/bugs/{bug_id}/{bug_id}-resolution.md` → `docs/agent-plan/bugs/{bug_id}/{bug_id}-resolution.md`

- [ ] **Step 5: Update `fix-bug/references/policy.md`**

- `docs/bugs/{bug_id}/` → `docs/agent-plan/bugs/{bug_id}/`

- [ ] **Step 6: Update `fix-bug/templates/fix-bug-summary-template.md`**

- `docs/bugs/{bug_id}/{bug_id}-detail.md` → `docs/agent-plan/bugs/{bug_id}/{bug_id}-detail.md`
- `docs/bugs/{bug_id}/{bug_id}-resolution.md` → `docs/agent-plan/bugs/{bug_id}/{bug_id}-resolution.md`

- [ ] **Step 7: Update `fix-bug-resolve/SKILL.md`**

- All `docs/bugs/` references → `docs/agent-plan/bugs/`

- [ ] **Step 8: Update `fix-bug-complete/SKILL.md`**

- All `docs/bugs/` references → `docs/agent-plan/bugs/`

- [ ] **Step 9: Grep for remaining old paths across the entire fix-bug cluster**

```bash
grep -rn "docs/bugs" skills/fix-bug/ skills/fix-bug-log/ skills/fix-bug-resolve/ skills/fix-bug-complete/
```

Should return nothing.

- [ ] **Step 10: Commit**

```bash
git add skills/fix-bug-log/SKILL.md skills/fix-bug/SKILL.md skills/fix-bug/checklists/lifecycle-checklist.md skills/fix-bug/references/policy.md skills/fix-bug/templates/fix-bug-summary-template.md skills/fix-bug-resolve/SKILL.md skills/fix-bug-complete/SKILL.md
git commit -m "feat(fix-bug): update all paths to docs/agent-plan/bugs/

Bug reports and resolutions now written to and read from
docs/agent-plan/bugs/ across the full fix-bug skill cluster."
```

---

### Task 10: Update bootstrap templates

**Files:**
- Modify: files under `scripts/bootstrap-templates/`

- [ ] **Step 1: List and read all bootstrap template files**

```bash
find scripts/bootstrap-templates/ -type f | sort
```

Read each file that contains path references to old paths.

- [ ] **Step 2: Grep for old paths**

```bash
grep -rn "docs/ai-plan\|docs/specs\|docs/plans\|docs/backlog\|docs/bugs" scripts/bootstrap-templates/
```

- [ ] **Step 3: Apply replacements in each affected file**

For each file found:
- `docs/ai-plan/scopes/` → `docs/agent-plan/context/modules/` (apply before the catch-all below so `scopes` doesn't survive)
- `docs/ai-plan/` → `docs/agent-plan/context/` (any remaining)
- `docs/specs/` → `docs/agent-plan/specs/`
- `docs/plans/` → `docs/agent-plan/plans/`
- `docs/backlog/` → `docs/agent-plan/backlog/`
- `docs/bugs/` → `docs/agent-plan/bugs/`

- [ ] **Step 4: Verify no old paths remain**

```bash
grep -rn "docs/ai-plan\|docs/specs/\|docs/plans/\|docs/backlog/\|docs/bugs/" scripts/bootstrap-templates/
```

Should return nothing.

- [ ] **Step 5: Commit**

```bash
git add scripts/bootstrap-templates/
git commit -m "feat(bootstrap-templates): update path references to docs/agent-plan/

Generated AGENTS.md stubs now reference new docs/agent-plan/ layout."
```

---

### Task 11: Final verification

**Files:**
- Read: all changed files for spot-check

- [ ] **Step 1: Full grep for any remaining old paths**

```bash
grep -rn "docs/ai-plan\|docs/specs/\|docs/plans/\|docs/backlog/\|docs/bugs/\|context/scopes" \
  standards/ scripts/ skills/
```

Investigate any remaining hits. Exceptions (files that legitimately reference old paths):
- `docs/specs/2026-06-11-dev-tools-directory-reorganization-design.md` — this IS the spec for this change, its content describing old paths is intentional
- This plan file itself (`docs/plans/2026-06-11-directory-reorganization.md`)
- Git history / CHANGELOG (if any)

Fix anything else found.

- [ ] **Step 2: Run doctor on the worktree**

```bash
node scripts/ai-plan/generate.mjs --doctor
```

Confirm it passes with the updated paths.

- [ ] **Step 3: Regenerate code map and module graph with new paths**

```bash
node scripts/code-map/generate-code-map.mjs
node scripts/ai-plan/generate.mjs
```

Confirm output goes to `docs/agent-plan/context/code-map.json` and `docs/agent-plan/context/index.md`, and module files land in `docs/agent-plan/context/modules/` (not `context/scopes/`).

- [ ] **Step 4: Spot-check key skill files**

Read one section from each updated skill to confirm changes are coherent:
- `skills/using-ai-plan/SKILL.md` — check the L1 table row
- `skills/design-spec/SKILL.md` — check the output path and third input type
- `skills/add-backlog/SKILL.md` — check the file creation path
- `skills/fix-bug-log/SKILL.md` — check the output path

- [ ] **Step 5: Verify git log**

```bash
git log --oneline
```

Should show one commit per task (10+ commits), each with a clear message matching the spec changes.

- [ ] **Step 6: Final commit if any cleanup needed**

If step 1 found remaining old paths and they were fixed:
```bash
git add -p
git commit -m "fix(directory-reorg): remaining old path cleanup

Addresses any docs/ai-plan or docs/specs/bugs/plans/backlog references
missed in tasks 2–10."
```
