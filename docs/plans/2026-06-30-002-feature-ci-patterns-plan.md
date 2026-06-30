---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
title: "/ci patterns pattern coverage report"
created_at: 2026-06-30
updated_at: 2026-06-30
product_contract_source:
  - docs/features.md
  - docs/product.md
planning_context:
  - docs/code-index/index.md
  - docs/code-index/modules/code-map.md
  - docs/code-index/modules/module-map.md
  - docs/code-index/modules/lib.md
---

# /ci patterns Pattern Coverage Report Plan

## Goal Capsule

Build the planned `/ci patterns` feature so the code-indexer plugin can scan a target repo for structurally detectable code patterns and write two generated artifacts:

- `docs/code-index/patterns.json` for machine-readable pattern matches, counts, confidence tiers, and module attribution.
- `docs/code-index/patterns.md` for a human-readable pattern coverage report.

The user-facing command is `/ci patterns`. The low-level installed-plugin command should be:

```powershell
node "${PLUGIN_ROOT}/scripts/code-map/generate-patterns.mjs"
```

Primary planning module: `docs/code-index/modules/code-map.md`, because pattern scanning is another ast-grep-based source analysis pass and should reuse the code-map scan roots, supported languages, ast-grep binary resolution, skip rules, and module attribution conventions.

Coupled modules:

- `docs/code-index/modules/module-map.md` for `code-indexer.config.json`, output-dir conventions, persisted `module-map.json`, and command/skill workflow docs.
- `docs/code-index/modules/lib.md` for shared ast-grep resolution and scan-result parsing.

The feature must be honest about precision: ast-grep can identify structural and naming evidence, not prove author intent. The generated coverage must therefore be broken out by confidence tier rather than presented as a single over-claimed score.

## Product Contract

### Source Requirement

`docs/features.md` defines F-014 `/ci patterns` as a planned command that:

- Scans for structurally detectable code patterns.
- Writes `docs/code-index/patterns.md` and `docs/code-index/patterns.json`.
- Reports named patterns, occurrence counts, and percent-of-codebase coverage attributed per module.
- Runs a plugin seed catalog of ast-grep rules plus repo-defined extensions.
- Uses tiered confidence: `high`, `medium`, and `intent-only`.

`docs/product.md` repeats the same planned capability and adds the explicit product limit: ast-grep matches structure and naming, not raw intent.

### Requirements

REQ-001: `/ci patterns` must be the user-facing command phrasing in skill docs, command docs, README-level docs, and product docs.

REQ-002: Consumer-facing command docs must resolve scripts through the installed plugin root:

```powershell
node "${PLUGIN_ROOT}/scripts/code-map/generate-patterns.mjs"
```

Bare repo-local commands such as `node scripts/code-map/generate-patterns.mjs` are maintainer shortcuts only.

REQ-003: The command must write `docs/code-index/patterns.json` and `docs/code-index/patterns.md` by default, respecting `code-indexer.config.json` `outputDir` when a target repo changes the generated artifact directory.

REQ-004: The command must read the existing code-index artifacts rather than duplicate their responsibilities:

- `docs/code-index/code-map.json` for the previous code-map run, source roots, language list, and already-attributed module fields where available.
- `docs/code-index/module-map.json` for module metadata and fallback module attribution.
- Configured source roots for the complete source-file inventory used as the coverage denominator.

REQ-005: If `code-map.json` or `module-map.json` is missing or malformed, the command must fail clearly and tell the agent to run normal `/ci` first. It must not silently scan partial data and present it as complete coverage.

REQ-006: Pattern definitions must come from:

- A bundled plugin seed catalog committed under `scripts/code-map/patterns/`.
- Optional repo-defined extension catalog files configured in `code-indexer.config.json`.

REQ-007: Pattern definitions must be validated before scanning. Invalid IDs, invalid confidence tiers, missing language/rule data, duplicate IDs, and missing extension files must produce parseable failures.

REQ-008: The result model must distinguish three confidence tiers:

- `high`: precise structural rule with a narrow, language-aware AST shape.
- `medium`: structural rule with broader matching or naming conventions.
- `intent-only`: weak evidence that suggests a pattern but cannot support coverage claims.

REQ-009: Headline coverage must not include `intent-only` matches. The report may show `intent-only` signals separately, but the primary coverage percentage must be computed from `high` plus `medium` matched files, with tier-specific percentages shown beside it.

