---
name: find-code-patterns
description: Find source examples of known design and coding patterns in the current repo. Use when the user asks where a pattern is used, wants an existing implementation to follow, or wants a report of pattern evidence by module.
---

# Find Code Patterns

Find code that may use known patterns, organized by module, with detector confidence and source locations.

## Workflow

1. If `using-code-map` is not already loaded, read `../using-code-map/SKILL.md` first.
2. Work from the target project root, not from the plugin root. If the user does not provide a target path, use the current workspace root.
3. Apply the code-map staleness gate. If the code map or module graph is missing or stale, run `map-code` first.
4. Resolve the installed plugin root. Prefer `PLAN_PRODUCT_PLUGIN_ROOT`, then `PLUGIN_ROOT`, then `CLAUDE_PLUGIN_ROOT`, then `CURSOR_PLUGIN_ROOT`; otherwise use the installed plugin directory containing this skill. No harness sets a bare `PLUGIN_ROOT`, so substitute the resolved absolute path for `${PLUGIN_ROOT}` in the commands below before running them.
5. Read `.plan-product/config.json` if present. Treat these configured files as the repo-specific tuning surface:
   - `paths.patternLibrary`: canonical pattern families and language detectors.
   - `paths.patternExpectations`: module-tag rules selecting pattern families for source review; these are project expectations, not evidence that a pattern is required.
   If either file is missing during bootstrap, use `paths.patternLibraryTemplate` and `paths.patternExpectationsTemplate`.
6. Generate the module-rooted pattern report:

```bash
node "${PLUGIN_ROOT}/scripts/code-map/generate-patterns.mjs"
```

Use `--json` when the caller needs a machine-readable result.

7. Read the generated `patterns.md` before answering the user. Lead with:
   - relevant known pattern families and the modules containing candidate examples,
   - source locations and what the detector actually matched,
   - confidence and any relationships still requiring source verification.
8. Read the relevant source examples before asserting that code implements a design pattern. Check the report's review criteria, responsibilities, and dependency direction. Use `patterns.json` and filter `patterns[].occurrences` by detector or module when the Markdown sample omits relevant locations.

## Output

This writes `patterns.md` and `patterns.json` beside the configured code-map artifacts.

Pattern runs are included in the local usage ledger when usage capture is enabled. `--effectiveness` on `generate-module-map.mjs` reports command health; it does not measure whether the pattern report improved an agent's work.

Interpretation rules:

- Describe `high` or `medium` matches as evidence of the specific syntax or API shape matched. Confidence is catalog-supplied, not a calibrated probability of design correctness.
- Treat `intent-only` matches as name clues. The starter family detectors identify candidate names, not complete pattern implementations.
- No match does not establish absence. Different names and unsupported syntax can hide a pattern; missing matches do not justify adding abstractions or refactoring.
- Report in terms of canonical families such as `strategy`, `factory`, `adapter`, `facade`, `decorator`, `chain-of-responsibility`, `command`, `observer-pubsub`, `repository`, `dependency-injection`, `service-layer`, `dto-mapper`, `configuration-boundary`, `logging-observability-boundary`, `validation-boundary`, and `error-handling-policy`.
- Use modules and concrete examples as the primary units of the answer.
- JSON coverage fields, including `patternLinePercent`, are descriptive counts of matched syntax ranges. Do not use them as module scores, architecture grades, refactoring priorities, or targets to maximize.
- When the user asks to improve detection, update the configured `paths.patternLibrary` for new families or detectors and `paths.patternExpectations` for module-level expected patterns. Keep detectors language-specific and prefer names, APIs, and syntax that are portable across projects in that language.
- Support design-pattern claims with verified source relationships. Name matches alone cannot establish SOLID conformance, quality, or whether a refactor is beneficial.
- Prefer findings with file examples and module names over generic best-practice advice.
