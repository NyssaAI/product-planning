# code-indexer Release Notes

## v1.0.0 (2026-06-29) — renamed to code-indexer

### Changed (BREAKING)

- **dev-tools is now code-indexer.** Full rename across the command (`/code-indexer`), skill
  (`using-code-indexer`), the module-graph engine (`scripts/module-map/`), a single merged
  `code-indexer.config.json`, and the output directory (`docs/code-index/`). Version reset to 1.0.0
  for the new marketplace identity. Existing repos migrate their index via `--migrate`.

### Removed

- **OpenCode support dropped** — code-indexer ships for Claude Code, Cursor, Codex, and Gemini.

*(History below predates the rename, under the dev-tools name.)*

## v7.0.0 (2026-06-29)

### Changed (BREAKING)

- **dev-tools is now just ai-plan.** The plugin was slimmed to its code/module-graph generator —
  `scripts/ai-plan/`, `scripts/code-map/`, `scripts/lib/`, bootstrap templates, the `/ai-plan`
  command, and the `using-ai-plan` skill — kept working across all five harnesses (Claude Code,
  Cursor, Codex, OpenCode, Gemini).

### Removed

- Every other skill (design-spec, write-plan, execute-plan, fix-bug, plan-product, TDD,
  systematic-debugging, code-review skills, worktrees, backlog/bug capture, writing-skills,
  using-dev-tools, and the standards skills).
- The ralph-loop / setup-test-gate commands, the `code-reviewer` agent, all hooks, the bundled
  `standards/` tree (and `manifest.json`), and the test-gate / ralph / version-bump dev-tooling.

If you relied on a removed workflow, pin `v6.4.1` or migrate that workflow into its own plugin.

## v6.4.1 (2026-06-18)

### Fixed

- **ai-plan context enforcement** — `design-spec` / `write-plan` must preserve module-first planning evidence, and `execute-plan` now stops before implementation when a plan omits the required ai-plan context. The TaskCreated hook also describes this as enforced behavior, not optional guidance.

## v6.4.0 (2026-06-17)

### Added

- **Polyglot pre-push test gate** — a deterministic `git pre-push` hook that runs a consumer repo's unit/integration tests and blocks the push on failure. Auto-detects npm/pnpm/yarn, `dotnet test`, pytest (strict), `go test`, and `cargo test`; override via `ai-plan.config.json` `test.commands`. Install with `/setup-test-gate` (or `node "${CLAUDE_PLUGIN_ROOT}/scripts/setup-test-gate.mjs"`). A self-contained runner is **vendored** into the repo (`.githooks/test-gate.mjs`), so the hook works under plain `git` with no plugin env vars; the installer is non-destructive (integrates with husky / `core.hooksPath`) and idempotent. Bypass with `git push --no-verify`.
- **Playwright E2E finish-ask** — `execute-plan-finish` now detects a Playwright suite and asks (each push) whether to run E2E before pushing. "No" never blocks; the run/skip is recorded in the final response and the PR Test Plan. E2E is never run by the git hook.

### Changed

- **`align-project-structure`** audits for a missing pre-push test gate and offers to install it (ask-first) when a repo has a runnable suite but nothing runs it before push.

## v6.3.0 (2026-06-17)

### Added

- **`test/` is scanned by default** — `test` is now a default code-map scan root (`CODE_ROOT_CANDIDATES`) and a default regen trigger (`DEFAULT_SOURCE_ROOTS`). Test projects (e.g. .NET `test/*` solutions) now appear in the code-map / module-map, and edits under `test/` auto-regenerate context. Previously `test/` was ignored, so test modules reported `symbolCount: 0`.

### Changed

