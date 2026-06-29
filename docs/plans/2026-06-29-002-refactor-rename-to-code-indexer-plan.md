---
title: "refactor: Rename dev-tools plugin to code-indexer"
date: 2026-06-29
type: refactor
depth: deep
status: ready
---

# refactor: Rename dev-tools plugin to code-indexer

## Summary

Rename the plugin from **dev-tools** to **code-indexer** across every naming layer — plugin id,
command, skill, the module-graph engine directory, config, output directory, embed markers, all
five harness adapters, install docs, and the repo/marketplace id — with **zero change to generator
behavior**. The product is the *code-indexer*; the artifact it produces is *the code index* at
`docs/code-index/`. Two engines remain underneath: `scripts/code-map/` (symbol/endpoint index,
unchanged) and the module-graph generator, which moves from `scripts/ai-plan/` to
`scripts/module-map/`. The two existing config files collapse into one `code-indexer.config.json`.

This is a wide but mechanical rename (~70 files). The risk is entirely in **completeness** — a
missed reference leaves a dangling path, a broken test import, or an install doc pointing at the
old name. Every old-name token (`ai-plan`, `agent-plan`, `dev-tools`, `using-ai-plan`,
`ai-plan.config`, `code-map.config`, `scripts/ai-plan`) is swept in U8.

---

## Problem Frame

After the 7.0.0 slim-down, the plugin is a single product but still carries three mismatched
names: the plugin (`dev-tools`), the internal feature (`ai-plan` — command, skill, scripts dir,
config, and the `docs/agent-plan/` output path), and nothing user-facing that says what it is.
This rename consolidates everything onto one name — **code-indexer** — so the plugin, command,
skill, scripts, config, and output path all read coherently.

**Confirmed decisions (from planning dialogue — locked, not to be re-litigated):**
- Plugin/command/skill → `code-indexer` / `/code-indexer` / `using-code-indexer`
- Module-graph engine `scripts/ai-plan/` → `scripts/module-map/`; `scripts/code-map/` and
  `scripts/lib/` unchanged
- Two configs merge into one `code-indexer.config.json`
- Output `docs/agent-plan/context/` → `docs/code-index/` (artifacts flat under it)
- Embed markers `ai-plan:module-map` → `code-index:module-map`
- All five harnesses stay supported; repo + marketplace id rename too
- Version resets to **1.0.0** (overridable — see Open Questions)

**Non-goals:** Any functional/behavioral change to the generators or their output content beyond
paths and names. Fixing the latent stack-profile fixtures-discovery bug (the manual-modules
workaround is preserved). Renaming the artifact files themselves — `code-map.json` and
`module-map.json` stay (they are descriptive artifact names, not the product name).

---

## Key Technical Decisions

**KTD-1 — Engine dir becomes `scripts/module-map/`, not `scripts/code-indexer/`.** The product
has two engines; naming the module-graph engine after its output (`module-map`) keeps the
two-engine model legible alongside the unchanged `scripts/code-map/`. "code-indexer" lives at the
product/command/config level, not the engine level.

**KTD-2 — One merged `code-indexer.config.json`.** Today `code-map.config.json` holds the
code-map roots and `ai-plan.config.json` holds module discovery. Both engines will read a single
`code-indexer.config.json`; the two old files are deleted. Example configs collapse to
`code-indexer.config.example.json`. This is a genuine simplification, not just a rename.

**KTD-3 — Output is `docs/code-index/` (flat).** Artifacts (`code-map.json`, `module-map.json`,
`modules/<id>.md`, `index.md`) sit directly under `docs/code-index/`, dropping the old
`/context` nesting. Matches the agreed structure and reads as "the code index."

**KTD-4 — Version resets to 1.0.0.** code-indexer is a new marketplace id with no existing
users, so a first release stamped 7.0.0 would read oddly. Overridable (Open Questions).

