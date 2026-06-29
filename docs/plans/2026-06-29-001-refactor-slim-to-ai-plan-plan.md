---
title: "refactor: Slim dev-tools to the ai-plan / code-map subsystem"
date: 2026-06-29
deepened: 2026-06-29
type: refactor
depth: deep
status: ready
---

# refactor: Slim dev-tools to the ai-plan / code-map subsystem

## Summary

Reduce the dev-tools plugin to a single product: the **ai-plan / code-map** subsystem that
generates a code map, a module map, and per-module architecture explanations. Delete every
other feature surface (≈25 skills, the ralph/test-gate commands, the `code-reviewer` agent,
all hooks, the entire `standards/` bundle) and the repo dev-infrastructure that only served
them (test-gate/ralph/version scripts, their tests, the git pre-push gate). Keep the retained
feature working across **all five harnesses** (Claude Code, Cursor, Codex, OpenCode, Gemini) by
trimming each harness adapter down to the ai-plan surface. Repair every dangling reference the
deletion creates, then regenerate the ai-plan context as the closing verification that the
subsystem still works on its own repo.

This is a deletion-and-repair plan, not a feature build. The risk is not in the deletes
(the retained code imports only `scripts/lib/`, which is self-contained) — it is in the
**dangling references** the deletes leave behind in packaging manifests, the retained skill,
the bootstrap templates, and the docs. Those are enumerated per unit below.

**Plus a second goal: simplify what remains.** Beyond eliminating features, the slimmed repo
should read as a small, single-product repo — so the plan also removes dead docs scaffolding and
rebuilds the docs index around the one product (U7). A deliberate line is drawn between
*accidental* duplication (cleaned up) and *load-bearing* structure that only looks redundant
(kept, and documented — see KTD-7): the dual `AGENTS.md`/`CLAUDE.md` files, the five harness
adapter directories, and the `scripts/{ai-plan,code-map,lib}` split are all intentional and stay.

---

## Problem Frame

The plugin currently ships a broad workflow suite (TDD, debugging, design-spec, write-plan,
execute-plan, fix-bug, code review, worktrees, product planning, ralph loops, a polyglot
test-gate) **plus** the ai-plan/code-map graph generator **plus** a large `standards/` bundle.
The goal is to keep only the ai-plan/code-map subsystem and ship a small, cohesive plugin.

**Confirmed scope decisions (from planning dialogue):**
- **Harness scope:** keep all five harnesses, each trimmed to only reference ai-plan.
- **Standards:** delete the entire `standards/` tree; fix the one soft reference into it.
- **Repo tooling:** strip CI/test/version/ralph/test-gate infrastructure down to what covers
  ai-plan/code-map only.
- **Repo organization:** beyond deletion, simplify the remaining structure — remove dead docs
  scaffolding and rebuild a single-product docs index (U7) — without churning load-bearing
  structure (KTD-7).

**Non-goals:** No behavior change to ai-plan or code-map generation. No rename of the plugin,
command, or skill. No rewrite of historical `CHANGELOG.md` / `RELEASE-NOTES.md` entries (history
stays; a new entry is appended). No touching `docs/agent-plan/{plans,specs,bugs}/` historical
artifacts beyond what regeneration overwrites.

---

## Retained vs. Removed (authoritative inventory)

**RETAINED (the product):**

| Path | Role |
|------|------|
| `scripts/code-map/` | Generates `code-map.json` (symbol + endpoint index) |
| `scripts/ai-plan/` | Generates `module-map.json`, `modules/<id>.md` explanations, `index.md` |
| `scripts/lib/` | Shared utilities; sole shared dependency of both generators |
| `scripts/bootstrap-templates/` | Docs templates copied on `--init` (edited, not deleted) |
| `commands/ai-plan.md` | The `/ai-plan` command |
| `skills/using-ai-plan/` | Canonical agent workflow skill (edited to stand alone) |
| `code-map.config.json`, `*.config.example.json` | Config |
| `package.json`, `package-lock.json`, `node_modules/@ast-grep/cli` | The one dependency |
| `.claude-plugin/`, `.cursor-plugin/`, `.codex/`, `.opencode/`, `gemini-extension.json` | Harness adapters (trimmed) |
| `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` | Agent-instruction files (edited / repointed) |
| `test/ai-plan*`, `test/code-map/` | Retained test coverage |

**REMOVED:**