- **`align-project-structure` wires and repairs the regeneration hook** — Step 3 now adds a missing `PostToolUse` auto-regen hook via `--write-scripts` (respecting `"autoRegenerate": false`), and rewrites stale context-map paths in *every* `.claude/settings.json` hook — including advisory `agent` hooks like a `TaskCreated` reminder — catching legacy variants the `agent-files` → `agent-plan` token sweep misses (`docs/ai-plan/code_map.json` / `module_map.json`, underscore filenames, and any path missing the `context/` segment).

## v6.2.1 (2026-06-14)

Maintenance/republish patch — no functional changes since v6.2.0.

## v6.2.0 (2026-06-14)

### Added

- **Endpoint surface mapping** — ai-plan and code-map now detect and index HTTP routes and MCP tools/resources/prompts, enriching module docs with their endpoint surface. `--doctor` reports endpoint counts.

## v6.1.0 (2026-06-14)

### Added

- **`align-project-structure`** — onboard or audit a repo against the dev-tools project-structure standard. Enforces the `docs/` section, auto-fixes safe deviations (including the `docs/agent-files` → `docs/agent-plan` move and `--init` / `--migrate`), and produces a correction plan for anything that rewrites human-authored content.

## v6.0.0 (2026-06-14)

Major release — breaking changes to the planning-doc layout and schemas.

### Highlights

- **`docs/features.md` is now a real artifact.** `plan-product` creates it: an `F-001` checkbox inventory + AI-refined definitions, seeded from the PRD. The roadmap sequences features by id.
- **Use cases are cross-cutting.** A use case (`U-001`) lists the features it spans in a required, searchable `features:` frontmatter list — no longer a child of one feature.
- **Specs scope to the minimum module set** needed for the behavior, not exactly one module.

### Breaking changes & migration

| Change | What to do |
|--------|-----------|
| `docs/agent-files/` → `docs/agent-plan/` | `git mv docs/agent-files docs/agent-plan`. (`generate.mjs --migrate` handles older `docs/ai-plan/`, `docs/specs/`, `docs/plans/`, `docs/backlog/`, `docs/bugs/` layouts but **not** `agent-files`.) |
| Legacy path fallbacks removed | Ensure all artifacts live under `docs/agent-plan/`. |
| `features.md` table → checkbox + definitions; `F1` → `F-001` | Rewrite `docs/features.md` to the `## Inventory` / `## Definitions` format; renumber feature ids to `F-001`. |
| Use-case schema: `F-001-U1` → `U-001`; `feature:` → `features:` list; `f{n}-u{n}.md` → `u-{nnn}-<slug>.md` | Rename use-case files and convert frontmatter to a `features:` list. |

## v5.1.0 (2026-05-21)

### Five workflow entry points

User-facing skills (invoke these only):

| Skill | Purpose |
|-------|---------|
| **`plan-product`** | Establish `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` |
| **`add-backlog`** | Document planned work in `docs/backlog/` |
| **`design-spec`** | Spec before code; invokes `write-plan` internally after worktree setup |
| **`execute-plan`** | Verify worktree → run plan tasks → finish with PR |
| **`fix-bug`** | Log → analyze → resolve → complete |

Internal / gated (do not invoke directly): `write-plan`, `execute-plan-run`, `execute-plan-run-inline`, `execute-plan-finish`, `fix-bug-log`, `fix-bug-resolve`, `fix-bug-complete`.

### Migration from pre-5.1.0 skill names

Update prompts, hooks, and project docs that reference retired skills:

| Retired | Use instead |
|---------|-------------|
| `brainstorming` | **`design-spec`** |
| `writing-plans` | **`write-plan`** (internal — normally reached via `design-spec`) |
| `backlog-workflow` | **`add-backlog`** |
| `subagent-driven-development` | **`execute-plan`** |
| `executing-plans` | **`execute-plan`** (inline fallback is internal `execute-plan-run-inline`) |
| `finishing-a-development-branch` | **`execute-plan`** (finish step is internal `execute-plan-finish`) |
| `bug-workflow`, `bugfix`, `bugfix-lifecycle` | **`fix-bug`** |
| Direct `fix-bug-log` / `fix-bug-resolve` / `fix-bug-complete` | **`fix-bug`** only |

