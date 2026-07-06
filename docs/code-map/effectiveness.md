# plan-product Effectiveness Report

Generated: 2026-07-06T11:46:56.379Z

This report uses local command usage events and current generated artifact health. It does not include provenance, artifact hashes, signatures, or source attestations.

## Usage Summary

Usage events: 7 from `.plan-product/usage/events.jsonl`.

| Command | Runs | Success | Failure | Warning runs | Avg duration | Last status | Last run |
|---------|------|---------|---------|--------------|--------------|-------------|----------|
| `map-architecture` | 2 | 2 | 0 | 0 | 13 ms | ok | 2026-07-06T11:46:49.987Z |
| `doctor` | 1 | 1 | 0 | 0 | 54 ms | ok | 2026-07-06T11:44:17.291Z |
| `find-code-patterns` | 1 | 1 | 0 | 0 | 821 ms | ok | 2026-07-06T11:46:50.834Z |
| `generate-code-map` | 1 | 1 | 0 | 0 | 435 ms | ok | 2026-07-06T11:46:40.585Z |
| `generate-module-map` | 1 | 1 | 0 | 0 | 42 ms | ok | 2026-07-06T11:46:41.444Z |
| `map-code` | 1 | 1 | 0 | 0 | 2.1 s | ok | 2026-07-06T11:46:41.454Z |

## Current Artifact Health

| Artifact | Status | Signal |
|----------|--------|--------|
| `docs/code-map/code-map.json` | present | 46 files, 92 symbols, 0 endpoints; generated 2026-07-06T11:46:40.580Z |
| `docs/code-map/module-map.json` | present | 3 modules, 4 edges; generated 2026-07-06T11:46:41.438Z |
| `docs/code-map/patterns.json` | present | 139 patterns, 2773 matches, 4 modules with evidence, 44.14% pattern-line coverage; generated 2026-07-06T11:46:50.812Z |
| `docs/code-map/system-architecture.md` | present | system architecture artifact exists |

## Doctor Checks

Overall: PASS

| Check | Status | Message |
|-------|--------|---------|
| `required-docs` | PASS | Docs ok: docs/product.md, docs/features.md, docs/tech-stack.md |
| `code-map` | PASS | CODE_MAP ok (46 files, 92 symbols, 0 endpoints) |
| `module-map` | PASS | module-map has 3 modules, 3 module files |
| `agents-md` | PASS | AGENTS.md present |
| `claude-md` | PASS | CLAUDE.md present |

## Recent Runs

| Time | Command | Status | Duration | Summary |
|------|---------|--------|----------|---------|
| 2026-07-06T11:46:50.834Z | `find-code-patterns` | ok | 821 ms | 139 patterns, 2773 matches across 57 eligible files and 4 modules -> docs/code-map/patterns.md |
| 2026-07-06T11:46:49.987Z | `map-architecture` | ok | 14 ms | 3 modules, 4 edges → docs/code-map/system-architecture.md |
| 2026-07-06T11:46:41.454Z | `map-code` | ok | 2.1 s | code-map and module-map generation completed |
| 2026-07-06T11:46:41.444Z | `generate-module-map` | ok | 42 ms | 3 modules → docs/code-map/ (docs: docs/product.md, docs/features.md, docs/tech-stack.md); module map embedded in CLAUDE.md, AGENTS.md |
| 2026-07-06T11:46:40.585Z | `generate-code-map` | ok | 435 ms | 92 symbols in 46 files -> docs/code-map/code-map.json |
| 2026-07-06T11:46:39.463Z | `map-architecture` | ok | 12 ms | 3 modules, 4 edges → docs/code-map/system-architecture.md |
| 2026-07-06T11:44:17.291Z | `doctor` | ok | 54 ms | doctor PASS |

## Effectiveness Signals

- Healthy usage means repeated successful runs with low failure counts and actionable warnings.
- Healthy generated context means doctor passes and the code-map, module-map, architecture, and pattern artifacts are present and fresh enough for planning.
- Pattern metrics are review signals, not correctness scores. Inspect cited modules before changing code.