REQ-010: Percent-of-codebase coverage must be based on pattern-eligible files from configured scan roots, not on symbol count and not only on `code-map.json.files`. Pattern-eligible means the file extension is supported by both `SOURCE_EXTENSIONS` and at least one enabled catalog rule for that file's language. Unsupported-but-detected source extensions such as Ruby, PHP, Swift, C, C++, F#, and Visual Basic must be reported as excluded files, not counted in the headline denominator.

REQ-011: Module attribution must use existing `moduleId`, `moduleName`, `moduleRoot`, and `planningModule` fields from `code-map.json.files` when present, and fall back to longest-prefix matching against modules from `module-map.json` when needed.

REQ-012: The command must support `--json` for parseable success and failure output, including stable `ok`, `wrote`, `patterns`, `matches`, `sourceFiles`, `eligibleFiles`, `excludedFiles`, `coveragePercent`, `warnings`, `errors`, and `summary` fields.

REQ-013: The command must support no extra third-party dependencies beyond the plugin's existing `@ast-grep/cli` dependency.

REQ-014: Existing `/ci`, `/ci arch`, `code-map`, `module-map`, doctor, init, migrate, pin, and unpin behavior must remain unchanged.

REQ-015: Seed patterns must be materially different from existing code-map symbol extraction. Public/exported functions, classes, interfaces, records, enums, and types may be reused as input evidence, but they must not be shipped as headline "pattern" rows unless the report labels them as public-surface inventory and excludes them from headline pattern coverage.

REQ-016: The plan must define one catalog format before implementation. Bundled catalogs and repo-defined extension catalogs use JSON files. The implementation may emit temporary ast-grep YAML for the CLI, but JSON is the persisted catalog contract.

REQ-017: Tests must cover catalog validation, bundled and repo-defined catalogs, confidence-tier coverage math, pattern-eligible denominator math, module attribution, markdown rendering, CLI JSON success, CLI JSON failure, and command-doc install-root guidance.

## Planning Contract

### Planning Context

Selected module: `code-map`

`code-map` owns feature code under `scripts/code-map/` and already exposes:

- `generate-code-map.mjs`, which runs ast-grep, parses matches, builds `code-map.json`, and annotates files, symbols, and endpoints with module metadata.
- `lib/code-map-config.mjs`, which owns scan roots, supported languages, output paths, and source extensions.
- `lib/module-linker.mjs`, which already implements longest-prefix module attribution.
- `scripts/code-map/rules/*.yml`, the existing ast-grep rule structure.

Directly coupled modules:

- `module-map` owns `code-indexer.config.json`, `outputDir`, `module-map.json`, and the canonical command/skill workflow. Pattern outputs live beside module-map outputs, so config integration must be compatible.
- `lib` owns `resolveAstGrepBinary`, `parseScanJson`, skip-dir constants, and plugin-root utilities. Pattern scanning should reuse these helpers rather than reimplementing ast-grep process handling or JSON parsing.

### Key Technical Decisions

KTD-001: Implement `/ci patterns` as a new code-map generator, not a flag on `module-map/generate.mjs`.

The behavior is source-pattern scanning, not module graph rendering. Add:

```text
scripts/code-map/generate-patterns.mjs
scripts/code-map/lib/patterns/
scripts/code-map/patterns/
```

This keeps the owning module aligned with existing ast-grep and code-map behavior. Command docs can still make `/ci patterns` look like one short workflow.

KTD-002: Use persisted code-index artifacts as the scan contract.

The pattern generator loads `code-map.json` and `module-map.json` first. It uses them for:

- Freshness and prior-code-index context.
- Source roots and language hints, cross-checked against current config.
- Existing module attribution.
- Output directory and generated artifact location.
- Staleness/freshness guidance in failure messages.

The command should scan a complete source-file inventory from configured scan roots, then narrow that inventory to pattern-eligible files for headline coverage. Existing `code-map.json.files` cannot be the denominator because it only contains files with indexed symbols. Extract the existing `sourceFilesInRoots` logic from `generate-code-map.mjs` into a reusable helper so code-map generation and pattern generation agree on source-file discovery. If the inventory is empty, fail with `NO_SOURCE_FILES` and point at roots/config rather than reporting zero coverage as success. If the inventory exists but no files are pattern-eligible for the enabled catalogs, fail with `NO_PATTERN_ELIGIBLE_FILES` and report the excluded unsupported language/extensions.

KTD-003: Keep the pattern catalog data-driven and repo-extensible.

Use JSON for both bundled seed catalogs and repo-defined extensions:

