# Setup test push-gate

Install a deterministic **pre-push test gate** into this repository. The gate runs the repo's
auto-detected unit/integration suite and **blocks `git push` on failure**.

This command runs **non-destructively** in the current project repository — it integrates with any
existing hook system and is safe to re-run (idempotent).

## Run

Replace `${PLUGIN_ROOT}` with `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or your dev-tools plugin
directory.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup-test-gate.mjs"
```

Or target another repo explicitly:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup-test-gate.mjs" /path/to/repo
```

## What it does

1. **Vendors a self-contained runner** into the repo at `.githooks/test-gate.mjs` (plus
   `.githooks/detect.mjs`). The runner imports nothing from the plugin, so `git push` gates even
   with `CLAUDE_PLUGIN_ROOT` / `CURSOR_PLUGIN_ROOT` unset (i.e. outside Claude Code / Cursor). Both
   files are refreshed on every run, so a plugin upgrade re-vendors.
2. **Wires `pre-push`** non-destructively, picking the first applicable:
   - **husky** (`.husky/` present) → appends a guarded line to `.husky/pre-push`.
   - **tracked `core.hooksPath`** → adds/chains a guarded `pre-push` there.
   - **neither** → writes `.githooks/pre-push` and runs `git config core.hooksPath .githooks`.

A guard marker (`# >>> dev-tools test-gate >>>`) keeps re-runs idempotent and preserves any
existing hook body.

## Detection & config override

Commands are auto-detected from repo markers (`package.json` `test` script, `*.sln`/`*.csproj` →
`dotnet test`, pytest, `go.mod`, `Cargo.toml`). To override, set the `test` field in
`ai-plan.config.json`:

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
- `enabled: false` → gate is a no-op (per-repo opt-out).
- No tests detected and no config → warns and allows the push (never blocks).

## Notes

- **Bypass:** `git push --no-verify` skips the gate (the explicit escape hatch).
- **E2E is NOT run by the hook.** Playwright (`test.e2e`) is offered as a per-push human ask in
  the agent finish workflow, never in the git hook.
- `core.hooksPath` is per-clone git config; each clone runs this command once.