Maintainer test paths:

| Old | New |
|-----|-----|
| `test/subagent-driven-dev/` | **`test/execute-plan-dev/`** |
| `test/brainstorm-server/` | **`test/design-spec-server/`** |
| `test/run-eval-suite.sh` | **`test/run-all.sh`** (`run-eval-suite.sh` aliases `--fast`) |

### Workflow entry-point audit

- **`design-spec` orchestrator parity** — Purpose, Hard policy, Required sub-skills, and `references/policy.md` aligned with `fix-bug` / `execute-plan`.
- **Authoritative docs** — `docs/product.md` and `docs/roadmap.md` list the five user-facing entry points only.
- **Eval coverage** — skill-triggering and explicit-skill-request tests for all entry points; `test/claude-code/test-execute-plan.sh` and `test-fix-bug.sh`.
- **Unified test runner** — `test/run-all.sh` with `--fast`, `--all`, `--integration`, `--full`.
- **Contributor docs** — bundled `@ast-grep/cli` dependency documented (auto-installs into plugin root; consumer repos need no npm deps).

### Ai-plan

- **Automatic during design/plan** — `using-ai-plan` runs when **design-spec** or **write-plan** detects stale or missing index; manual `/ai-plan` after module structure changes only.

## v5.0.8 (2026-05-21)

### Consolidated plugin

- **Development standards bundled** — `standards/` and stack-specific `using-*-standards` skills ship in dev-tools. Install only `dev-tools@jamaynor`; no separate dev-standards or ai-tools plugins.
- **AI Plan bundled** — code-map and ai-plan generators under `scripts/`, `using-ai-plan` skill, `/ai-plan` command. `@ast-grep/cli` installs into the plugin directory on first run (not per consumer repo).

### Workflow and git discipline

- **Worktree hard gate** — after spec approval, design-spec invokes `using-git-worktrees` before `write-plan` (feature branch + isolated workspace, never main/master).
- **PR required at finish** — `execute-plan-finish` pushes the feature branch and opens a PR with `gh pr create` unless project docs explicitly override.
- **Planning context** — one `docs/ai-plan/scopes/<module>.md` per plan; product docs at L2; no generated `BRIEF.md`.

### Codex App

- **using-git-worktrees** — Step 0 detects linked worktrees (Codex App, prior worktree) and skips duplicate creation.
- **execute-plan-finish** — Step 1.5 handoff for detached HEAD in externally managed workspaces; Step 5 skips `git worktree remove` when the host owns the workspace.

## v5.0.7 (2026-03-31)

### GitHub Copilot CLI Support

- **SessionStart context injection** — Copilot CLI v1.0.11 added support for `additionalContext` in sessionStart hook output. The session-start hook now detects the `COPILOT_CLI` environment variable and emits the SDK-standard `{ "additionalContext": "..." }` format, giving Copilot CLI users the full dev-tools bootstrap at session start. (Original fix by @culinablaz in PR #910)
- **Tool mapping** — added `references/copilot-tools.md` with the full Claude Code to Copilot CLI tool equivalence table
- **Skill and README updates** — added Copilot CLI to the `using-dev-tools` skill's platform instructions and README installation section

### OpenCode Fixes

- **Skills path consistency** — the bootstrap text no longer advertises a misleading `configDir/skills/dev-tools/` path that didn't match the runtime path. The agent should use the native `skill` tool, not navigate to files by path. Tests now use consistent paths derived from a single source of truth. (#847, #916)
- **Bootstrap as user message** — moved bootstrap injection from `experimental.chat.system.transform` to `experimental.chat.messages.transform`, prepending to the first user message instead of adding a system message. Avoids token bloat from system messages repeated every turn (#750) and fixes compatibility with Qwen and other models that break on multiple system messages (#894).