```text
scripts/code-map/patterns/
|-- javascript.json
|-- typescript.json
|-- csharp.json
|-- python.json
|-- java.json
`-- go.json
```

Catalog entries use a small schema that maps directly to ast-grep:

```json
{
  "patterns": [
    {
      "id": "dependency-injection-constructor",
      "name": "Dependency injection constructor",
      "language": "TypeScript",
      "confidence": "high",
      "description": "Constructor parameters on exported classes.",
      "rule": {
        "kind": "class_declaration",
        "has": { "kind": "constructor_signature" }
      }
    }
  ]
}
```

Repo-defined extensions are configured in `code-indexer.config.json`:

```json
{
  "patterns": {
    "catalogs": ["code-indexer.patterns.json"]
  }
}
```

Default behavior: if the config omits `patterns.catalogs`, use only the bundled seed catalog. Do not implicitly load arbitrary files unless the filename and location are documented and tested.

KTD-004: Emit temporary ast-grep rule files from JSON catalogs with a narrow writer.

Repo extensions also use JSON so target repos do not need a parser dependency or ambiguous YAML support:

```json
{
  "patterns": [
    {
      "id": "project-command-handler",
      "name": "Project command handler",
      "language": "JavaScript",
      "confidence": "medium",
      "description": "Functions named handle*Command.",
      "rule": {
        "pattern": "function handle$NAME($$$) { $$$ }"
      }
    }
  ]
}
```

The implementation should convert validated JSON catalog entries into temporary ast-grep rule/config files for the current run. Do not parse arbitrary YAML. If ast-grep requires YAML files, write only the small subset of YAML needed for these validated rule objects with a dedicated, unit-tested emitter. The persisted catalog contract remains JSON.

KTD-005: Add an explicit `PatternRuntimeConfig`.

Create `scripts/code-map/lib/patterns/runtime-config.mjs` so the CLI does not blend the existing config readers implicitly. The runtime config should resolve:

```json
{
  "projectName": "code-indexer",
  "outputDir": "docs/code-index",
  "codeMapPath": "docs/code-index/code-map.json",
  "moduleMapPath": "docs/code-index/module-map.json",
  "roots": ["scripts", "skills"],
  "languages": ["JavaScript", "TypeScript"],
  "catalogs": ["code-indexer.patterns.json"]
}
```

Resolution rules:

- `outputDir` and `projectName` come from `loadCodeIndexerConfig(repoRoot)`.
- `codeMapPath`, `roots`, and `languages` come from `loadCodeMapConfig(repoRoot)`, because that is the writer contract used by `generate-code-map.mjs`.
- `moduleMapPath` is `${outputDir}/module-map.json`.
- `patterns.catalogs` is read from `code-indexer.config.json` through the new runtime-config helper or by extending `loadCodeIndexerConfig`.
- If `module-map.json.codeMap` exists and differs from `codeMapPath`, warn with `CODE_MAP_PATH_MISMATCH` and use `codeMapPath`, because it is the actual code-map generator output path.

KTD-006: Use temporary ast-grep config files per run.

ast-grep `scan --config` already understands rule definitions. The generator should:

1. Load and validate catalog entries.
2. Filter by languages present in `code-map.json.languages` and source files present in the shared source-file inventory.
3. Write a temporary ast-grep config/rule set under an OS temp directory.
4. Run `@ast-grep/cli` once per language or batch as needed.
5. Parse `scan --json --include-metadata` output with shared helpers.
6. Delete temp files after the run.

This avoids permanent generated rule files in consumer repos.

KTD-007: Normalize into a durable `PatternReport` model before rendering.

Use a pure model and renderer so tests can verify coverage math without shelling out:

```json
{
  "schemaVersion": "1.0",
  "generated": "2026-06-30T00:00:00.000Z",
  "project": { "name": "example" },
  "source": {
    "codeMap": "docs/code-index/code-map.json",
    "moduleMap": "docs/code-index/module-map.json",
    "sourceFiles": 140,
    "eligibleFiles": 120,
    "excludedFiles": [
      { "extension": ".rb", "count": 12, "reason": "no enabled pattern catalog" },
      { "extension": ".swift", "count": 8, "reason": "no enabled pattern catalog" }
    ],
    "languages": ["TypeScript", "Python"]
  },
  "summary": {
    "patternsEvaluated": 18,
    "patternsMatched": 9,
    "occurrences": 64,
    "coveredFiles": 37,
    "coveragePercent": 30.83,
    "coverageByConfidence": {
      "high": { "files": 24, "percent": 20.0 },
      "medium": { "files": 19, "percent": 15.83 },
      "intent-only": { "files": 12, "percent": 10.0, "includedInHeadline": false }
    }
  },
  "patterns": [
    {
      "id": "dependency-injection-constructor",
      "name": "Dependency injection constructor",
      "confidence": "high",
      "language": "TypeScript",
      "description": "Constructor parameters on exported classes.",
      "occurrenceCount": 14,
      "fileCount": 8,
      "coveragePercent": 6.67,
      "modules": [
        {
          "id": "api",
          "name": "API",
          "fileCount": 5,
          "occurrenceCount": 10,
          "coveragePercent": 12.5,
          "planningModule": "docs/code-index/modules/api.md"
        }
      ],
      "examples": [
        { "file": "src/api/user.service.ts", "line": 12, "moduleId": "api" }
      ]
    }
  ]
}
```

`examples` should be capped per pattern, for example first 5 sorted by file and line, so reports stay reviewable.

KTD-008: Sort everything deterministically.

Sort catalog entries by `id`, matches by `file`, `line`, then `patternId`, and modules by module ID. Use the code-map generated timestamp as a freshness reference in the report, and use the current time only as the pattern report's own `generated` value.

KTD-009: Keep markdown clear and skeptical.

`patterns.md` should include:

- Title and generated timestamp.
- Inputs: code map path, module map path, file denominator, language set.
- Coverage summary with the headline formula.
- Confidence-tier table.
- Pattern summary table.
- Module coverage table.
- Pattern detail sections with capped examples.
- A limitations note: structural evidence is not intent proof; `intent-only` is excluded from headline coverage.

KTD-010: Do not mutate product docs to "shipped" until verification passes.

During implementation, keep F-014 planned until tests, generation, doctor, plugin validation, and personal plugin reinstall all pass. Only then mark F-014 shipped and update planned-capabilities wording.

## Implementation Units

### U-001: Pattern Catalog Schema And Loader

Files:

- `scripts/code-map/lib/patterns/runtime-config.mjs`
- `scripts/code-map/lib/patterns/catalog.mjs`
- `scripts/code-map/patterns/*.json`
- `test/code-map/pattern-runtime-config.test.mjs`
- `test/code-map/pattern-catalog.test.mjs`
- `scripts/module-map/code-indexer.config.example.json`

Work:

- Define the catalog entry schema:
  - `id`: lowercase stable slug, unique across bundled and repo catalogs.
  - `name`: human-readable label.
  - `language`: one of `SUPPORTED_LANGUAGES`.
  - `confidence`: `high`, `medium`, or `intent-only`.
  - `description`: one or two sentences.
  - `rule`: ast-grep rule object.
  - Optional `includeKinds`, `excludeKinds`, `tags`, or `notes` only if needed by the initial seed catalog.
- Add bundled seed catalogs for supported languages where useful. Start small and precise; it is better to ship fewer high-confidence patterns than broad noisy ones.
- Add `loadPatternCatalogs(repoRoot, config, options)` that merges bundled and repo-defined catalogs.
- Add `loadPatternRuntimeConfig(repoRoot)` that produces one resolved config object for output paths, code-map path, source roots, languages, and repo catalog paths.
- Extend `loadCodeIndexerConfig` or a narrow patterns-specific config reader to expose `patterns.catalogs`.
- Validate duplicate IDs, invalid confidence tiers, unsupported languages, missing rules, and missing repo catalog files.
- Return structured warnings for catalogs skipped due to unsupported language or empty rule sets.

Acceptance:

- Catalog loading works without extra npm dependencies.
- Runtime config precedence is tested for custom `outputDir`, custom code-map `output`, custom roots/languages, and `patterns.catalogs`.
- Repo-defined catalog files are loaded only when listed in `code-indexer.config.json`.
- Invalid catalogs fail with actionable error codes.
- Duplicate IDs across bundled and repo catalogs fail; repo catalogs do not silently override bundled rules.
- The config example documents `patterns.catalogs` without making it required.

### U-002: Pattern Scan Runner

Files:

- `scripts/code-map/lib/source-files.mjs`
- `scripts/code-map/lib/patterns/scanner.mjs`
- `scripts/code-map/lib/patterns/temp-rules.mjs`
- `test/code-map/pattern-scanner.test.mjs`

Work:

- Extract the source-file walker currently embedded in `generate-code-map.mjs` into `scripts/code-map/lib/source-files.mjs`.
- Reuse `SOURCE_EXTENSIONS` and the current skip-dir set so pattern coverage and code-map endpoint scanning agree on source-file inventory.
- Add `partitionPatternEligibleFiles(sourceFiles, catalogs, languages)` or equivalent logic that separates:
  - `eligibleFiles`: files whose extension/language can be scanned by at least one enabled pattern catalog.
  - `excludedFiles`: detected source files that have no enabled pattern rules, with extension/language and count.
- Load the ast-grep binary through `resolveAstGrepBinary`.
- Convert catalog entries into a temporary ast-grep config/rule set for the current run.
- Scan only `eligibleFiles`, batched where needed to avoid command-line length limits.
- Parse ast-grep JSON output with `parseScanJson`.
- Normalize each match into:
  - `patternId`
  - `file`
  - `line`
  - `language`
  - `confidence`
  - `moduleId` / `moduleName` / `moduleRoot` / `planningModule`
- Ensure a scan with no matches is a successful zero-match result, not a failure.
- Treat ast-grep process errors, invalid JSON, or missing binary as command failures with parseable error codes.

Acceptance:

- Scanner can be tested with fixture files and a tiny catalog.
- Source inventory includes source files even when they have no exported symbol in `code-map.json`.
- Unsupported-but-detected extensions are excluded from headline coverage and reported separately.
- Scanner preserves pattern metadata through ast-grep match metadata or an equivalent deterministic mapping.
- Scanner does not create files in the target repo except final generated artifacts.
- Temp files are removed after successful and failed scans.

### U-003: Pattern Report Model, Coverage Math, And Renderer

Files:

- `scripts/code-map/lib/patterns/model.mjs`
- `scripts/code-map/lib/patterns/render.mjs`
- `test/code-map/pattern-model.test.mjs`
- `test/code-map/pattern-render.test.mjs`

Work:

- Load and validate persisted `code-map.json` and `module-map.json`.
- Build a complete source-file index from the shared source-file inventory.
- Build a pattern-eligible file index from the source-file inventory and enabled catalogs.
- Overlay code-map file metadata onto that index when present.
- Build a module index from code-map module fields, falling back to `module-map.json.modules`.
- Attribute matches to modules.
- Compute:
  - occurrence counts by pattern and module.
  - unique matched file counts by pattern and module.
  - total source-file count.
  - excluded unsupported-file count.
  - pattern-eligible denominator.
  - headline coverage from the union of `high` plus `medium` unique files over the pattern-eligible denominator.
  - tier-specific unique file counts and percentages.
  - `intent-only` signal counts excluded from headline coverage.
- Cap examples per pattern and sort deterministically.
- Render `patterns.json` from the normalized `PatternReport`.
- Render `patterns.md` as deterministic markdown with tables and limitations.

Acceptance:

- Coverage math counts each file once for a pattern's file coverage even if it has multiple occurrences.
- Headline coverage excludes `intent-only`.
- Module coverage uses each module's own pattern-eligible file denominator computed from the shared eligible-file index. It must not use `code-map.modules[].fileCount`, because that count only includes symbol-bearing files.
- Unowned files are grouped under a stable `unowned` bucket in markdown and JSON.
- Renderer emits repo-relative paths only.

### U-004: `generate-patterns.mjs` CLI

Files:

- `scripts/code-map/generate-patterns.mjs`
- `test/code-map/generate-patterns.test.mjs`

Work:

- Add a CLI entry point with:
  - default text output.
  - `--json` parseable output.
  - `--output-dir <path>` maintainer/test override if useful.
  - `--help`.
- From the target repo root:
  1. Load code-indexer config.
  2. Resolve output dir.
  3. Load `code-map.json` and `module-map.json`.
  4. Load and validate pattern catalogs.
  5. Run ast-grep scans.
  6. Build `PatternReport`.
  7. Write `patterns.json` and `patterns.md`.
- Use a stable result shape:

```json
{
  "ok": true,
  "wrote": [
    "docs/code-index/patterns.json",
    "docs/code-index/patterns.md"
  ],
  "patterns": 12,
  "matches": 34,
  "sourceFiles": 44,
  "eligibleFiles": 38,
  "excludedFiles": 6,
  "coveragePercent": 26.32,
  "warnings": [],
  "errors": [],
  "summary": "12 patterns, 34 matches across 38 eligible files -> docs/code-index/patterns.md"
}
```

- On failures, print valid JSON when `--json` is present and exit 1:

```json
{
  "ok": false,
  "wrote": [],
  "patterns": 0,
  "matches": 0,
  "sourceFiles": 0,
  "eligibleFiles": 0,
  "excludedFiles": 0,
  "coveragePercent": 0,
  "warnings": [],
  "errors": ["MISSING_CODE_MAP: docs/code-index/code-map.json not found - run /ci first"],
  "summary": "patterns skipped - run /ci first"
}
```

Acceptance:

- `node scripts/code-map/generate-patterns.mjs` writes both artifacts in this plugin checkout.
- `node scripts/code-map/generate-patterns.mjs --json` emits parseable JSON.
- Missing `code-map.json`, missing `module-map.json`, empty source inventory, no pattern-eligible files, invalid catalog, and ast-grep failure all produce stable failure payloads.
- Existing `generate-code-map.mjs` behavior is unchanged.

### U-005: Command, Skill, And Product Docs

Files:

- `skills/using-code-indexer/SKILL.md`
- `commands/ci.md`
- `commands/code-indexer.md`
- `README.md`
- `.codex/INSTALL.md`
- `scripts/module-map/README.md`
- `docs/features.md`
- `docs/product.md`
- `docs/roadmap.md`

Work:

- Treat `skills/using-code-indexer/SKILL.md` as the canonical workflow source.
- Add `/ci patterns` as a sibling to `/ci arch`:
  1. Apply the staleness gate.
  2. If `code-map.json` or `module-map.json` is stale or missing, run normal `/ci` first.
  3. Run `node "${PLUGIN_ROOT}/scripts/code-map/generate-patterns.mjs"`.
  4. Use `patterns.md` for architecture/style discovery and codebase consistency review, not as default context for routine feature planning.
- Keep `commands/ci.md` and `commands/code-indexer.md` thin. They should point at the skill and list the short command.
- Update README and maintainer docs with one-line output descriptions and low-level commands.
- Keep F-014 planned until verification passes; then mark it shipped and move it out of `docs/product.md` planned capabilities.

Acceptance:

- A user can discover `/ci patterns` from `/ci`, `/code-indexer`, the skill, README, and install docs.
- Consumer-facing docs use `${PLUGIN_ROOT}`.
- Docs do not suggest loading `patterns.json` or `patterns.md` as mandatory default planning context.
- Product docs preserve the "structural evidence, not intent proof" limitation.

### U-006: Generated Artifacts And Self-Index Refresh

Files:

- `docs/code-index/patterns.json`
- `docs/code-index/patterns.md`
- `docs/code-index/code-map.json`
- `docs/code-index/module-map.json`
- `docs/code-index/index.md`
- `docs/code-index/modules/code-map.md`
- `docs/code-index/modules/module-map.md`
- `docs/code-index/modules/lib.md`

Work:

- Run the new patterns generator in this plugin checkout to create the first pattern report.
- Regenerate code-map and module-map so the new script, pattern helpers, tests, and docs appear in this repo's own index.
- Confirm generated files are deterministic enough for review: stable sorting, no absolute paths, no volatile temp paths.

Acceptance:

- `docs/code-index/patterns.md` and `patterns.json` exist.
- `docs/code-index/index.md` and module files include the new code-map pattern implementation after regeneration.
- Generated artifacts do not include local absolute Windows paths.
- This repo's generated `patterns.md` includes at least three non-symbol-derived pattern rows from the bundled seed catalog.
- No high-confidence headline pattern in this repo is merely an existing code-map symbol class such as exported function, exported class, public class, public interface, or top-level function.
- The report shows source file count, pattern-eligible file count, excluded unsupported-file count, and the headline coverage formula.

### U-007: Verification And Packaging

Files:

- `test/code-map/*.test.mjs`
- `test/module-map/command-docs.test.mjs`
- `.codex-plugin/plugin.json`

Work:

- Add focused tests for the new pattern modules.
- Extend command-doc tests to include `/ci patterns` and installed plugin-root command guidance.
- Run full regression, generation, doctor, plugin validation, and personal plugin reinstall.
- Verify the installed Codex cache includes the new script, bundled catalogs, skill docs, and command docs.

Verification commands:

```powershell
node --test test/code-map/pattern-runtime-config.test.mjs test/code-map/pattern-catalog.test.mjs test/code-map/pattern-model.test.mjs test/code-map/pattern-render.test.mjs test/code-map/generate-patterns.test.mjs test/module-map/command-docs.test.mjs
npm test
node scripts/code-map/generate-code-map.mjs
node scripts/module-map/generate.mjs
node scripts/module-map/generate.mjs --arch
node scripts/code-map/generate-patterns.mjs
node scripts/code-map/generate-patterns.mjs --json
node scripts/module-map/generate.mjs --doctor
python C:\Users\jmayn\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py C:\Users\jmayn\plugins\code-indexer
codex plugin add code-indexer@personal --json
```

Installed-cache spot checks:

```powershell
Test-Path C:\Users\jmayn\.codex\plugins\cache\personal\code-indexer\1.0.0\scripts\code-map\generate-patterns.mjs
Test-Path C:\Users\jmayn\.codex\plugins\cache\personal\code-indexer\1.0.0\scripts\code-map\patterns
Select-String -Path C:\Users\jmayn\.codex\plugins\cache\personal\code-indexer\1.0.0\commands\ci.md -Pattern "/ci patterns"
```

Acceptance:

- Focused pattern tests pass.
- Full `npm test` passes.
- `generate-code-map`, `generate`, `--arch`, `generate-patterns`, `generate-patterns --json`, and `--doctor` pass.
- Plugin validation passes.
- Personal Codex plugin reinstall succeeds.
- Installed cache contains the new script and bundled pattern catalog.

## Verification Contract

| Scenario | Command | Expected Result |
|----------|---------|-----------------|
| Catalog unit tests | `node --test test/code-map/pattern-catalog.test.mjs` | Bundled and repo catalogs load, merge, and validate deterministically. |
| Coverage math tests | `node --test test/code-map/pattern-model.test.mjs` | High/medium headline coverage excludes intent-only, counts unique files correctly, and uses pattern-eligible files as the denominator. |
| Unsupported source denominator | Fixture with `.rb` or `.swift` files and no enabled catalog | Unsupported files appear in excluded counts and do not depress headline coverage. |
| Markdown render tests | `node --test test/code-map/pattern-render.test.mjs` | Markdown contains summary, tier table, module attribution, examples, and limitations. |
| CLI success | `node scripts/code-map/generate-patterns.mjs --json` | Stdout is valid JSON with `ok: true`, output paths, pattern count, match count, source-file count, eligible-file count, excluded-file count, and coverage. |
| CLI missing code map | Run in temp fixture without `code-map.json` | Stdout is valid JSON with `ok: false` under `--json`; process exits 1. |
| CLI missing module map | Run in temp fixture without `module-map.json` | Clear failure says to run `/ci` first; no output artifacts are written. |
| CLI invalid catalog | Run with fixture config pointing at a bad catalog | Stable `INVALID_PATTERN_CATALOG` failure with file path and entry id when available. |
| Zero matches | Run with valid catalog and fixture source that does not match | Command succeeds, writes artifacts, and reports zero matches/zero coverage. |
| Repo extension | Fixture config with `patterns.catalogs` | Repo pattern appears in output and is attributed to modules. |
| Full regression | `npm test` | All existing and new tests pass. |
| Code map generation | `node scripts/code-map/generate-code-map.mjs` | `docs/code-index/code-map.json` updates successfully. |
| Module map generation | `node scripts/module-map/generate.mjs` | Index, module docs, and `module-map.json` update successfully. |
| Architecture generation | `node scripts/module-map/generate.mjs --arch` | Existing `/ci arch` still succeeds. |
| Pattern generation | `node scripts/code-map/generate-patterns.mjs` | `patterns.json` and `patterns.md` are written under `docs/code-index/`. |
| Doctor | `node scripts/module-map/generate.mjs --doctor` | No required artifact or runtime checks fail. |
| Plugin validation | `python C:\Users\jmayn\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py C:\Users\jmayn\plugins\code-indexer` | Manifest and packaged files validate. |
| Personal plugin reinstall | `codex plugin add code-indexer@personal --json` | Codex cache includes commands, skill, scripts, and bundled pattern catalogs. |

Manual review:

- Open `docs/code-index/patterns.md`.
- Confirm it includes at least three non-symbol-derived pattern rows for this repo.
- Confirm no high-confidence headline pattern is just a public/exported symbol already covered by `code-map.json`.
- Confirm the headline coverage formula is explicit and does not count `intent-only`.
- Confirm unsupported-but-detected files are reported separately from pattern-eligible files.
- Confirm examples point at repo-relative files and line numbers.
- Confirm module attribution aligns with `code-map.json` and `module-map.json`.
- Confirm no absolute local paths or temp paths appear.

## Definition of Done

- `/ci patterns` is documented as the preferred user command.
- Consumer-facing docs resolve through `${PLUGIN_ROOT}`.
- `node scripts/code-map/generate-patterns.mjs` exists as the maintainer shortcut and installed-plugin implementation.
- The command writes `docs/code-index/patterns.json` and `docs/code-index/patterns.md`.
- Pattern catalogs are bundled, validated, deterministic, and extendable through `code-indexer.config.json`.
- Coverage is file-based, module-attributed, tiered by confidence, and based on pattern-eligible files rather than symbol-bearing files.
- Headline coverage excludes `intent-only`.
- Unsupported-but-detected source files are counted and reported separately from the headline denominator.
- This repo's dogfood report includes at least three non-symbol-derived pattern rows and no high-confidence headline pattern that merely duplicates code-map symbol extraction.
- Missing or stale prerequisite artifacts fail clearly and tell the user to run `/ci` first.
- Existing `/ci` and `/ci arch` behavior is unchanged.
- Tests cover runtime config, catalog loading, scanning, coverage math, rendering, CLI success/failure, and command docs.
- Full verification, doctor, plugin validation, and personal plugin reinstall pass.
- F-014 is marked shipped only after verification passes.

## Appendix

### Target File Tree

```text
code-indexer/
|-- commands/
|   |-- ci.md
|   `-- code-indexer.md
|-- docs/
|   |-- plans/
|   |   `-- 2026-06-30-002-feature-ci-patterns-plan.md
|   `-- code-index/
|       |-- patterns.json
|       |-- patterns.md
|       |-- code-map.json
|       |-- module-map.json
|       `-- modules/
|-- scripts/
|   |-- code-map/
|   |   |-- generate-patterns.mjs
|   |   |-- patterns/
|   |   |   |-- csharp.json
|   |   |   |-- go.json
|   |   |   |-- java.json
|   |   |   |-- javascript.json
|   |   |   |-- python.json
|   |   |   `-- typescript.json
|   |   `-- lib/
|   |       |-- source-files.mjs
|   |       `-- patterns/
|   |           |-- catalog.mjs
|   |           |-- model.mjs
|   |           |-- render.mjs
|   |           |-- runtime-config.mjs
|   |           |-- scanner.mjs
|   |           `-- temp-rules.mjs
|   |-- lib/
|   |   |-- resolve-ast-grep.mjs
|   |   `-- sg-result.mjs
|   `-- module-map/
|       |-- code-indexer.config.example.json
|       `-- lib/
|           `-- config.mjs
|-- skills/
|   `-- using-code-indexer/
|       `-- SKILL.md
`-- test/
    |-- code-map/
    |   |-- generate-patterns.test.mjs
    |   |-- pattern-catalog.test.mjs
    |   |-- pattern-model.test.mjs
    |   |-- pattern-render.test.mjs
    |   |-- pattern-runtime-config.test.mjs
    |   `-- pattern-scanner.test.mjs
    `-- module-map/
        `-- command-docs.test.mjs
```

### Initial Seed Catalog Guidance

Start with a conservative catalog. Prefer rules that identify repeatable structural idioms, not bare public symbols already covered by `code-map.json`.

| Language | Candidate Pattern | Suggested Confidence |
|----------|-------------------|----------------------|
| TypeScript/JavaScript | CLI entrypoint with shebang plus `process.argv` parsing | high |
| TypeScript/JavaScript | config loader reading a project JSON file with defaults | high |
| TypeScript/JavaScript | renderer function returning markdown from a normalized model | medium |
| TypeScript/JavaScript | temp-file lifecycle with create, use, cleanup | medium |
| C# | constructor dependency injection with assigned readonly fields | high |
| C# | HTTP controller action with route/method attributes | high |
| Python | decorated route handler function | high |
| Python | Click/Typer command function | medium |
| Java | annotated controller or resource method | high |
| Go | Cobra command construction with Run/RunE handler | medium |

Rules that only match public/exported declarations, classes, interfaces, records, enums, or top-level functions duplicate the existing code-map symbol rules. Do not include them in headline pattern coverage. If they are useful as supporting evidence, label them as public-surface signals and exclude them from the headline pattern rows.

Do not ship broad "repository/service/controller" naming rules as high confidence. If included, they should usually be `medium` or `intent-only`.

### Implementation Order

1. Add runtime config, catalog schema, bundled seed catalog, config reading, and catalog tests.
2. Add source inventory, pattern-eligible partitioning, and denominator tests.
3. Add pure report model and renderer with coverage tests.
4. Add scanner and fixture tests.
5. Add `generate-patterns.mjs` CLI and CLI success/failure tests.
6. Add command/skill/docs updates while F-014 remains planned.
7. Generate `patterns.json` and `patterns.md`.
8. Regenerate code-map and module-map.
9. Run focused tests, full tests, generator commands, doctor, plugin validation, and personal plugin reinstall.
10. Mark F-014 shipped only after all verification passes.
