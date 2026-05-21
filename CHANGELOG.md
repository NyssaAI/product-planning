# Changelog

## [Unreleased]

### Added

- **`execute-plan`** — single user-facing entry for plan implementation (verify → run → finish + PR). Sub-skills: `execute-plan-run`, `execute-plan-run-inline`, `execute-plan-finish`.
- **`fix-bug`** — single user-facing entry for bug lifecycle (replaces `bugfix-lifecycle` / direct sub-skill invocation).

### Changed

- **Verb-named workflow skills** — `brainstorming` → **`design-spec`**, `backlog-workflow` → **`add-backlog`**, `writing-plans` → **`write-plan`** (internal, invoked by design-spec). Folder names match skill names.
- **Execution chain** — `subagent-driven-development`, `executing-plans`, and `finishing-a-development-branch` → gated sub-skills under **`execute-plan`**.
- **Ai-plan during design** — index regeneration is automatic during **design-spec** / **write-plan** when code exists; manual `/ai-plan` only after module structure changes.
- **Router (`using-dev-tools`)** — routes feature work, backlog, plan implementation, and bugs to canonical entry points only.

## [5.0.8] - 2026-05-21

### Added

- **Bundled development standards** — `standards/`, `manifest.json`, and `using-core-standards` / `using-dotnet-standards` / `using-nextjs-standards` / `using-postgres-standards` / `using-python-standards` skills ship inside dev-tools (no separate dev-standards plugin).
- **Bundled ai-plan** — `scripts/code-map/`, `scripts/ai-plan/`, `using-ai-plan` skill, and `/ai-plan` command. `@ast-grep/cli` is a plugin dependency (auto-installs into the plugin root on first code-map run).
- **docs/standards.md** — documents bundled standards layout for consumers.

### Changed

- **Git workflow gates** — brainstorming requires `using-git-worktrees` after spec approval; `writing-plans`, `executing-plans`, and `subagent-driven-development` verify feature branch/worktree before implementation; `finishing-a-development-branch` requires push + `gh pr create` (override only via project CLAUDE.md/AGENTS.md).
- **Standards surfacing** — brainstorming and writing-plans invoke bundled `dev-tools:using-*-standards` skills (replaces `dev-standards:` peer plugin).
- **ai-plan output** — stops generating `docs/ai-plan/BRIEF.md`; L2 planning context reads `docs/product.md`, `docs/roadmap.md`, and `docs/tech-stack.md` directly. Module scopes under `docs/ai-plan/scopes/` remain the primary planning artifact.
- **project-structure standard** — documents authoritative docs vs generated ai-plan (`docs/specs/`, `docs/plans/`, `docs/ai-plan/scopes/`).
- **Codex App compatibility** — `using-git-worktrees` Step 0 (linked worktree detection); `finishing-a-development-branch` Step 1.5 environment detection and guarded worktree cleanup.

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

- **Brainstorm server ESM fix**: Renamed `server.js` → `server.cjs` so the brainstorming server starts correctly on Node.js 22+ where the root `package.json` `"type": "module"` caused `require()` to fail.
- **Brainstorm owner-PID on Windows**: Skip `BRAINSTORM_OWNER_PID` lifecycle monitoring on Windows/MSYS2 where the PID namespace is invisible to Node.js. Prevents the server from self-terminating after 60 seconds. The 30-minute idle timeout remains as the safety net.
- **stop-server.sh reliability**: Verify the server process actually died before reporting success. Waits up to 2 seconds for graceful shutdown, escalates to `SIGKILL`, and reports failure if the process survives.

### Changed

- **Execution handoff**: Restore user choice between subagent-driven-development and executing-plans after plan writing. Subagent-driven is recommended but no longer mandatory. (Reverts `5e51c3e`)
