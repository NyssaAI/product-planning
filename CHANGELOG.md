# Changelog

## [Unreleased]

## [1.0.0] - 2026-06-29 — renamed to code-indexer

### Changed (BREAKING)

- **Renamed the plugin `dev-tools` → `code-indexer`** and reset versioning to 1.0.0 for the new
  marketplace identity. Command `/ai-plan` → `/code-indexer`; skill `using-ai-plan` →
  `using-code-indexer`; module-graph engine `scripts/ai-plan/` → `scripts/module-map/`; merged
  `code-map.config.json` + `ai-plan.config.json` → one `code-indexer.config.json`; output
  `docs/agent-plan/context/` → `docs/code-index/`; embed markers `ai-plan:module-map` →
  `code-index:module-map`. A `--migrate` hop moves an existing `docs/agent-plan/context/` to
  `docs/code-index/`.

### Removed

- **Dropped OpenCode support.** Removed the `.opencode/` plugin adapter, install docs, and harness
  references — code-indexer ships for Claude Code, Cursor, Codex, and Gemini.

## [7.0.0] - 2026-06-29

### Changed (BREAKING)

- **Slimmed dev-tools to the ai-plan / code-map subsystem.** The plugin now ships only the
  ai-plan code/module-graph generator: `scripts/ai-plan/`, `scripts/code-map/`, `scripts/lib/`,
  bootstrap templates, the `/ai-plan` command, and the `using-ai-plan` skill — across all five
  harnesses (Claude Code, Cursor, Codex, OpenCode, Gemini).

### Removed

- All other skills (design-spec, write-plan, execute-plan*, fix-bug*, plan-product,
  test-driven-development, systematic-debugging, requesting/receiving-code-review, merge-pr,
  dispatching-parallel-agents, align-project-structure, add-backlog, add-bug,
  verification-before-completion, writing-skills, using-dev-tools, using-*-standards,
  using-git-worktrees).
- The ralph-loop and setup-test-gate commands, the `code-reviewer` agent, and all hooks
  (SessionStart / Stop / TaskCreated).
- The bundled `standards/` tree and its `manifest.json` registry.
- Repo dev-infrastructure for removed features: test-gate / ralph / version-bump scripts, the
  `.githooks/` pre-push gate, and their tests.

## [6.4.1] - 2026-06-18

### Fixed

- **ai-plan enforcement** — `using-ai-plan`, `write-plan`, `execute-plan`, and the TaskCreated hook now treat module-first planning context as an enforced gate. Plans for repos with ai-plan artifacts must carry a `Planning module` header and `Planning context` section before implementation can start.

## [6.2.1] - 2026-06-14

### Maintenance

- Patch/republish release — no functional changes since 6.2.0.

## [6.2.0] - 2026-06-14

### Added

- **Endpoint surface mapping (ai-plan / code-map)** — code-map extracts an endpoint index (HTTP routes + MCP tools/resources/prompts) via `scripts/code-map/lib/endpoint-extractor.mjs`; ai-plan enriches each module with its endpoint surface, `code-map.json` carries the endpoint index, and `--doctor` reports endpoint counts.

## [6.1.0] - 2026-06-14

### Added

- **`align-project-structure` skill** — audits a repo against `standards/project-structure.md`. Hard-enforces the `docs/` section (required docs, `docs/agent-plan/` subtree, current `features.md` / use-case formats, no legacy `docs/agent-files/` or pre-reorg roots) and warns on the rest. Auto-applies safe fixes (`generate.mjs --init`, `docs/agent-files` → `docs/agent-plan` move, `generate.mjs --migrate`) and presents a plan for content-rewriting fixes before applying them.

## [6.0.0] - 2026-06-14

### Breaking changes