| Path | Why |
|------|-----|
| `skills/*` except `using-ai-plan/` (incl. `_shared/`, `using-dev-tools/`) | Non-ai-plan features |
| `commands/{cancel-ralph,ralph-help,ralph-loop,setup-test-gate}.md` | Ralph / test-gate |
| `agents/` (`code-reviewer.md`) | Code-review feature |
| `hooks/` (entire dir) | SessionStart injects `using-dev-tools`; Stop is ralph; TaskCreated cites removed skills |
| `standards/` (entire tree) + `manifest.json` | Standards bundle + its registry |
| `scripts/{test-gate/,setup-test-gate.mjs,setup-ralph-loop.sh,setup-git-hooks.sh,bump-version.sh,version-files.mjs}` | Repo infra for removed features |
| `.githooks/pre-push`, `.version-bump.json` | Pre-push gate calls deleted `bump-version.sh`; version-bump config |
| `test/*` except `ai-plan*` / `code-map/` | Tests for removed features |
| `docs/standards.md`, `docs/guides/windows/polyglot-hooks.md` | Doc for removed features |

> **Verify-before-delete note:** confirm `scripts/lib/` has no consumer outside the two
> generators (research found none), and confirm `.githooks/` contains only `pre-push` before
> removing the directory.

---

## Key Technical Decisions

**KTD-1 — Delete `hooks/` entirely rather than retrain the TaskCreated hook.**
All three hooks serve removed features: `SessionStart` injects the `using-dev-tools` skill,
`Stop` is the ralph-loop continuation gate, and `TaskCreated` cites `design-spec`/`write-plan`/
`execute-plan`. The TaskCreated hook *does* nudge toward ai-plan progressive disclosure, so a
trimmed version is conceivable — but a hook that fires an agent on every task is heavyweight for
a tool whose entrypoint is a manual command. Default to full removal; the `/ai-plan` command and
`using-ai-plan` skill remain the entrypoints. (See Open Questions if you want to preserve a
trimmed disclosure hook.)

**KTD-2 — Delete `manifest.json`, don't empty it.** It is purely a `standards/` registry
(~40 entries, no skill/command/ai-plan content). With `standards/` gone it has no purpose.

**KTD-3 — Repoint `GEMINI.md`, don't delete it.** `gemini-extension.json` declares
`contextFileName: GEMINI.md`, so the file must exist. It currently `@import`s the deleted
`using-dev-tools` skill. Repoint it to `@./AGENTS.md` (the retained project-notes file) so Gemini
loads valid context.

**KTD-4 — Keep `CHANGELOG.md` / `RELEASE-NOTES.md` history intact; append a new entry.**
Historical entries documenting removed features are a true record and should not be rewritten.
Add one new entry describing this slim-down (a major/breaking version bump is warranted).

**KTD-5 — Regeneration is the closing acceptance test.** The ai-plan module-map auto-block in
`AGENTS.md`/`CLAUDE.md` currently lists `hooks`, `scripts-test-gate`, `skills (4 files)`, etc.
Running `generate.mjs` after the deletes must produce a module map containing only
`scripts-ai-plan`, `scripts-code-map`, `scripts-lib`, the trimmed `skills`, and `test`. A clean
regen proves the subsystem still self-hosts.

**KTD-6 — `using-ai-plan` is repositioned as standalone.** Today it documents integration with
`design-spec`/`write-plan`/`execute-plan` and references `standards/project-structure.md`. The
rewrite removes the related-skills table and the cross-skill enforcement framing, and inlines the
one fact it needs from `project-structure.md` (the `docs/agent-plan/context/` artifact layout).

**KTD-7 — Keep the `AGENTS.md` / `CLAUDE.md` duality; do NOT dedup via `@import`.**
The two files hold identical content by design: Claude Code reads `CLAUDE.md`, the other four
harnesses read `AGENTS.md`, and `scripts/ai-plan/lib/embed.mjs` writes the auto-generated
module-map block into *both* (loop over `['CLAUDE.md', 'AGENTS.md']`); `bootstrap.mjs` seeds both
and `doctor.mjs` checks both. Collapsing them to a single source via `@import` would either
require changing the ai-plan generator's write targets (a product-behavior change affecting every
consumer repo, out of scope) or a local hack that the generator would clobber on the next regen.
The duplication is load-bearing cross-harness support, not accidental sprawl — keep it. Same
reasoning retires three other tempting "simplifications": the five harness adapter directories and
the `scripts/{ai-plan,code-map,lib}` split are required/path-referenced locations, so reorganizing
them ripples through every manifest and doc for no real gain.

---

## Output Structure (target repo shape after slim-down)

