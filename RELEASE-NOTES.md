# dev-tools Release Notes

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
