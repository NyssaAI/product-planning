# Changelog

## [5.0.7] - 2026-04-24

### Added

- **plan-product skill**: Establishes foundational product documentation (full PRD, roadmap, tech stack) for new projects through interactive conversation, conforming to the dev-standards project-structure layout.
- **bug-workflow skill**: Formally documents a newly discovered bug in `docs/bugs/{timestamp}-{slug}/` with a detail file and scoped discovery commit. Paired with the bugfix skill for the resolution step.
- **bugfix skill**: Reads a bug detail file and drives an iterative Ralph loop (examine → plan → implement → test → critique → resolve) until the fix is verified and all tests pass.
- **backlog-workflow skill**: Adds a planned work item to `docs/backlog/{timestamp}-{slug}/` with a detail file, ready to be turned into a plan later.

### Changed

- **Rebrand**: Project forked from superpowers 5.0.7 by Jesse Vincent and renamed to dev-tools, maintained by jamaynor. Plugin identity, install paths, and marketplace entries updated across Claude Code, Cursor, OpenCode, Codex, and Gemini CLI manifests. Upstream attribution preserved in README and this CHANGELOG.
- **Standards surfacing**: The brainstorming skill now invokes `dev-standards:using-*-standards` peer-plugin skills instead of reading hardcoded filesystem paths, making the skill portable across machines.

### Fixed

- **plugin.json validation and install instructions**: Corrected manifest fields and installation docs following the rebrand.
- **bugfix terminology**: Renamed `{slug}` → `{bug_id}` throughout the skill to remove a naming collision with `bug-workflow` (where `slug` is the short descriptor, not the full identifier). Pinned `--max-iterations 20` on the Ralph loop and removed a duplicated "plan a failing test" step.

## [5.0.5] - 2026-03-17

### Fixed

- **Brainstorm server ESM fix**: Renamed `server.js` → `server.cjs` so the brainstorming server starts correctly on Node.js 22+ where the root `package.json` `"type": "module"` caused `require()` to fail. ([PR #784](https://github.com/obra/superpowers/pull/784) by @sarbojitrana, fixes [#774](https://github.com/obra/superpowers/issues/774), [#780](https://github.com/obra/superpowers/issues/780), [#783](https://github.com/obra/superpowers/issues/783))
- **Brainstorm owner-PID on Windows**: Skip `BRAINSTORM_OWNER_PID` lifecycle monitoring on Windows/MSYS2 where the PID namespace is invisible to Node.js. Prevents the server from self-terminating after 60 seconds. The 30-minute idle timeout remains as the safety net. ([#770](https://github.com/obra/superpowers/issues/770), docs from [PR #768](https://github.com/obra/superpowers/pull/768) by @lucasyhzhu-debug)
- **stop-server.sh reliability**: Verify the server process actually died before reporting success. Waits up to 2 seconds for graceful shutdown, escalates to `SIGKILL`, and reports failure if the process survives. ([#723](https://github.com/obra/superpowers/issues/723))

### Changed

- **Execution handoff**: Restore user choice between subagent-driven-development and executing-plans after plan writing. Subagent-driven is recommended but no longer mandatory. (Reverts `5e51c3e`)