```text
dev-tools/
├── .claude-plugin/plugin.json        # trimmed: drop agents/hooks keys
├── .cursor-plugin/plugin.json        # trimmed: drop agents/hooks keys
├── .codex/INSTALL.md
├── .opencode/
│   ├── INSTALL.md
│   └── plugins/dev-tools.js          # trimmed: drop using-dev-tools bootstrap injection
├── .github/                          # FUNDING.yml + ISSUE_TEMPLATE (kept; no workflows exist)
├── AGENTS.md  CLAUDE.md              # trimmed; module-map block regenerated
├── GEMINI.md                         # repointed to @./AGENTS.md
├── gemini-extension.json
├── README.md  CHANGELOG.md  RELEASE-NOTES.md  LICENSE
├── package.json  package-lock.json  node_modules/@ast-grep/cli
├── code-map.config.json
├── commands/ai-plan.md
├── skills/using-ai-plan/             # only surviving skill (rewritten standalone)
├── scripts/
│   ├── ai-plan/
│   ├── code-map/
│   ├── lib/
│   └── bootstrap-templates/          # CLAUDE.md / AGENTS.md edited
├── docs/                             # see below — dead scaffolding removed, index rebuilt (U7)
│   ├── README.md                     # rebuilt as single-product index
│   ├── product.md  roadmap.md  tech-stack.md  features.md   # kept: ai-plan bootstrap outputs (dogfooded)
│   ├── testing.md                    # trimmed to retained suites
│   └── agent-plan/
│       ├── context/                  # regenerated (U6)
│       └── {plans,specs,bugs}/       # historical artifacts, left as-is
│   # removed by U7: standards.md, design/, use-cases/, guides/ (empty after polyglot-hooks.md removal)
└── test/
    ├── ai-plan*/  ai-plan-adapters/  ai-plan-endpoints.test.mjs
    └── code-map/
```

The tree is a scope declaration of the expected end shape, not a constraint — per-unit `Files`
sections are authoritative.

---

## Implementation Units

### U1. Delete non-ai-plan feature directories

**Goal:** Remove every feature surface except the retained ai-plan/code-map set.

**Dependencies:** none (do first).

**Files (delete):**
- `skills/` — all subdirectories **except** `skills/using-ai-plan/`. Explicitly includes
  `skills/_shared/`, `skills/using-dev-tools/`, `skills/execute-plan*`, `skills/fix-bug*`,
  `skills/design-spec/`, `skills/write-plan/`, `skills/plan-product/`,
  `skills/test-driven-development/`, `skills/systematic-debugging/`,
  `skills/requesting-code-review/`, `skills/receiving-code-review/`, `skills/merge-pr/`,
  `skills/dispatching-parallel-agents/`, `skills/align-project-structure/`,
  `skills/add-backlog/`, `skills/add-bug/`, `skills/verification-before-completion/`,
  `skills/writing-skills/`, `skills/using-core-standards/`, `skills/using-*-standards/`,
  `skills/using-git-worktrees/`.
- `commands/cancel-ralph.md`, `commands/ralph-help.md`, `commands/ralph-loop.md`,
  `commands/setup-test-gate.md`.
- `agents/` (entire dir; `code-reviewer.md`).
- `hooks/` (entire dir; see KTD-1).
- `standards/` (entire tree) and `manifest.json` (see KTD-2).

**Approach:** Pure deletion. After deleting, grep the retained code (`scripts/`,
`skills/using-ai-plan/`) for imports into any deleted path to confirm zero code-level breakage
(research found `scripts/lib/` is the only shared dep and it is self-contained).

**Verification:** `skills/` contains only `using-ai-plan/`; `commands/` contains only
`ai-plan.md`; `agents/`, `hooks/`, `standards/`, `manifest.json` are gone. `node
scripts/code-map/generate-code-map.mjs` and `node scripts/ai-plan/generate.mjs` both still run
without import errors (full regen happens in U6).

**Test expectation: none** — pure deletion of non-retained code; covered by U6 regen + retained suite.

---

### U2. Delete repo dev-infrastructure and prune the test suite

**Goal:** Remove scripts, git hooks, and tests that only supported the deleted features.

**Dependencies:** U1 (delete the features before their infra).

**Files (delete):**
- `scripts/test-gate/`, `scripts/setup-test-gate.mjs`, `scripts/setup-ralph-loop.sh`,
  `scripts/setup-git-hooks.sh`, `scripts/bump-version.sh`, `scripts/version-files.mjs`.
- `.githooks/pre-push` (calls deleted `bump-version.sh`); remove `.githooks/` if `pre-push` is
  its only file (confirm first).
- `.version-bump.json` (version-bump config for removed flow).
- Test directories/files for removed features: `test/add-bug-entrypoint/`, `test/claude-code/`,
  `test/design-spec-server/`, `test/execute-plan-dev/`, `test/explicit-skill-requests/`,
  `test/fix-bug-routing/`, `test/merge-pr-internal/`, `test/opencode/`,
  `test/receiving-code-review-workflow/`, `test/skill-metadata/`, `test/skills/`,
  `test/skill-triggering/`, `test/stop-hook/`, `test/systematic-debugging-internal/`,
  `test/test-gate/`, `test/version-hooks/`.
