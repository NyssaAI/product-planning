# Test push-gate + E2E finish-ask — design

**Status:** approved (design)
**Date:** 2026-06-17

## Problem

dev-tools enforces testing only *behaviorally* — via the `test-driven-development` and
`verification-before-completion` skills. An agent under pressure can still skip running a
consumer repo's tests, and nothing deterministic catches it. dev-tools gates *itself* with a
`.githooks/pre-push` + `scripts/setup-git-hooks.sh` (version `--check`), but ships no equivalent
test gate to the repos that consume the plugin. There is also no declaration of *how* to run a
repo's tests, so any enforcement must first solve discovery.

## Goal

Give consumer repos a deterministic, polyglot **pre-push test gate** that runs the repo's
unit/integration suite and blocks the push on failure, plus a **per-push human ask** for slow
Playwright E2E that lives in the agent finish workflow (not the git hook).

## Module scope

**Primary modules:**
- `scripts` (`docs/agent-plan/context/modules/scripts.md`) — detection, runner, installer
- `hooks` (`docs/agent-plan/context/modules/hooks.md`) — `pre-push` template
- `skills` (`docs/agent-plan/context/modules/skills.md`) — align wiring + verification/finish E2E ask

**Touch points:** `scripts-ai-plan` (`config.mjs` — `test` config schema; read, not co-designed beyond the new field).

## Design

### Two enforcement layers

| Layer | What | Determinism |
|-------|------|-------------|
| **Pre-push git hook** | Runs auto-detected unit/integration test commands; hard-blocks the push on any failure | Git-enforced — fires regardless of agent compliance |
| **E2E finish-ask** | `verification-before-completion` / `execute-plan-finish` detect Playwright and ask the human *"Run E2E now?"* before each push; on yes → run + must pass; on no → **never block** — record "E2E skipped" in the agent's final response, and add a Test Plan entry to the PR body when a PR is created/updated | Skill-enforced (deliberate — git hooks are non-interactive) |

### Polyglot detection — `scripts/test-gate/detect.mjs`

Auto-detect from repo markers; produce an ordered list of unit/integration commands. First
failure stops the push.

| Marker | Command |
|--------|---------|
| `package.json` with a `test` script | repo package-manager `test` (pnpm/yarn/npm chosen by lockfile) |
| `*.sln` / `*.csproj` | `dotnet test` |
| pytest (see strictness below) | `pytest` |
| `go.mod` | `go test ./...` |
| `Cargo.toml` | `cargo test` |

**Pytest strictness** (a bare `tests/` dir must **not** trigger pytest). Detect pytest only when at
least one holds:
- `pytest.ini` exists; **or**
- `pyproject.toml` (or `setup.cfg`) contains pytest config (`[tool.pytest.ini_options]` /
  `[pytest]`) or lists `pytest` as a dependency; **or**
- the repo contains Python test files matching `test_*.py` or `*_test.py`.

Playwright detection (for the finish-ask layer, **not** the hook): `playwright.config.{ts,js,mjs,cjs}`
present **and** `@playwright/test` in `package.json` deps/devDeps.

### Config override — `ai-plan.config.json`

```json
{
  "test": {
    "commands": ["npm test", "dotnet test"],
    "e2e": ["npx playwright test"],
    "enabled": true
  }
}
```

- `commands` present → used verbatim, **auto-detect skipped**.
- `commands` absent → auto-detect (table above).
- `e2e` → consumed by the finish-ask layer only.
- `"enabled": false` → gate is a no-op (per-repo opt-out).

### Hook behavior — `scripts/test-gate/run.mjs` (canonical source; vendored into the repo, see Runtime resolution)

1. Resolve commands (config `commands` or detect).
2. Run each in order; **exit 1 on first failure** → push blocked, failing output shown.
3. **No tests detected and no config** → print a warning and `exit 0` on **every** push until the
   repo is configured (no persistent sentinel or state file — re-warn each push). Cannot force what
   does not exist; align surfaces the gap separately.
4. **Bypass** = standard `git push --no-verify` (documented as the explicit escape hatch).
5. E2E never runs here — `test.e2e` is ignored by the hook.

### Runtime resolution — the hook must NOT depend on plugin env vars

A consumer repo's `pre-push` runs under ordinary `git`, frequently outside Claude Code / Cursor,
so `CLAUDE_PLUGIN_ROOT` / `CURSOR_PLUGIN_ROOT` are **usually absent at push time** and cannot be
relied on. Baking an absolute path to the plugin's cache copy is also fragile — the cache path is
version-pinned (`.../dev-tools/<version>/...`) and breaks on plugin upgrade.

**Resolution: vendor a self-contained runner into the repo at install time.** `setup-test-gate`
(which runs under the agent, where the plugin root *is* resolvable) copies a dependency-free runner
to a tracked, repo-local path — `.githooks/test-gate.mjs` — and the `pre-push` hook invokes it as
`node .githooks/test-gate.mjs` (path relative to repo root). The runner contains the full detection
+ execution logic and reads `ai-plan.config.json` from the repo root; it imports nothing from the
plugin. The plugin's `scripts/test-gate/run.mjs` is the canonical **source**; install copies/renders
it. Re-running `setup-test-gate` (e.g. after a plugin upgrade) refreshes the vendored copy.

