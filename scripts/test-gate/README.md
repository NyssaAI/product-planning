# test-gate — polyglot pre-push test gate

A deterministic `git pre-push` hook that runs a consumer repo's unit/integration
tests and **blocks the push** when they fail. Self-contained: once installed it
needs no plugin env vars and runs under plain `git`.

## Install

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup-test-gate.mjs"   # or: /setup-test-gate
```

The installer **vendors** `run.mjs` + `detect.mjs` into the repo at
`.githooks/test-gate.mjs` + `.githooks/detect.mjs`, then wires a guarded
`pre-push` hook non-destructively — integrating with an existing husky or
`core.hooksPath` setup, or creating `.githooks/pre-push` and setting
`core.hooksPath .githooks`. Idempotent; re-run after a plugin upgrade to refresh
the vendored runner. `core.hooksPath` is per clone, so each clone runs the
installer once.

## Detection (auto)

| Marker | Command |
|--------|---------|
| `package.json` with a `test` script | `pnpm`/`yarn`/`npm test` (by lockfile) |
| `*.sln` / `*.csproj` | `dotnet test` |
| pytest — `pytest.ini`, or `pyproject.toml`/`setup.cfg` pytest config/dep, or `test_*.py`/`*_test.py` | `pytest` |
| `go.mod` | `go test ./...` |
| `Cargo.toml` | `cargo test` |

A bare `tests/` directory alone does **not** trigger pytest.

## Config override — `ai-plan.config.json`

```json
{
  "test": {
    "commands": ["npm test", "dotnet test"],
    "e2e": ["npx playwright test"],
    "enabled": true
  }
}
```

- `commands` present → used verbatim (auto-detect skipped).
- `commands` absent → auto-detect.
- `enabled: false` → gate is a no-op.
- `e2e` → **not** run by the git hook. Offered as a per-push human ask in
  `verification-before-completion` / `execute-plan-finish`.

## Behavior

- Runs each command in order; first failure → push blocked (exit 1).
- No tests detected and no config → warns and exits 0 (every push; no sentinel).
- Bypass: `git push --no-verify`.
- E2E (Playwright) is never run by the hook — see the finish-workflow ask.