- **Orphan top-level test runners** `test/run-all.sh` and `test/run-eval-suite.sh` — both
  hard-code deleted suites (`test/claude-code`, `test/skill-triggering`, `test/design-spec-server`,
  `test/opencode`, …) and would break. Delete them, or rewrite into a runner that invokes only the
  retained `test/ai-plan*` / `test/code-map/` suites (see Verification). `docs/testing.md` points at
  `./test/run-all.sh`, so coordinate with U5.

**Files (retain — do not delete):** `test/ai-plan/`, `test/ai-plan-adapters/`,
`test/ai-plan-endpoints.test.mjs`, `test/code-map/`.

> **Caveat — the retained suite does NOT pass unchanged (adversarial finding).**
> `test/ai-plan/enforcement.test.mjs` is in the retained set but `readFileSync`s three now-deleted
> files at module load (`skills/write-plan/SKILL.md`, `skills/execute-plan/SKILL.md`,
> `hooks/hooks.json`) and asserts on the cross-skill enforcement framing that KTD-6/U4 removes — so
> it crashes the run, not merely fails an assertion. **U4 owns the decision to delete it or gut it
> down to the two `using-ai-plan` assertions.** The "regression gate" only holds *after* that fix.
> (Also note: `test/ai-plan/config-test-field.test.mjs` exercises the `test` config field, which
> becomes vestigial once test-gate is gone — dead but non-breaking; leave it unless U4 drops the
> `test` config block.)

**Approach:** Deletion. `package.json` currently has **no `scripts` block** (verified), so there is
no npm-script audit to do — but if the README's advertised `npm run ai-plan` is ever wired up it
must point only at retained generators. Also scrub `.gitattributes` lines for deleted paths
(`.githooks/*`, `hooks/session-start`). If `core.hooksPath` was set to `.githooks`, unset it
(`git config --unset core.hooksPath`) since the hook dir is gone.

**Verification:** `test/` contains only the four retained ai-plan/code-map paths plus (optionally) a
retained-suite runner. The retained suite (`node --test test/ai-plan/**/*.test.mjs
test/ai-plan-adapters/**/*.test.mjs test/ai-plan-endpoints.test.mjs test/code-map/**/*.test.mjs`)
runs green **after** the U4 `enforcement.test.mjs` fix. `.gitattributes` names no deleted path.
`git config core.hooksPath` is unset or no longer points at `.githooks`.

**Test expectation:** the retained `test/ai-plan*` and `test/code-map/` suites are the regression
gate for this plan — they pass green **after** U4 resolves `enforcement.test.mjs` (they do NOT pass
unchanged; see Caveat).

---

### U3. Deregister deleted surfaces from harness packaging

**Goal:** Trim each harness adapter so it advertises only the ai-plan surface and has no dangling
directory/skill references.

**Dependencies:** U1, U2.

**Files (edit):**
- `.claude-plugin/plugin.json` — **no key removal needed** (adversarial finding: this file has
  only name/version/description/author/repository/license/keywords; Claude Code discovers
  `skills/`, `commands/`, `agents/`, `hooks/hooks.json` by directory convention). Only edit
  `description`/`keywords` to drop removed-feature terms (tdd, debugging, design-spec, execute-plan,
  fix-bug, standards, worktrees) and reflect ai-plan/code-map scope.
- `.cursor-plugin/plugin.json` — this is the file that actually carries the keys: remove `agents`
  (`"./agents/"`) and `hooks` (`"./hooks/hooks-cursor.json"`); keep `skills`/`commands` directory
  refs (they resolve to the trimmed set); update `description`/`keywords`. Validate JSON.
- `.opencode/plugins/dev-tools.js` — remove the **entire** `experimental.chat.messages.transform`
  block (it reads the deleted `skills/using-dev-tools/SKILL.md` via `getBootstrapContent`), not just
  the function: the transform body references `getBootstrapContent()` in three places, so deleting
  only the function leaves a `ReferenceError` and breaks plugin load. Keep the `config` hook that
  registers the skills directory. `extractAndStripFrontmatter`/`normalizePath` may then be dead but
  are harmless valid JS.
- `code-map.config.json` — drop `"hooks"` (and any other deleted root) from its `roots` array
  (`["scripts","hooks","skills",".opencode"]`); `generate-code-map.mjs` walks each root and U6's
  regen would otherwise scan a non-existent `hooks/`.
- `gemini-extension.json` — keep as-is (declares `contextFileName: GEMINI.md`); verify it
  references no deleted path.