- **Output tree renamed `docs/agent-files/` → `docs/agent-plan/`** (hard rename, no runtime fallback). `generate.mjs --migrate` does **not** move `docs/agent-files/`; repos on that layout must `git mv docs/agent-files docs/agent-plan` manually. (`--migrate` still converts the older `docs/ai-plan/`, `docs/specs/`, `docs/plans/`, `docs/backlog/`, `docs/bugs/` layouts.)
- **Legacy path fallbacks removed** from `design-spec`, `execute-plan-finish`, and `merge-pr` — repos must be on the `docs/agent-plan/` layout; pre-reorg paths are no longer read.
- **`docs/features.md` format changed** from a status table to a checkbox **Inventory** + per-feature **Definitions**; feature ids `F1` → `F-001`. `merge-pr` now reads delivered features from checked (`[x]`) inventory entries instead of a status column.
- **Use-case schema changed** (cross-cutting model): ids `F-001-U1` → standalone `U-001`; frontmatter `feature:` (singular) → required, searchable `features:` list; filename `f{n}-u{n}.md` → `u-{nnn}-<slug>.md`.

### Added

- **`docs/features.md` as a first-class artifact** — `plan-product` creates and uses it: an `F-001` checkbox inventory plus AI-refined, human-confirmed per-feature definitions, seeded from the PRD's functional requirements. The roadmap sequences features by id.
- **Cross-cutting use cases** — a use case is a user-journey view that may span several features, listing them in a required `features:` frontmatter list (greppable: `grep -l "F-002" docs/use-cases/*.md`).
- **ai-plan cohesion-based module detection** — `discover: auto` now derives **feature-level** modules from the code's dependency graph (directories grouped at the coupling/cohesion-optimal depth) instead of one-per-project. Language-agnostic core (`scripts/ai-plan/lib/detection/`) + pluggable per-language adapters (`scripts/ai-plan/lib/adapters/`), with a **C# adapter** that resolves type-reference edges. Deterministic; falls back to directory structure for sparse graphs. Non-matching repos (incl. JS workspaces) are unchanged.
- **Module pinning / eject** — `generate.mjs --pin <id>` / `--unpin <id>` freeze a derived module into `ai-plan.config.json` → `modules.pinned[]` (editable id/name/description/capabilities/boundary). Pinned roots are authoritative and survive re-derivation. Config gains `modules.pinned`, `modules.adapter`, `modules.minFiles`, `modules.maxFiles`.

### Changed

- **Minimal module scope** — `design-spec` / `write-plan` scope to the **minimum module set** needed to implement the behavior, not exactly one module (a cross-cutting use case may legitimately require several).
- Bootstrap now writes `docs/features.md`; `migrate.mjs` emits the new features.md format; the bundled `AGENTS.md` template, ai-plan docs, and the Codex/Copilot tool mappings (now including `AskUserQuestion`) were updated to match.

## [5.1.0] - 2026-05-21

### Added

- **`execute-plan`** — single user-facing entry for plan implementation (verify → run → finish + PR). Sub-skills: `execute-plan-run`, `execute-plan-run-inline`, `execute-plan-finish`.
- **`fix-bug`** — single user-facing entry for bug lifecycle (replaces `bugfix-lifecycle` / direct sub-skill invocation).
- **`test/run-all.sh`** — unified maintainer test runner (`--fast`, `--all`, `--integration`, `--full`).

### Changed

- **Verb-named workflow skills** — `brainstorming` → **`design-spec`**, `backlog-workflow` → **`add-backlog`**, `writing-plans` → **`write-plan`** (internal, invoked by design-spec). Folder names match skill names.
- **Execution chain** — `subagent-driven-development`, `executing-plans`, and `finishing-a-development-branch` → gated sub-skills under **`execute-plan`**.
- **Ai-plan during design** — index regeneration is automatic during **design-spec** / **write-plan** when code exists; manual `/ai-plan` only after module structure changes.
- **Router (`using-dev-tools`)** — routes feature work, backlog, plan implementation, and bugs to canonical entry points only.
- **Contributor docs** — clarify bundled `@ast-grep/cli` dependency (plugin-root install; consumer repos need no npm deps).
- **Test harness** — `test/run-all.sh` unified runner; PIPESTATUS fixes; resilient unit-test assertions; `design-spec-server` and OpenCode structure tests in `--all`.
- **Tests and docs** — retire residual pre-rename skill references; expand eval coverage for all five entry points.