**KTD-5 — Plugin-root detection is name-agnostic — the rename cannot break it.** `scripts/lib/
plugin-root.mjs` resolves the root by the existence of `.claude-plugin/plugin.json`, not by the
name "dev-tools." The `dev-tools` strings in `scripts/lib/resolve-ast-grep.mjs` are
human-readable error/log messages only. They get updated for consistency (U5) but are not
load-bearing — this de-risks the scariest-looking part of the rename.

**KTD-6 — Extend `migrate.mjs` with one new hop for existing consumers.** `scripts/ai-plan/lib/
migrate.mjs` already migrates a legacy `docs/ai-plan/` layout to `docs/agent-plan/context/`. Add a
new hop `docs/agent-plan/context/` → `docs/code-index/` (idempotent, mirroring the existing
`moveIfPresent` guard) so repos already on the current path migrate cleanly. This is the one
migration affordance in an otherwise pure rename.

**KTD-7 — CE dovetail preserved.** `docs/code-index/` collides with nothing compound-engineering
writes (`docs/plans`, `docs/brainstorms`, `docs/solutions`, `docs/pulse-reports`, `STRATEGY.md`,
`CONCEPTS.md`, `.compound-engineering/`). The `AGENTS.md`/`CLAUDE.md` `code-index:module-map`
embed remains the live integration seam every CE planning/research skill reads.

---

## Output Structure (target naming map)

| Layer | From | To |
|-------|------|-----|
| Plugin id | `dev-tools` | `code-indexer` |
| Command | `commands/ai-plan.md` (`/ai-plan`) | `commands/code-indexer.md` (`/code-indexer` + `init`/`doctor` args) |
| Skill | `skills/using-ai-plan/` | `skills/using-code-indexer/` (namespace `code-indexer:using-code-indexer`) |
| Engine 1 — symbol index | `scripts/code-map/` | `scripts/code-map/` *(unchanged)* |
| Engine 2 — module graph | `scripts/ai-plan/` | `scripts/module-map/` |
| Shared lib | `scripts/lib/` | `scripts/lib/` *(unchanged)* |
| Config | `code-map.config.json` + `ai-plan.config.json` | `code-indexer.config.json` (merged) |
| Example config | `*/code-map.config.example.json` + `*/ai-plan.config.example.json` | `code-indexer.config.example.json` |
| Output dir | `docs/agent-plan/context/` | `docs/code-index/` |
| Embed markers | `ai-plan:module-map` | `code-index:module-map` |
| Cursor rule template | `bootstrap-templates/ai-plan.mdc` | `bootstrap-templates/code-indexer.mdc` |
| Version | `7.0.0` | `1.0.0` |
| Marketplace id | `dev-tools@jamaynor` | `code-indexer@jamaynor` |
| GitHub repo | `jamaynor/dev-tools` | `jamaynor/code-indexer` *(manual, external)* |

```text
code-indexer/
├── commands/code-indexer.md
├── skills/using-code-indexer/SKILL.md
├── scripts/
│   ├── code-map/        (unchanged — symbol/endpoint index)
│   ├── module-map/      (was scripts/ai-plan/ — module graph)
│   └── lib/             (unchanged)
├── code-indexer.config.json          (merged)
├── docs/code-index/                  (regenerated output)
│   ├── code-map.json  module-map.json  index.md
│   └── modules/<id>.md
└── .claude-plugin · .cursor-plugin · .codex · .opencode · gemini-extension.json (all → code-indexer)
```

---

## Implementation Units

### U1. Rename the module-graph engine directory

**Goal:** Move `scripts/ai-plan/` → `scripts/module-map/` and fix every reference into it so the
engine still loads and tests still resolve their imports.

**Dependencies:** none (do first).

**Files:**
- Move `scripts/ai-plan/**` → `scripts/module-map/**` (git mv to preserve history): `generate.mjs`,
  `regen-if-source-changed.mjs`, `README.md`, `lib/*.mjs` (config, doctor, embed, render,
  bootstrap, migrate, module-enrichment, module-ownership, pin, routes, logger, project-root,
  stack-graph, stack-profiles/, detection/, adapters/, auto-detect, repo-files, etc.).
- Update intra-engine relative imports that reference `scripts/ai-plan` by path (most are
  relative `./` imports and survive the move; verify none hardcode `ai-plan`).