- `GEMINI.md` — repoint from `@./skills/using-dev-tools/...` (two `@import` lines) to `@./AGENTS.md`
  (KTD-3).
- `AGENTS.md` and `CLAUDE.md` — remove the "Skill changes shape agent behavior" section (cites
  `writing-skills`); update the "Plugin repo layout" / "Bundled first-party content" prose to drop
  `standards`/`hooks`/`skills`-suite framing and describe the slimmed plugin. Leave the
  `<!-- ai-plan:module-map -->` block in place; it is overwritten in U6.

**Approach:** Surgical edits. `.cursor-plugin/plugin.json` and `.opencode/plugins/dev-tools.js` are
the highest-risk (a dangling `hooks`/`agents` key or a `ReferenceError` breaks plugin load).
Validate JSON / load-test after editing.

**Verification:** Both `plugin.json` files parse as valid JSON and contain no key pointing at a
deleted path. `.opencode/plugins/dev-tools.js` no longer references `using-dev-tools` or
`getBootstrapContent` and is valid JS. `code-map.config.json` `roots` lists only existing dirs.
`GEMINI.md` points only at existing files. `grep -rn "using-dev-tools\|writing-skills\|test-gate\|ralph\|hooks/hooks" .claude-plugin .cursor-plugin .opencode gemini-extension.json code-map.config.json GEMINI.md AGENTS.md CLAUDE.md`
returns nothing.

**Test scenarios:**
- Each harness adapter JSON parses and validates (no trailing dangling keys).
- A grep for any removed skill/command/agent/hook name across the adapter files returns empty.

---

### U4. Repair the retained skill, generator output, and bootstrap templates

**Goal:** Make `using-ai-plan`, the `/ai-plan` command, the bootstrap templates, **and the
generator code that emits guidance strings** self-contained — no references into deleted skills or
`standards/`, whether in static docs or in strings emitted into consumer repos.

**Dependencies:** U1 (targets reference now-deleted skills).

**Files (edit):**
- `skills/using-ai-plan/SKILL.md` — remove the "Related Skills" table and any "When to Use"
  references to `write-plan`/`design-spec`/`plan-product`; remove cross-skill enforcement framing
  that assumes `design-spec`/`write-plan`/`execute-plan` exist; **delete the `hooks/hooks.json`
  mention on line 8** (adversarial finding — the U4 grep gate previously missed it). Replace the
  `standards/project-structure.md` reference (artifact-layout fact) with an inline statement that
  generated artifacts live under `docs/agent-plan/context/`. Keep the `.cursor/rules/ai-plan.mdc`
  reference on line 8 — that is a consumer-repo artifact the generator produces, not dangling.
  Reposition the skill as a standalone code/module-graph tool (KTD-6).
- **`scripts/ai-plan/lib/render.mjs` (generator code — adversarial finding, was missed)** — this
  emits broken guidance into *every consumer repo* and into this repo's own U6 regen:
  - line ~235: `(mirrors module layout per standards/project-structure.md)` → drop or reword the
    `standards/` citation.
  - line ~68: `**Product docs (not present — run plan-product):**` → remove the deleted
    `plan-product` skill name (e.g., "run the ai-plan bootstrap" / "add the product docs").
- `scripts/ai-plan/ai-plan.config.example.json` — scrub the `test` block `_comment` that cites the
  deleted `scripts/setup-test-gate.mjs` and "finish workflow"; decide whether to keep the `test`
  config field at all (it is now vestigial — see U2 caveat).
- `scripts/bootstrap-templates/AGENTS.md` — remove `execute-plan`/`fix-bug`/`design-spec`/
  `write-plan` references and workflow-orchestration language; keep `using-ai-plan` + the
  product/roadmap/tech-stack doc references; reconcile the "Specs" section so it no longer assumes
  a `design-spec` skill.
- `scripts/bootstrap-templates/CLAUDE.md` — same edits as the template AGENTS.md.
- **`test/ai-plan/enforcement.test.mjs` (P0 — adversarial finding)** — currently `readFileSync`s
  `skills/write-plan/SKILL.md`, `skills/execute-plan/SKILL.md`, and `hooks/hooks.json` at module
  load (lines 13–15) and asserts on cross-skill enforcement language (lines 29–51) that this very
  unit removes. **Decision required:** delete the test, or gut it to only the two `using-ai-plan`
  assertions (lines 17–27) and drop the deleted-file reads and the hook/enforcement assertions.
  Without this, the suite crashes (see U2 caveat) and U6 verification cannot pass.
- `commands/ai-plan.md` — verify its "Invoke dev-tools:using-ai-plan first" line is still valid
  (it is, since the skill is retained and now standalone); no other edit expected.

