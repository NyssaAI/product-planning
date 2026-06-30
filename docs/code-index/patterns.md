# code-indexer Code Patterns

Generated: 2026-06-30T13:25:07.567Z. Regenerate with `/ci patterns`.

## Use This When

- Use for architecture/style discovery and codebase consistency review.
- For routine implementation planning, start with `docs/code-index/index.md` and the minimum relevant module files.

## Coverage Summary

Headline coverage counts unique pattern-eligible files matched by `high` or `medium` confidence patterns. `intent-only` signals and unsupported files are excluded from the headline denominator.

| Metric | Value |
|--------|-------|
| Source files | 55 |
| Pattern-eligible files | 55 |
| Excluded files | 0 |
| Patterns evaluated | 13 |
| Patterns matched | 5 |
| Occurrences | 292 |
| Covered files | 26 |
| Headline coverage | 47.27% |

## Inputs

| Input | Value |
|-------|-------|
| Code map | `docs/code-index/code-map.json` |
| Module map | `docs/code-index/module-map.json` |
| Languages | `JavaScript`, `TypeScript`, `CSharp`, `Java`, `Python`, `Go` |

## Confidence Tiers

| Confidence | Files | Coverage | Included in headline |
|------------|-------|----------|----------------------|
| `high` | 17 | 30.91% | yes |
| `medium` | 19 | 34.55% | yes |
| `intent-only` | 0 | 0.00% | no |

## Excluded Source Files

No detected source files were excluded from the pattern-eligible denominator.

## Pattern Summary

| Pattern | Confidence | Language | Files | Occurrences | Coverage | Headline |
|---------|------------|----------|-------|-------------|----------|----------|
| Markdown lines renderer | `medium` | `JavaScript` | 8 | 246 | 14.55% | yes |
| JSON config loader | `high` | `JavaScript` | 15 | 20 | 27.27% | yes |
| Generated file writer | `medium` | `JavaScript` | 9 | 18 | 16.36% | yes |
| Child process runner | `medium` | `JavaScript` | 5 | 5 | 9.09% | yes |
| Node CLI argument parser | `high` | `JavaScript` | 3 | 3 | 5.45% | yes |
| HTTP attributed method | `high` | `CSharp` | 0 | 0 | 0.00% | yes |
| Public surface method | `intent-only` | `CSharp` | 0 | 0 | 0.00% | no |
| Cobra command runner | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| HTTP annotated method | `high` | `Java` | 0 | 0 | 0.00% | yes |
| Click command function | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| Decorated route handler | `high` | `Python` | 0 | 0 | 0.00% | yes |
| Dynamic import boundary | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |
| NestJS route method | `high` | `TypeScript` | 0 | 0 | 0.00% | yes |

## Module Coverage

| Module | Eligible files | Covered files | Coverage | Module file |
|--------|----------------|---------------|----------|-------------|
| code-map | 15 | 10 | 66.67% | `docs/code-index/modules/code-map.md` |
| module-map | 36 | 15 | 41.67% | `docs/code-index/modules/module-map.md` |
| lib | 4 | 1 | 25.00% | `docs/code-index/modules/lib.md` |

## Pattern Details

### Markdown lines renderer

Markdown output is assembled by pushing strings into a lines array.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 6 | 163 | 16.67% |
| code-map | 2 | 83 | 13.33% |

Examples:

- `scripts/code-map/lib/file-header-comment.mjs:103` (code-map)
- `scripts/code-map/lib/patterns/render.mjs:7` (code-map)
- `scripts/code-map/lib/patterns/render.mjs:8` (code-map)
- `scripts/code-map/lib/patterns/render.mjs:9` (code-map)
- `scripts/code-map/lib/patterns/render.mjs:12` (code-map)

### JSON config loader

Runtime configuration is loaded by parsing JSON read from disk.

Confidence: `high`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 10 | 14 | 27.78% |
| code-map | 4 | 5 | 26.67% |
| lib | 1 | 1 | 25.00% |

Examples:

- `scripts/code-map/lib/code-map-config.mjs:76` (code-map)
- `scripts/code-map/lib/patterns/catalog.mjs:49` (code-map)
- `scripts/code-map/lib/patterns/model.mjs:30` (code-map)
- `scripts/code-map/lib/patterns/runtime-config.mjs:51` (code-map)
- `scripts/code-map/lib/patterns/runtime-config.mjs:66` (code-map)

### Generated file writer

Code writes generated artifacts with writeFileSync.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 6 | 13 | 16.67% |
| code-map | 3 | 5 | 20.00% |

Examples:

- `scripts/code-map/generate-code-map.mjs:377` (code-map)
- `scripts/code-map/generate-patterns.mjs:125` (code-map)
- `scripts/code-map/generate-patterns.mjs:126` (code-map)
- `scripts/code-map/lib/patterns/temp-rules.mjs:29` (code-map)
- `scripts/code-map/lib/patterns/temp-rules.mjs:46` (code-map)

### Child process runner

Code shells out through spawnSync for local tooling integration.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| code-map | 2 | 2 | 13.33% |
| module-map | 2 | 2 | 5.56% |
| lib | 1 | 1 | 25.00% |

Examples:

- `scripts/code-map/generate-code-map.mjs:153` (code-map)
- `scripts/code-map/lib/patterns/scanner.mjs:96` (code-map)
- `scripts/lib/resolve-ast-grep.mjs:51` (lib)
- `scripts/module-map/lib/adapters/sg-scan.mjs:43` (module-map)
- `scripts/module-map/regen-if-source-changed.mjs:97` (module-map)

### Node CLI argument parser

A Node CLI entry point reads command-line arguments from process.argv.

Confidence: `high`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| code-map | 2 | 2 | 13.33% |
| module-map | 1 | 1 | 2.78% |

Examples:

- `scripts/code-map/generate-code-map.mjs:80` (code-map)
- `scripts/code-map/generate-patterns.mjs:23` (code-map)
- `scripts/module-map/generate.mjs:44` (module-map)

## Limitations

Pattern matches are structural evidence, not proof of author intent. Use this report to find repeatable code shapes worth reviewing, then inspect the cited examples before changing code.
`intent-only` signals are reported separately and excluded from headline coverage.

<!-- code-index:patterns generated 2026-06-30T13:25:07.567Z -->
