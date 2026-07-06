---
name: find-code-patterns
description: Review module-rooted code patterns and practice signals for the current repo. Use when the user asks whether architecture or coding practices are sound, where design/coding patterns are used or missing, whether modules show SOLID-style responsibility boundaries, or to produce a code quality pattern report.
---

# Find Code Patterns

Review the mapped codebase for structural pattern evidence rooted in application modules.

## Workflow

1. If `using-code-map` is not already loaded, read `../using-code-map/SKILL.md` first.
2. Work from the target project root, not from the plugin root. If the user does not provide a target path, use the current workspace root.
3. Apply the code-map staleness gate. If the code map or module graph is missing or stale, run `map-code` first.
4. Resolve the installed plugin root. Prefer `PLAN_PRODUCT_PLUGIN_ROOT`, then `PLUGIN_ROOT`, then `CLAUDE_PLUGIN_ROOT`, then `CURSOR_PLUGIN_ROOT`; otherwise use the installed plugin directory containing this skill.
5. Read `.plan-product/config.json` if present. Treat these configured files as the repo-specific tuning surface:
   - `paths.patternLibrary`: canonical pattern families and language detectors.
   - `paths.patternExpectations`: module-tag rules for which pattern families should appear in which kinds of modules.
   If either file is missing during bootstrap, use `paths.patternLibraryTemplate` and `paths.patternExpectationsTemplate`.
6. Generate the module-rooted pattern report:

```bash
node "${PLUGIN_ROOT}/scripts/code-map/generate-patterns.mjs"
```

Use `--json` when the caller needs a machine-readable result.

7. Read the generated `patterns.md` before answering the user. Lead with:
   - modules with broad pattern evidence,
   - modules with sparse or no pattern evidence,
   - each module's pattern line coverage percentage,
   - pattern families detected in each module,
   - expected patterns not detected in matching modules,
   - files without headline pattern evidence that deserve inspection,
   - concrete next refactor or review targets.

## Output

This writes `patterns.md` and `patterns.json` beside the configured code-map artifacts.

Pattern runs are included in the local usage ledger when usage capture is enabled. Use `--effectiveness` on `generate-module-map.mjs` for the effectiveness report.

Interpretation rules:

- Treat pattern matches as structural evidence, not proof of author intent.
- Treat missing expected patterns as a quality review signal, not an automatic defect.
- Report in terms of canonical families such as `strategy`, `factory`, `adapter`, `facade`, `decorator`, `chain-of-responsibility`, `command`, `observer-pubsub`, `repository`, `dependency-injection`, `service-layer`, `dto-mapper`, `configuration-boundary`, `logging-observability-boundary`, `validation-boundary`, and `error-handling-policy`.
- Use intent-only smell families such as direct external API/database/config access to choose inspection targets, not to score headline pattern coverage.
- Use application modules as the primary unit of review. Avoid giving only repo-wide coverage numbers.
- Use `patternLinePercent` as the module score for how much eligible source code is inside detected headline pattern evidence.
- When the user asks to improve detection, update the configured `paths.patternLibrary` for new families or detectors and `paths.patternExpectations` for module-level expected patterns. Keep detectors language-specific and prefer names, APIs, and syntax that are portable across projects in that language.
- Root SOLID/design-pattern commentary in module evidence: responsibilities, dependency direction, repeated code shapes, and files without pattern evidence.
- Prefer findings with file examples and module names over generic best-practice advice.