- `scripts/lib/` consumers and `scripts/code-map/` cross-refs: update any `../ai-plan/` path.
- `scripts/module-map/lib/logger.mjs`: `service: 'ai-plan'` → `service: 'code-indexer'`.
- **Test imports (~15 files):** every `test/ai-plan*/**` file importing
  `../../scripts/ai-plan/lib/...` → `../../scripts/module-map/lib/...`
  (`test/ai-plan/*.test.mjs`, `test/ai-plan-adapters/*.test.mjs`, `test/ai-plan-endpoints.test.mjs`,
  `test/code-map/module-links.test.mjs`).

**Approach:** Mechanical move + path fix. Keep test *directory* names as-is for now (they're
internal; renaming test dirs is cosmetic and deferred — see U8 note) — only their import paths
must change. Verify with `node --check` on each moved entry and a test run.

**Test scenarios:**
- The full retained suite (`test/ai-plan*`, `test/code-map/`) loads with no `MODULE_NOT_FOUND` and
  passes after the import-path updates.
- `node scripts/module-map/generate.mjs --help`/load runs without import errors.

**Verification:** `grep -rn "scripts/ai-plan" .` (excl. `docs/plans`, history) returns nothing;
retained suite green.

---

### U2. Merge the two configs into `code-indexer.config.json`

**Goal:** Collapse `code-map.config.json` + `ai-plan.config.json` into one root
`code-indexer.config.json` that both engines read.

**Dependencies:** U1.

**Files:**
- Create `code-indexer.config.json` merging: code-map `roots` (currently `["scripts","skills",".opencode"]`)
  + module discovery (`modules.discover: manual` with the manual modules) + `output`/`docs` keys.
- Update `scripts/code-map/lib/code-map-config.mjs` to read `code-indexer.config.json` (was
  `code-map.config.json`).
- Update the module-map config loader (`scripts/module-map/lib/config.mjs`) to read
  `code-indexer.config.json` (was `ai-plan.config.json`).
- Delete `code-map.config.json` and `ai-plan.config.json`.
- Rename example configs to `scripts/.../code-indexer.config.example.json` (consolidate the two
  examples; update the `--init` writer in `bootstrap.mjs` to emit the merged example).
- Preserve the manual-modules workaround for the fixtures bug (KTD; the module roots are updated to
  the new `scripts/module-map` path in U8).

**Approach:** The two config schemas are disjoint (roots vs modules vs docs), so the merge is a
union, not a reconciliation. Keep the merged shape backward-comprehensible — both loaders read
their own sub-keys from the one file.

**Test scenarios:**
- `test/ai-plan/config-test-field.test.mjs` passes against the merged loader (update the path/name
  it loads if it references `ai-plan.config.json`).
- code-map generation reads `roots` from `code-indexer.config.json` and scans the same dirs.
- module-map generation reads `modules.discover: manual` from the same file and produces the same
  three modules.

**Verification:** `grep -rn "ai-plan.config\|code-map.config" .` (excl. history) returns nothing;
both generators run reading only `code-indexer.config.json`.

---

### U3. Migrate the output path and embed markers

**Goal:** Change the default output from `docs/agent-plan/context/` to `docs/code-index/` and the
embed markers from `ai-plan:module-map` to `code-index:module-map`, in both engines, plus extend
`migrate.mjs` for existing consumers.

**Dependencies:** U1, U2.

**Files:**
- Default output path in the module-map generator + `scripts/code-map/lib/module-linker.mjs`
  (reads the context dir) + `doctor.mjs` checks + the staleness gate: `docs/agent-plan/context/`
  → `docs/code-index/`.
- `scripts/module-map/lib/embed.mjs`: marker strings `ai-plan:module-map` → `code-index:module-map`
  (start/end/generated comments).
- `scripts/module-map/lib/migrate.mjs`: (a) update its own `docs/agent-plan/context/` references;
  (b) **add a new idempotent hop** `docs/agent-plan/context/` → `docs/code-index/` mirroring the
  existing `moveIfPresent` + already-renamed guard (KTD-6).