This means a `git push` works with both `CLAUDE_PLUGIN_ROOT` and `CURSOR_PLUGIN_ROOT` unset.

### Non-destructive install — `scripts/setup-test-gate.mjs` + `commands/setup-test-gate.md`

Vendor the runner (above), then wire the hook into the repo's existing hook system —
**integrate, never clobber**:

- **husky present** (`.husky/`) → append a guarded line invoking `.githooks/test-gate.mjs` to
  `.husky/pre-push`.
- **`core.hooksPath` set to a tracked dir** → add/chain `pre-push` there.
- **neither** → install a tracked `.githooks/pre-push` and set `core.hooksPath .githooks`. The
  committed hook + runner are team-shareable (mirrors how dev-tools gates itself), but the
  `core.hooksPath` git-config is **per clone** — each clone still runs `setup-test-gate` once
  (the config is not propagated automatically).

Idempotent via a guard marker comment; safe to re-run.

### Wiring

- **`align-project-structure`** — Step 4 (ask-first): detects "no test gate wired" and installs on
  human approval (git-behavior change → not a silent Step 3 auto-fix).
- **`setup-test-gate`** command — explicit/standalone install.
- **`verification-before-completion`** + **`execute-plan-finish`** — add the Playwright detect → ask
  → run-or-skip step before push.

## Testing strategy

- **Detector unit tests** (`test/test-gate/`): fixture repos per stack (node-with-test-script,
  node-without, dotnet `.sln`, pytest, go, cargo, playwright-present) → assert resolved command list.
- **Pytest strictness fixtures**: positive (`pytest.ini`; `pyproject.toml` with pytest config/dep;
  `test_*.py` present) → pytest detected; **negative** (`pyproject.toml` present but **no** pytest
  config/dep and a bare `tests/` dir with no `test_*.py`) → pytest **not** detected.
- **Config/override tests**: `commands` verbatim, `enabled:false` no-op, `e2e` not in hook list.
- **Hook integration test** (mirrors `test/version-hooks/run-test.sh`): temp git repo — failing test
  blocks push, passing allows, `--no-verify` bypasses, pre-existing husky `pre-push` preserved.
- **Env-independence test**: run the integration `git push` with `CLAUDE_PLUGIN_ROOT` **and**
  `CURSOR_PLUGIN_ROOT` unset — the vendored runner still gates (blocks on failure, allows on pass).
- **Install idempotency**: second `setup-test-gate` run makes no further changes; a re-run after a
  simulated plugin-version change refreshes the vendored `.githooks/test-gate.mjs`.

## Acceptance criteria

- [ ] A pre-push hook installed by `setup-test-gate` blocks `git push` when a detected test command fails, and allows it when all pass.
- [ ] Detection resolves the correct command(s) for node (test script), dotnet (`.sln`/`.csproj`), pytest, go, and cargo fixture repos.
- [ ] Pytest is detected only via `pytest.ini`, `pyproject.toml`/`setup.cfg` pytest config or dep, or `test_*.py`/`*_test.py` files — a bare `tests/` dir alone does **not** trigger it (negative fixture passes).
- [ ] The gate works when invoked by `git push` with both `CLAUDE_PLUGIN_ROOT` and `CURSOR_PLUGIN_ROOT` unset (vendored runner; no plugin-env dependency).
- [ ] `ai-plan.config.json` `test.commands` overrides auto-detection verbatim; `test.enabled:false` makes the gate a no-op.
- [ ] A repo with no tests and no config warns and exits 0 on every push (no persistent sentinel), never blocking.
- [ ] `git push --no-verify` bypasses the gate.
- [ ] Install integrates with an existing husky `pre-push` (and a tracked `core.hooksPath` hook) without overwriting it; re-running install is idempotent and refreshes the vendored runner.
- [ ] Playwright E2E never runs in the git hook; it is offered as a per-push human ask in `verification-before-completion` / `execute-plan-finish`, runs only on a yes, and must pass before push when run.
- [ ] On an E2E "no", the push is never blocked and the skip is recorded in the agent's final response plus the PR Test Plan (when a PR is created/updated).
- [ ] `align-project-structure` proposes the gate (ask-first) when none is wired, and installs it on approval.

## Standards Applied

| Standard | Key constraints for this design |
|----------|---------------------------------|
| testing-principles | The gate runs the repo's **real** suite (no mocks/stubs of the test step); E2E must actually execute when the human opts in. |
| project-structure | New code under `scripts/test-gate/`; installer at `scripts/setup-test-gate.mjs`; hook template under `hooks/`; tests under `test/test-gate/` mirroring existing `test/` layout. |
| (plugin convention) | The **installer** (agent-run) may resolve the plugin root via `CLAUDE_PLUGIN_ROOT`/`CURSOR_PLUGIN_ROOT`, but the **installed hook/runner is vendored and self-contained** — no plugin-env dependency at `git push` time. Never require a per-consumer npm install; non-destructive, idempotent installers (matches `setup-git-hooks.sh`). |