**Approach:** Content + generator rewrite. The `using-ai-plan` SKILL.md is the most substantial
prose edit — it must read coherently as a standalone tool, not a workflow stage. Preserve the L0–L3
progressive disclosure rules, module-scope selection, and staleness guidance (ai-plan's own
behavior). The `render.mjs` edits are surgical string changes — do not alter the rendering logic.

**Verification:** Expanded grep gate (now includes `hooks` and `setup-test-gate`):
`grep -rn "design-spec\|write-plan\|execute-plan\|fix-bug\|plan-product\|standards/\|hooks/hooks\|setup-test-gate" skills/using-ai-plan/ scripts/ai-plan/lib/render.mjs scripts/ai-plan/ai-plan.config.example.json scripts/bootstrap-templates/ commands/ai-plan.md`
returns nothing. The skill reads coherently end-to-end with no orphaned section headers or table
stubs. `enforcement.test.mjs` either no longer exists or loads and passes against the slimmed repo.

**Test scenarios:**
- `test/ai-plan/module-scope-render.test.mjs` passes after the SKILL.md edits (confirm whether it
  asserts on any removed-skill content and update assertions if so).
- `test/ai-plan/enforcement.test.mjs` (if retained in gutted form) loads with no `ENOENT` and its
  remaining `using-ai-plan` assertions pass; if deleted, it is removed from U6's run command.
- Module-doc render output for a module with test roots no longer contains
  `standards/project-structure.md` (covers the `render.mjs:235` fix) — observable in U6's regenerated
  `docs/agent-plan/context/modules/*.md`.
- Expanded grep gate returns empty across the retained skill, generator, templates, and command.

---

### U5. Rescope top-level and product documentation (content)

**Goal:** Bring the *content* of retained user-facing docs in line with the slimmed scope.
(Structural removals and the docs index rebuild are U7.)

**Dependencies:** U1, U2 (docs describe what now exists).

**Files (edit):**
- `README.md` (edit) — rewrite the overview/workflow sections (currently
  "design-spec → write-plan → execute-plan → PR", ralph-loop docs, standards docs) to describe the
  ai-plan/code-map product only: what it generates, install, `/ai-plan`, config, the L0–L3
  workflow. This is the largest doc edit. **Constraints (adversarial findings):**
  - **Preserve the `### Codex` and `### OpenCode` heading anchors** — `.codex/INSTALL.md:5` and
    `.opencode/INSTALL.md:5` deep-link to `README.md#codex` / `README.md#opencode`; a wholesale
    rewrite must keep those headings (or U3 must update the two INSTALL links).
  - **Drop the links to `docs/standards.md` (README ~L260) and `docs/features.md` (README ~L262)** —
    both files are deleted by U7; do not recreate the links.
  - Do **not** re-advertise `npm run ai-plan` unless a `scripts` block is actually added — there is
    none today, so prefer the explicit `node "${PLUGIN_ROOT}/scripts/ai-plan/generate.mjs"` form.
- `docs/testing.md` (edit) — scope to the retained `test/ai-plan*` / `test/code-map/` suites and
  their run commands; drop references to deleted test dirs **and to `./test/run-all.sh`** (deleted
  in U2); point at whatever retained-suite runner U2 leaves (or the direct `node --test` command).
- `docs/product.md`, `docs/roadmap.md` (edit) — narrow the described feature set to
  ai-plan/code-map. These also feed ai-plan's own generation in U6, so keep them accurate.
- `docs/tech-stack.md` (edit only if it lists removed-feature tooling).
- `CHANGELOG.md` / `RELEASE-NOTES.md` (append) — add one entry for the slim-down and the version
  bump; do not rewrite historical entries (KTD-4).

**Approach:** Documentation pass. Historical `docs/agent-plan/{plans,specs,bugs}/` artifacts are
left as-is (dated history; some reference removed skills, acceptable for an archive). Only
`docs/agent-plan/context/` changes, via U6 regeneration.

**Verification:** `README.md` describes only the ai-plan/code-map product with no removed-feature
workflow sections. A new CHANGELOG entry exists. `product.md`/`roadmap.md`/`tech-stack.md` describe
the slimmed product (and stay valid as ai-plan inputs).

**Test expectation: none** — documentation only; correctness is reviewer-judged. Run a grep check
for removed-feature names in `README.md` and the retained `docs/*.md` (excluding `docs/agent-plan/`
history and `CHANGELOG.md`/`RELEASE-NOTES.md`).

---

### U7. Simplify the remaining repo structure

**Goal:** Make the slimmed repo read as a small single-product repo: remove dead docs scaffolding
and rebuild the docs index around the one product. (Distinct from U5, which rewrites doc *content*;
this unit changes which doc files *exist* and how they are indexed.)

