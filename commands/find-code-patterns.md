---
description: Find source examples of known code patterns, grouped by module with confidence and evidence limits.
argument-hint: "[target repo path]"
---

# find-code-patterns - locate known code patterns

Generate or refresh a guide to code that may use known patterns, using the current code map and module graph.

**Agent workflow:** Load the `find-code-patterns` skill and follow its workflow — it owns the `${PLUGIN_ROOT}` substitution guidance and applies `using-code-map` freshness rules. If generated context is missing or stale, run `map-code` first. Read `patterns.md`, inspect relevant cited source, and describe candidate pattern families, detector evidence, and remaining verification needs. Use `patterns[].occurrences` in `patterns.json` for locations omitted from the Markdown sample.

## Configuration

Repo-specific pattern configuration is resolved from `.plan-product/config.json`:

- `paths.patternLibrary` defines canonical pattern families and language detectors.
- `paths.patternExpectations` maps module tags to project-specific pattern review expectations; it does not establish that unmatched code needs a pattern.

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

Writes `patterns.md` and `patterns.json` beside the configured code-map artifacts. Markdown shows a bounded set of source examples per module. JSON retains complete occurrence locations. Starter name detectors are `intent-only`; verify relationships in source before claiming a pattern is implemented. Coverage describes detector matches and must not be used as a quality score.

Pattern runs are included in the local usage ledger. Run `generate-module-map.mjs --effectiveness` to summarize command health and recorded metrics; this does not measure task outcomes or usefulness.
