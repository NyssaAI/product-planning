# Implementation Plan — Polyglot test push-gate + E2E finish-ask

**Spec:** `docs/agent-plan/specs/2026-06-17-test-push-gate-design.md`
**Branch:** `feat/test-push-gate` (base: `main` @ 9525e61)
**PR target:** `main`
**Planning area:** `scripts/test-gate/` + `scripts/setup-test-gate.mjs` + `hooks/` + `skills/`

Deterministic `pre-push` git hook runs auto-detected unit/integration tests (node/dotnet/pytest/go/cargo, config-overridable) and blocks the push on failure; a self-contained runner is **vendored into the consumer repo** so push works with no plugin env vars. Playwright E2E stays a per-push human ask in the agent finish workflow (`verification-before-completion` / `execute-plan-finish`), never blocking. Installed non-destructively; proposed by `align-project-structure`.

Standards: zero third-party deps; `Result`-style returns where the lib has them, plain exit codes in the hook runner; behavior-focused tests; non-destructive idempotent installers (matches `setup-git-hooks.sh`). Each phase ends green (existing `ai-plan`/`code-map`/node suites still pass) and is independently committable.

**Skill edits (Phase 4) go through `dev-tools:writing-skills`** — baseline (RED) before editing, verify (GREEN) after — per repo policy that skills are behavior-shaping code.

---

## Phase 1 — Detection core (`scripts/test-gate/detect.mjs`)

- [ ] **1.1 Detector** — `detectTestCommands(repoRoot) -> string[]`: ordered polyglot matrix — `package.json` `test` script (pnpm/yarn/npm by lockfile), `*.sln`/`*.csproj` → `dotnet test`, pytest (strict, below), `go.mod` → `go test ./...`, `Cargo.toml` → `cargo test`. Pure file reads, no spawning.
- [ ] **1.2 Pytest strictness** — detect pytest only via `pytest.ini`, or `pyproject.toml`/`setup.cfg` with pytest config (`[tool.pytest.ini_options]`/`[pytest]`) or `pytest` dep, or `test_*.py`/`*_test.py` files. A bare `tests/` dir must NOT trigger.
- [ ] **1.3 Playwright detection** — `detectPlaywright(repoRoot) -> { present, commands }`: `playwright.config.{ts,js,mjs,cjs}` present AND `@playwright/test` in deps/devDeps. Used by the finish-ask layer only.
- [ ] **1.4 Config resolution** — `resolveTestPlan(repoRoot)`: read `ai-plan.config.json` `test` field — `commands` present → verbatim (skip auto-detect); absent → detect; `enabled:false` → empty (no-op); surface `e2e` separately.
- [ ] **1.5 Unit tests + fixtures** — `test/test-gate/` fixtures per stack (node-with-test-script, node-without, dotnet `.sln`, go, cargo, playwright-present) + pytest positive (ini / pyproject-config / `test_*.py`) and **negative** (`pyproject.toml`, no pytest, bare `tests/`). Assert resolved command list; config override verbatim; `enabled:false` no-op; `e2e` excluded from hook commands.

## Phase 2 — Self-contained runner (`scripts/test-gate/run.mjs`)

- [ ] **2.1 Runner** — `run.mjs`: call `resolveTestPlan` (inlined/bundled — zero plugin imports), run each command in order via `child_process`, stream output, **exit 1 on first failure**. No-tests-and-no-config → print warning, `exit 0` every push (no sentinel). Never runs `e2e`. Reads `ai-plan.config.json` from repo root (cwd).
- [ ] **2.2 Self-containment** — `detect.mjs` + `run.mjs` import nothing outside `scripts/test-gate/`; verify the vendored single file (or inlined bundle) runs standalone. Decide: single-file runner (inline detect) vs. copy both files — pick single self-contained `test-gate.mjs` artifact for vendoring.
- [ ] **2.3 Behavior tests** — failing command → exit 1; passing → exit 0; first-failure-stops (second command not run); no-tests → exit 0 + warning text.

## Phase 3 — Installer + hook template (`scripts/setup-test-gate.mjs`, `hooks/`, `commands/`)

- [ ] **3.1 Vendor step** — installer resolves plugin root (agent-run: `CLAUDE_PLUGIN_ROOT`/`CURSOR_PLUGIN_ROOT` or `findPluginRoot`) and copies/renders the self-contained runner to tracked `.githooks/test-gate.mjs` in the consumer repo.
- [ ] **3.2 Hook wiring (non-destructive)** — husky (`.husky/`) → append guarded line to `.husky/pre-push`; tracked `core.hooksPath` dir → add/chain `pre-push`; neither → write tracked `.githooks/pre-push` (`node .githooks/test-gate.mjs`) + `git config core.hooksPath .githooks`. Guard marker; never clobber existing hook bodies.
- [ ] **3.3 Idempotency** — re-run makes no further changes; re-run after simulated plugin-version change refreshes vendored `.githooks/test-gate.mjs`. Pre-existing `pre-push` preserved (chained).
- [ ] **3.4 Command doc** — `commands/setup-test-gate.md` (invokes `node "${CLAUDE_PLUGIN_ROOT}/scripts/setup-test-gate.mjs"`), mirroring existing command docs.
- [ ] **3.5 Hook integration test** — `test/test-gate/run-test.sh` mirroring `test/version-hooks/run-test.sh`: temp git repo — failing test blocks push, passing allows, `--no-verify` bypasses, pre-existing husky `pre-push` preserved, **`CLAUDE_PLUGIN_ROOT`+`CURSOR_PLUGIN_ROOT` unset still gates**, install idempotent.

## Phase 4 — Skill wiring (via `dev-tools:writing-skills`)

- [ ] **4.1 align-project-structure** — Step 4 (ask-first): detect "no pre-push test gate wired" → offer install on approval (git-behavior change; not silent Step 3). RED baseline → edit → GREEN verify with subagents.
- [ ] **4.2 verification-before-completion** — add: before claiming complete / before push, detect Playwright → ask human "Run E2E now?" → on yes run + must pass; on no never block, record "E2E skipped". RED→GREEN.
- [ ] **4.3 execute-plan-finish** — same E2E detect→ask→run/skip step before push; on skip, add a Test Plan entry to the PR body (and final response). RED→GREEN.
- [ ] **4.4 Config schema** — `scripts/ai-plan/lib/config.mjs`: accept + validate the `test` field (`commands[]`, `e2e[]`, `enabled`); malformed → ignore with logged warning (config remains valid). Add to `ai-plan.config.example.json`.

## Phase 5 — Docs + release

- [ ] **5.1 README** — `scripts/test-gate/README.md`: detection matrix, config override, install, bypass, E2E behavior.
- [ ] **5.2 RELEASE-NOTES** — v-next entry (feature). Version bump deferred to release cut (`bump-version.sh`), per repo "bump once per release" policy.
- [ ] **5.3 Regenerate ai-plan context** — run `code-map` + `ai-plan` so the new `scripts/test-gate/` module + CLAUDE.md map are current.

## Verification (per phase and final)

- Plain exit codes from the hook runner (0 pass / 1 block); structured/clear warnings; no thrown exceptions for expected "no tests" path.
- Self-contained runner: `git push` gates with both plugin env vars unset (Phase 3.5).
- Non-destructive: existing husky / `core.hooksPath` hooks preserved; install idempotent.
- All existing node unit suites (`test/ai-plan`, `test/code-map`) + `test/version-hooks` still pass; new `test/test-gate` passes.
- Every acceptance criterion in the spec satisfied.
- Skill edits validated RED→GREEN per `dev-tools:writing-skills`.