**Dependencies:** U1, U2 (deletes done so the index reflects reality).

**Files (delete):**
- `docs/standards.md` — documents the removed `standards/` bundle.
- `docs/guides/windows/polyglot-hooks.md`, then `docs/guides/` and `docs/guides/windows/` if empty
  — guide for the removed hooks system.
- `docs/design/.gitkeep`, `docs/use-cases/.gitkeep` (and the now-empty `docs/design/`,
  `docs/use-cases/` dirs) — empty placeholder scaffolding not part of ai-plan's bootstrap output.

**Files (keep — rationale corrected by adversarial finding):**
- `docs/features.md` — **keep.** Although it is an empty template here, `scripts/ai-plan/lib/
  bootstrap.mjs` seeds `docs/features.md` into every consumer repo and `migrate.mjs` re-creates it,
  so it is a *dogfooded bootstrap output*, not dead scaffolding. Deleting this repo's own copy would
  make dev-tools stop dogfooding its own bootstrap. Leave it in place (U5 may narrow its content).
  This corrects the earlier "dead scaffolding" rationale.

**Files (edit):**
- `docs/README.md` (rebuild) — recompose as a clean single-product index: drop the rows for the
  deleted `standards.md` and `polyglot-hooks.md`; keep `product.md`, `roadmap.md`, `tech-stack.md`,
  `features.md`, `testing.md`, and the `agent-plan/{context,plans,specs}` pointers; fix the opening
  line that references `standards/project-structure.md` for the doc layout.

**Approach:** Structural cleanup only — no new abstractions, no moving load-bearing dirs (KTD-7
governs what stays). Keep `scripts/` layout, the five harness adapters, and the `AGENTS.md`/
`CLAUDE.md` pair untouched. Optionally add a short "Harness adapters" table to `docs/README.md` or
`README.md` so the multi-runtime layout (`.claude-plugin`, `.cursor-plugin`, `.codex`, `.opencode`,
`gemini-extension.json`) is legible at a glance — this is the main remaining root-level complexity.

**Verification:** `docs/` contains no empty placeholder dirs and no doc for a removed feature.
`docs/README.md` links only to files that exist (`grep`-check every linked path resolves). `find docs -name .gitkeep`
and `find docs/guides -type f` return nothing.

**Test expectation: none** — structural/documentation only; verified by the link-resolution and
empty-dir checks above.

---

### U6. Regenerate ai-plan context and verify end-to-end

**Goal:** Prove the slimmed subsystem still self-hosts: regenerate the code map, module map, and
module explanations for this repo, and run the retained tests green.

**Dependencies:** U1–U5 and U7 (regenerate against the final tree, after all deletes and doc
restructuring). This is the last unit to run despite the lower-numbered U7 preceding it logically.

**Files (regenerated artifacts — not hand-edited):**
- `docs/agent-plan/context/code-map.json`
- `docs/agent-plan/context/module-map.json`
- `docs/agent-plan/context/modules/*.md` (the module explanations; stale module files for removed
  dirs — `hooks.md`, `scripts.md`/`scripts-test-gate.md`, the old `skills.md` — should be removed
  or overwritten by regen)
- `docs/agent-plan/context/index.md`
- The `<!-- ai-plan:module-map -->` block in `AGENTS.md` and `CLAUDE.md`

**Approach:** Run `node scripts/code-map/generate-code-map.mjs` then
`node scripts/ai-plan/generate.mjs` (or `npm run ai-plan` if the script exists). Inspect the
regenerated module map: it must contain only `scripts-ai-plan`, `scripts-code-map`,
`scripts-lib`, `skills` (now just `using-ai-plan`), `bootstrap-templates` (if detected), and
`test` — and must NOT contain `hooks`, `opencode`-as-DevToolsPlugin, `scripts-test-gate`, or a
4-file `skills` module. Delete any orphaned `modules/<id>.md` left for a removed module if the
generator does not prune it. Run `--doctor` to confirm runtime readiness.

**Verification:**
- `generate.mjs` and `generate-code-map.mjs` exit 0 with no errors.
- The regenerated module-map block in `AGENTS.md`/`CLAUDE.md` lists only retained modules.
- `docs/agent-plan/context/modules/` contains no file for a deleted module.
- The retained test suite (`test/ai-plan*`, `test/code-map/`) passes.
- `node scripts/ai-plan/generate.mjs --doctor` reports clean.

**Test scenarios:**
- Full regen on the slimmed repo produces a module map whose module set equals the retained
  directories (assert: no `hooks`, `test-gate`, or non-ai-plan `skills` entries).
- `test/ai-plan/index-organization.test.mjs` / `node-organization.test.mjs` pass against the
  freshly regenerated context.