- The currently-embedded blocks in `AGENTS.md`/`CLAUDE.md` use the old markers — they are
  overwritten by regeneration in U8; no hand-edit needed beyond U8's regen.

**Approach:** Path/string changes only — no logic change to how artifacts are produced or
embedded. The migrate hop is the only added behavior; gate it so it no-ops when the target already
exists.

**Test scenarios:**
- After regen (U8), artifacts land under `docs/code-index/` and nowhere under `docs/agent-plan/`.
- The embedded block in `AGENTS.md`/`CLAUDE.md` uses `code-index:module-map` markers.
- `migrate.mjs` run on a repo with `docs/agent-plan/context/` moves it to `docs/code-index/`; a
  second run no-ops (idempotent); a repo already on `docs/code-index/` is untouched.

**Verification:** `grep -rn "agent-plan" .` (excl. history/plans) returns nothing after U8 regen.

---

### U4. Rename the command and skill

**Goal:** `/ai-plan` → `/code-indexer` (with `init`/`doctor` arg modes) and `using-ai-plan` →
`using-code-indexer`, self-contained and standalone.

**Dependencies:** U1–U3 (so the doc references point at final paths).

**Files:**
- `commands/ai-plan.md` → `commands/code-indexer.md`: rewrite to branch on `$ARGUMENTS`
  (bare = generate, `init` = bootstrap `--init --write-scripts`, `doctor` = `--doctor`); update
  all script paths to `scripts/module-map/` and `scripts/code-map/`.
- `skills/using-ai-plan/SKILL.md` → `skills/using-code-indexer/SKILL.md`: rename dir + frontmatter
  `name: using-code-indexer`; update every path (`docs/code-index/`, `scripts/module-map/`,
  `code-indexer.config.json`), command name (`/code-indexer`), and the self-reference list (drop
  the `ai-plan` wording).
- Any `dev-tools:using-ai-plan` namespace references → `code-indexer:using-code-indexer` across the
  repo.

**Test scenarios:**
- `test/ai-plan/module-scope-render.test.mjs` (if it asserts on skill/command content) passes after
  the rename — update assertions referencing old names.

**Verification:** `grep -rn "using-ai-plan\|/ai-plan\b" .` (excl. history) returns nothing; the
skill reads coherently with no orphaned references.

---

### U5. Update harness manifests and plugin identity

**Goal:** Every harness adapter and identity file names the plugin `code-indexer` at version
`1.0.0`, with no dangling old references.

**Dependencies:** U1–U4.

**Files (edit):**
- `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json` — `name`, `description`, `keywords`,
  version `1.0.0`.
- `.opencode/plugins/dev-tools.js` → rename file to `code-indexer.js` (or keep filename, update
  `package.json` `main`); update the `DevToolsPlugin` export name → `CodeIndexerPlugin` and any
  `dev-tools` strings; `.opencode/INSTALL.md` references.
- `.codex/INSTALL.md` — `~/.codex/dev-tools` paths, README anchor links.
- `gemini-extension.json` — `name`, `description`, version.
- `GEMINI.md` — unchanged content (`@./AGENTS.md`) but verify.
- `package.json` — `name: code-indexer`, version `1.0.0`, `main` path if the opencode file moved;
  `package-lock.json` — update the root `name` (regenerate via `npm install --package-lock-only`
  or hand-edit the two name fields).
- `AGENTS.md` / `CLAUDE.md` — prose (plugin name, scripts paths, output path); the module-map block
  is regenerated in U8.
- `.github/ISSUE_TEMPLATE/*.md` — `dev-tools` → `code-indexer`.
- `LICENSE` — project-name references.
- `scripts/lib/resolve-ast-grep.mjs` — user-facing `dev-tools` strings → `code-indexer`
  (cosmetic per KTD-5).

**Approach:** Surgical edits; validate every JSON parses. Plugin-root detection is unaffected
(KTD-5).

**Test scenarios:**
- All `*.json` manifests parse as valid JSON.
- `.opencode/plugins/*.js` passes `node --check` and exports the renamed plugin symbol.