## [5.0.8] - 2026-05-21

### Added

- **Bundled development standards** — `standards/`, `manifest.json`, and `using-core-standards` / `using-dotnet-standards` / `using-nextjs-standards` / `using-postgres-standards` / `using-python-standards` skills ship inside dev-tools (no separate dev-standards plugin).
- **Bundled ai-plan** — `scripts/code-map/`, `scripts/ai-plan/`, `using-ai-plan` skill, and `/ai-plan` command. `@ast-grep/cli` is a plugin dependency (auto-installs into the plugin root on first code-map run).
- **docs/standards.md** — documents bundled standards layout for consumers.

### Changed

- **Git workflow gates** — design-spec requires `using-git-worktrees` after spec approval; execute-plan verifies feature branch/worktree before implementation; execute-plan-finish requires push + `gh pr create` (override only via project CLAUDE.md/AGENTS.md).
- **Standards surfacing** — design-spec and write-plan invoke bundled `dev-tools:using-*-standards` skills.
- **ai-plan output** — stops generating `docs/ai-plan/BRIEF.md`; L2 planning context reads `docs/product.md`, `docs/roadmap.md`, and `docs/tech-stack.md` directly. Module scopes under `docs/ai-plan/scopes/` remain the primary planning artifact.
- **project-structure standard** — documents authoritative docs vs generated ai-plan (`docs/specs/`, `docs/plans/`, `docs/ai-plan/scopes/`).
- **Codex App compatibility** — `using-git-worktrees` Step 0 (linked worktree detection); execute-plan-finish Step 1.5 environment detection and guarded worktree cleanup.

## [5.0.7] - 2026-04-24

### Added

- **plan-product skill**: Establishes foundational product documentation (full PRD, roadmap, tech stack) for new projects through interactive conversation, conforming to the dev-standards project-structure layout.
- **bug-workflow skill**: Formally documents a newly discovered bug in `docs/bugs/{timestamp}-{slug}/` with a detail file and scoped discovery commit. Paired with the bugfix skill for the resolution step.
- **bugfix skill**: Reads a bug detail file and drives an iterative Ralph loop (examine → plan → implement → test → critique → resolve) until the fix is verified and all tests pass.
- **backlog-workflow skill**: Adds a planned work item to `docs/backlog/{timestamp}-{slug}/` with a detail file, ready to be turned into a plan later.

### Changed

- **Initial dev-tools release (5.0.7)**: Plugin identity, install paths, and marketplace entries for Claude Code, Cursor, OpenCode, Codex, and Gemini CLI. Added plan-product, bug-workflow, bugfix, and backlog-workflow skills.
- **Standards surfacing**: The brainstorming skill now invokes `dev-standards:using-*-standards` peer-plugin skills instead of reading hardcoded filesystem paths, making the skill portable across machines.

### Fixed

- **plugin.json validation and install instructions**: Corrected manifest fields and installation docs following the rebrand.
- **bugfix terminology**: Renamed `{slug}` → `{bug_id}` throughout the skill to remove a naming collision with `bug-workflow` (where `slug` is the short descriptor, not the full identifier). Pinned `--max-iterations 20` on the Ralph loop and removed a duplicated "plan a failing test" step.

## [5.0.5] - 2026-03-17

### Fixed

- **Design-spec server ESM fix**: Renamed `server.js` → `server.cjs` so the visual companion server starts correctly on Node.js 22+ where the root `package.json` `"type": "module"` caused `require()` to fail.
- **Design-spec owner-PID on Windows**: Skip owner-PID lifecycle monitoring on Windows/MSYS2 where the PID namespace is invisible to Node.js. Prevents the server from self-terminating after 60 seconds. The 30-minute idle timeout remains as the safety net.
- **stop-server.sh reliability**: Verify the server process actually died before reporting success. Waits up to 2 seconds for graceful shutdown, escalates to `SIGKILL`, and reports failure if the process survives.

### Changed

- **Execution handoff**: Restore user choice between subagent-driven-development and executing-plans after plan writing. Subagent-driven is recommended but no longer mandatory. (Reverts `5e51c3e`)
