---
description: Generate or refresh module-rooted code pattern artifacts from the current code map and module graph.
argument-hint: "[target repo path]"
---

# find-code-patterns - review module-rooted code patterns

Generate or refresh module-rooted code pattern artifacts from the current code map and module graph.

**Agent workflow:** Apply `using-code-map` staleness rules. If generated context is missing or stale, run `map-code` first. Read the generated `patterns.md` and summarize pattern usage by module, including each module's `patternLinePercent`, expected patterns not detected, and files without headline pattern evidence.

## Configuration

Repo-specific pattern configuration is resolved from `.plan-product/config.json`:

- `paths.patternLibrary` defines canonical pattern families and language detectors.
- `paths.patternExpectations` maps module tags to expected pattern families.

The starter files are copied from `paths.patternLibraryTemplate` and `paths.patternExpectationsTemplate` during bootstrap. Use the configured pattern files to tune language matching and module expectations without changing the generated report artifacts.

## Run

Replace `${PLUGIN_ROOT}` with `PLAN_PRODUCT_PLUGIN_ROOT`, `PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or the installed plugin directory.

```bash
node "${PLUGIN_ROOT}/scripts/code-map/generate-patterns.mjs"
```

Machine-readable result:

```bash
node "${PLUGIN_ROOT}/scripts/code-map/generate-patterns.mjs" --json
```

## Output

Writes `patterns.md` and `patterns.json` beside the configured code-map artifacts. The report is organized around application modules so pattern family usage, pattern line coverage, and missing expected patterns can be used as code quality review signals.

Pattern runs are included in the local usage ledger. Run `generate-module-map.mjs --effectiveness` to summarize command success, warnings, artifact health, and pattern-report metrics.