**Verification:** `grep -rni "dev-tools" .` (excl. history/CHANGELOG/RELEASE-NOTES) returns
nothing except intentional historical mentions.

---

### U6. Update bootstrap templates

**Goal:** The files `--init` copies into consumer repos reference code-indexer, not ai-plan.

**Dependencies:** U1–U4.

**Files:**
- `scripts/bootstrap-templates/ai-plan.mdc` → `code-indexer.mdc` (Cursor rule): update name,
  paths, skill reference; update the `bootstrap.mjs`/`doctor.mjs` writer that emits
  `.cursor/rules/ai-plan.mdc` → `.cursor/rules/code-indexer.mdc`.
- `scripts/bootstrap-templates/devjoy.project.json` — `ai-plan`/`agent-plan` references.
- `scripts/bootstrap-templates/AGENTS.md` + `CLAUDE.md` — output path `docs/code-index/`, skill
  `using-code-indexer`, command `/code-indexer`.

**Test scenarios:**
- `test/ai-plan/bootstrap.test.mjs` passes after template + writer-path updates (update any
  asserted filenames like `ai-plan.mdc`).

**Verification:** `grep -rn "ai-plan\|agent-plan" scripts/bootstrap-templates/` returns nothing.

---

### U7. Update install docs, product docs, and changelog

**Goal:** Every install instruction and doc names code-indexer; release docs record the rename.

**Dependencies:** U1–U6.

**Files:**
- `README.md` — install sections for all five harnesses: clone URLs
  (`github.com/jamaynor/dev-tools` → `code-indexer`), `~/.codex/dev-tools` symlink paths,
  marketplace id `dev-tools@jamaynor` → `code-indexer@jamaynor`, `/plugin install` line;
  **preserve the `### Codex` / `### OpenCode` heading anchors** (INSTALL.md files deep-link to
  them); update the product description, command (`/code-indexer`), paths (`docs/code-index/`,
  `scripts/module-map/`), and config name.
- `scripts/module-map/README.md` (was `scripts/ai-plan/README.md`) — full maintainer-reference
  rename.
- `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md`, `docs/features.md`, `docs/README.md`,
  `docs/testing.md` — names, paths, command.