- `--doctor` (and `--doctor --runtimes` if used) exits clean for all retained harnesses.

---

## System-Wide Impact

- **Breaking for consumers** who use any removed skill/command/standard. This is a major-version,
  breaking change — reflect that in the version bump and CHANGELOG entry (KTD-4).
- **Harness load:** the highest-risk failure mode is a malformed `plugin.json` (dangling
  `hooks`/`agents` key) breaking plugin load in Claude Code or Cursor — U3 validates JSON and
  greps for dangling keys to mitigate.
- **Git hooks:** if `core.hooksPath` was configured to `.githooks`, unsetting it (U2) restores
  default git hook behavior for the repo.
- **Self-hosting:** the repo's own `docs/agent-plan/context/` is regenerated (U6); downstream
  tooling that reads it sees the new, smaller module set.

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `enforcement.test.mjs` (retained) reads 3 deleted files → **crashes the regression gate** | **Confirmed (P0)** | U4 deletes or guts it; U2 caveat + U6 run-command reflect this. The suite passes only *after* this fix |
| Dangling `hooks`/`agents` key breaks Cursor plugin load | Medium | U3 edits `.cursor-plugin` (not `.claude-plugin`); validate JSON + grep gate; load-test |
| OpenCode `ReferenceError` if only the bootstrap function is removed | Medium | U3 removes the *entire* `transform` block, not just `getBootstrapContent` |
| Generator (`render.mjs`) emits `standards/`/`plan-product` into consumer repos | Confirmed | U4 edits `render.mjs:68` and `:235`; U6 regen output is the check |
| `code-map.config.json` scans deleted `hooks/` root during regen | Confirmed | U3 drops `hooks` from `roots` |
| README rewrite breaks `#codex`/`#opencode` INSTALL deep-links or leaves dead doc links | Medium | U5 constraints: preserve anchors, drop `docs/standards.md`/`features.md` links |
| `using-ai-plan` left with orphaned section stubs after table removal | Medium | U4 coherence read + expanded grep gate (now includes `hooks`) |
| `generate.mjs` leaves stale `modules/<id>.md` for deleted dirs | Medium | U6 explicitly checks for and prunes orphaned module files |
| A deleted script was referenced by a `package.json` npm script | Low | U2 audits the scripts block |
| `scripts/lib/` had a hidden consumer in a deleted dir | Low | Pre-delete grep in U1 (research found none) |

---

## Open Questions

- **Trimmed disclosure hook?** KTD-1 deletes `hooks/` entirely. If you want to keep the ai-plan
  progressive-disclosure nudge, we could retain a single rewritten `TaskCreated` hook (stripped of
  the `design-spec`/`write-plan`/`execute-plan` citations). Default is full removal — flag if you
  want the trimmed hook instead.
- **Plugin identity:** keep the name `dev-tools`, or rename to reflect the narrowed scope
  (e.g., `ai-plan`)? This plan assumes **no rename** (non-goal). A rename would add a unit touching
  every manifest, the marketplace entry, and `CLAUDE_PLUGIN_ROOT` references.
- **`.github/`:** no GitHub Actions workflows exist today, so there is no CI to prune. If CI is
  added later it should run only the retained suite.

---

## Sources & Research

- Boundary and dependency mapping: parallel repo exploration (packaging/harness adapters; tests/
  scripts/dangling references). Key reconciled findings: `manifest.json` is a pure `standards/`
  registry; root `AGENTS.md` == `CLAUDE.md` project notes (edit, not delete); `GEMINI.md` is an
  88-byte `@import` to the deleted `using-dev-tools` skill (repoint); `.githooks/pre-push` calls
  the deleted `bump-version.sh`; `scripts/lib/` is the only shared generator dependency and is
  self-contained.
- `scripts/ai-plan/README.md` — what ai-plan generates and the L0–L3 disclosure model.
- `hooks/hooks.json`, `hooks/session-start`, `hooks/stop-hook.sh` — confirmed all three hooks serve
  removed features (KTD-1).
- **Adversarial review pass (2026-06-29):** two independent reviewers grepped the live repo to
  break the plan. Confirmed the deletes are import-safe (`scripts/lib/` self-contained, no in-repo
  marketplace, no CI) but surfaced the P0 (`enforcement.test.mjs` crashes the regression gate) and
  the missed generator/config surfaces (`render.mjs:68`/`:235`, `code-map.config.json` roots,
  `ai-plan.config.example.json`, the `.cursor-plugin` vs `.claude-plugin` key mix-up, the OpenCode
  whole-block removal, the README anchor/links, the orphan `test/run-all.sh` runners, and the
  `features.md`-is-dogfooded correction). All folded into U2–U7 and the Risks table above.