- `CHANGELOG.md` / `RELEASE-NOTES.md` — add a `1.0.0` entry describing the rename from dev-tools
  7.0.0 (preserve prior history per the slim-down's KTD-4 convention).

**Approach:** Documentation pass. Call out the **external manual steps** (not code): renaming the
GitHub repo `jamaynor/dev-tools` → `jamaynor/code-indexer`, and updating the marketplace repo
(`jamaynor/plugin-marketplace`) entry `dev-tools@jamaynor` → `code-indexer@jamaynor`.

**Test expectation: none** — docs only; verified by the U8 grep sweep + a link check that
README's `#codex`/`#opencode` anchors still resolve.

---

### U8. Regenerate context and verify end-to-end

**Goal:** Prove the renamed tool self-hosts: update the config's manual-module roots, regenerate
into `docs/code-index/`, run the suite green, and sweep for every dangling old-name reference.

**Dependencies:** U1–U7.

**Files (regenerated, not hand-edited):**
- `code-indexer.config.json` — update manual-module `root`s: `scripts/ai-plan` → `scripts/module-map`
  (the symbol-index engine stays `scripts/code-map`; `scripts/lib` unchanged).
- `docs/code-index/{code-map.json,module-map.json,index.md}`, `docs/code-index/modules/*.md` — via
  `node scripts/code-map/generate-code-map.mjs` then `node scripts/module-map/generate.mjs`.
- The `code-index:module-map` block re-embedded into `AGENTS.md`/`CLAUDE.md`.
- Remove the now-stale `docs/agent-plan/` tree (or confirm `migrate.mjs`/regen pruned it).

**Approach:** Run both generators, confirm output lands under `docs/code-index/` with the three
expected modules (`module-map`, `code-map`, `lib`), then run the **full dangling-reference sweep**.

**Test scenarios:**
- Retained suite (`test/ai-plan*`, `test/code-map/`) passes (68 tests, adjusted for renamed
  import paths).
- Regen produces `docs/code-index/` with modules `module-map`/`code-map`/`lib` and no
  `docs/agent-plan/` remnants.
- `node scripts/module-map/generate.mjs --doctor` exits clean.
- **Dangling sweep returns empty** (excl. `.git`, `node_modules`, `docs/plans/`,
  `docs/agent-plan/{plans,specs,bugs}` history, `CHANGELOG.md`, `RELEASE-NOTES.md`):
  `grep -rniE "ai-plan|agent-plan|dev-tools|using-ai-plan" .`

**Verification:** all of the above green; the only surviving old-name strings are in dated history
docs and the changelog.

---

## System-Wide Impact

- **Breaking for existing dev-tools users** — new plugin id, command, skill namespace, config
  filename, and output path. The `migrate.mjs` hop (KTD-6) eases the output-path move; everything
  else requires re-install under the new marketplace id.
- **External manual steps gate the release**: the GitHub repo rename and marketplace entry update
  are outside the codebase. GitHub 301-redirects the old repo URL (clone instructions keep working
  transiently), but the **marketplace id mismatch** (`dev-tools@jamaynor` vs `code-indexer@jamaynor`)
  means `/plugin install` fails until the marketplace repo is updated. U7 documents these; they
  must be done at release time.
- **CE dovetail intact** — no path collision; the `AGENTS.md` embed seam keeps working (KTD-7).

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Test imports break on the engine dir move | **High (expected)** | U1 updates all ~15 import paths; U8 grep gate + suite run catch any miss |
| A generator still reads an old config/path after merge | Medium | U2/U3 update every loader; U8 runs both generators reading only the new config |
| Stale `docs/agent-plan/` tree or old embed markers linger | Medium | U8 regen overwrites the embed; explicitly remove/prune the old tree |
| `migrate.mjs` new hop mis-fires (double-move or clobber) | Medium | Idempotent guard mirroring existing `moveIfPresent`; tested in U3 |
| Marketplace id mismatch breaks install at release | Medium | U7 calls out the external marketplace + repo rename as release-gating steps |
| `package-lock.json` name drift | Low | U5 regenerates the lockfile name field |
| Plugin-root detection breaks on rename | **None (verified)** | KTD-5 — detection keys on `.claude-plugin/plugin.json`, not the name |

---

## Open Questions

- **Version: 1.0.0 (default) vs 7.0.0.** Defaulted to 1.0.0 (fresh marketplace id). Flip to 7.0.0
  if changelog continuity matters more than a clean first-release number.
- **Rename the `test/ai-plan*` directories too?** Their *import paths* must change (U1); renaming
  the dirs themselves (`test/ai-plan/` → `test/module-map/`) is cosmetic and deferred to avoid
  churn — flag if you want it in scope.
- **`migrate.mjs` new hop — include now (default) or defer?** Included by KTD-6 as the responsible
  affordance for existing consumers; drop it if you'd rather ship the rename pure and handle
  migration separately.

---

## Sources & Research

- Reference sweep (this session): `ai-plan` 74 files, `agent-plan` 33, `dev-tools` 42,
  `using-ai-plan` 13, `scripts/ai-plan` 37 — full file list enumerated across manifests, both
  engines, tests, bootstrap templates, install docs, and product docs.
- `scripts/lib/plugin-root.mjs` — root detection keys on `.claude-plugin/plugin.json` (KTD-5).
- `scripts/ai-plan/lib/migrate.mjs` — existing legacy-path migration; extended in U3/KTD-6.
- `scripts/lib/resolve-ast-grep.mjs` — `dev-tools` strings are cosmetic messages (KTD-5).
- compound-engineering file-placement review (prior turn): CE writes to `docs/plans`,
  `docs/brainstorms`, `docs/solutions`, `docs/pulse-reports`, `STRATEGY.md`, `CONCEPTS.md`,
  `.compound-engineering/`; `docs/code-index/` collides with none; the `AGENTS.md` embed is the
  integration seam (KTD-7).
