# plan-product Code Patterns

Generated: 2026-07-07T21:34:24.829Z. Regenerate with `find-code-patterns`.

## Use This When

- Use for module-rooted architecture and coding-practice review.
- Treat missing patterns as a quality signal to inspect, not proof that the code is wrong.
- For routine implementation planning, start with the generated index and the minimum relevant module files.

## Coverage Summary

Headline coverage counts unique pattern-eligible files matched by `high` or `medium` confidence patterns. `intent-only` signals and unsupported files are excluded from the headline denominator.

| Metric | Value |
|--------|-------|
| Source files | 57 |
| Pattern-eligible files | 57 |
| Pattern-eligible source lines | 12629 |
| Excluded files | 0 |
| Patterns evaluated | 139 |
| Patterns matched | 20 |
| Occurrences | 2779 |
| Covered files | 47 |
| Headline coverage | 82.46% |
| Pattern lines | 5566 |
| Pattern line coverage | 44.07% |
| Modules with pattern evidence | 4 |
| Modules without pattern evidence | 0 |

## Module Signal Summary

| Signal | Modules |
|--------|---------|
| `broad-pattern-evidence` | 4 |

## Inputs

| Input | Value |
|-------|-------|
| Code map | `docs/code-map/code-map.json` |
| Module map | `docs/code-map/module-map.json` |
| Pattern library | `.plan-product/patterns/library.json` |
| Pattern expectations | `.plan-product/patterns/expectations.json` |
| Source roots | `scripts`, `skills` |
| Languages | `JavaScript`, `TypeScript`, `CSharp`, `Java`, `Python`, `Go` |

## Confidence Tiers

| Confidence | Files | Coverage | Included in headline |
|------------|-------|----------|----------------------|
| `high` | 19 | 33.33% | yes |
| `medium` | 47 | 82.46% | yes |
| `intent-only` | 53 | 92.98% | no |

## Excluded Source Files

No detected source files were excluded from the pattern-eligible denominator.

## Pattern Summary

| Pattern | Family | Confidence | Language | Files | Occurrences | Coverage | Headline |
|---------|--------|------------|----------|-------|-------------|----------|----------|
| Large Conditional Dispatch | Large Conditional Dispatch | `intent-only` | `JavaScript` | 53 | 659 | 92.98% | no |
| Configuration Boundary | Configuration Boundary | `medium` | `JavaScript` | 28 | 566 | 49.12% | yes |
| Markdown lines renderer | - | `medium` | `JavaScript` | 9 | 318 | 15.79% | yes |
| Command | Command | `medium` | `JavaScript` | 20 | 258 | 35.09% | yes |
| Logging / Observability Boundary | Logging / Observability Boundary | `medium` | `JavaScript` | 20 | 253 | 35.09% | yes |
| Factory | Factory | `medium` | `JavaScript` | 22 | 145 | 38.60% | yes |
| Dependency Injection | Dependency Injection | `medium` | `JavaScript` | 16 | 135 | 28.07% | yes |
| Error Handling Policy | Error Handling Policy | `medium` | `JavaScript` | 15 | 130 | 26.32% | yes |
| Repository | Repository | `medium` | `JavaScript` | 11 | 98 | 19.30% | yes |
| Observer / PubSub | Observer / PubSub | `medium` | `JavaScript` | 8 | 49 | 14.04% | yes |
| Strategy | Strategy | `medium` | `JavaScript` | 3 | 41 | 5.26% | yes |
| Scattered Config Access | Scattered Config Access | `intent-only` | `JavaScript` | 7 | 33 | 12.28% | no |
| JSON config loader | - | `high` | `JavaScript` | 16 | 24 | 28.07% | yes |
| Adapter | Adapter | `medium` | `JavaScript` | 4 | 19 | 7.02% | yes |
| Generated file writer | - | `medium` | `JavaScript` | 10 | 19 | 17.54% | yes |
| Chain of Responsibility | Chain of Responsibility | `medium` | `JavaScript` | 3 | 17 | 5.26% | yes |
| Child process runner | - | `medium` | `JavaScript` | 6 | 6 | 10.53% | yes |
| Node CLI argument parser | - | `high` | `JavaScript` | 4 | 4 | 7.02% | yes |
| Validation Boundary | Validation Boundary | `medium` | `JavaScript` | 2 | 4 | 3.51% | yes |
| Decorator | Decorator | `medium` | `JavaScript` | 1 | 1 | 1.75% | yes |
| Adapter | Adapter | `medium` | `CSharp` | 0 | 0 | 0.00% | yes |
| Adapter | Adapter | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| Adapter | Adapter | `medium` | `Java` | 0 | 0 | 0.00% | yes |
| Adapter | Adapter | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| Adapter | Adapter | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |
| Chain of Responsibility | Chain of Responsibility | `medium` | `CSharp` | 0 | 0 | 0.00% | yes |
| Chain of Responsibility | Chain of Responsibility | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| Chain of Responsibility | Chain of Responsibility | `medium` | `Java` | 0 | 0 | 0.00% | yes |
| Chain of Responsibility | Chain of Responsibility | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| Chain of Responsibility | Chain of Responsibility | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |
| Command | Command | `medium` | `CSharp` | 0 | 0 | 0.00% | yes |
| Command | Command | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| Command | Command | `medium` | `Java` | 0 | 0 | 0.00% | yes |
| Command | Command | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| Command | Command | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |
| Configuration Boundary | Configuration Boundary | `medium` | `CSharp` | 0 | 0 | 0.00% | yes |
| Configuration Boundary | Configuration Boundary | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| Configuration Boundary | Configuration Boundary | `medium` | `Java` | 0 | 0 | 0.00% | yes |
| Configuration Boundary | Configuration Boundary | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| Configuration Boundary | Configuration Boundary | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |
| HTTP attributed method | - | `high` | `CSharp` | 0 | 0 | 0.00% | yes |
| Public surface method | - | `intent-only` | `CSharp` | 0 | 0 | 0.00% | no |
| Decorator | Decorator | `medium` | `CSharp` | 0 | 0 | 0.00% | yes |
| Decorator | Decorator | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| Decorator | Decorator | `medium` | `Java` | 0 | 0 | 0.00% | yes |
| Decorator | Decorator | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| Decorator | Decorator | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |
| Dependency Injection | Dependency Injection | `medium` | `CSharp` | 0 | 0 | 0.00% | yes |
| Dependency Injection | Dependency Injection | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| Dependency Injection | Dependency Injection | `medium` | `Java` | 0 | 0 | 0.00% | yes |
| Dependency Injection | Dependency Injection | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| Dependency Injection | Dependency Injection | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |
| Direct Database Leak | Direct Database Leak | `intent-only` | `CSharp` | 0 | 0 | 0.00% | no |
| Direct Database Leak | Direct Database Leak | `intent-only` | `Go` | 0 | 0 | 0.00% | no |
| Direct Database Leak | Direct Database Leak | `intent-only` | `Java` | 0 | 0 | 0.00% | no |
| Direct Database Leak | Direct Database Leak | `intent-only` | `JavaScript` | 0 | 0 | 0.00% | no |
| Direct Database Leak | Direct Database Leak | `intent-only` | `Python` | 0 | 0 | 0.00% | no |
| Direct Database Leak | Direct Database Leak | `intent-only` | `TypeScript` | 0 | 0 | 0.00% | no |
| Direct External API Leak | Direct External API Leak | `intent-only` | `CSharp` | 0 | 0 | 0.00% | no |
| Direct External API Leak | Direct External API Leak | `intent-only` | `Go` | 0 | 0 | 0.00% | no |
| Direct External API Leak | Direct External API Leak | `intent-only` | `Java` | 0 | 0 | 0.00% | no |
| Direct External API Leak | Direct External API Leak | `intent-only` | `JavaScript` | 0 | 0 | 0.00% | no |
| Direct External API Leak | Direct External API Leak | `intent-only` | `Python` | 0 | 0 | 0.00% | no |
| Direct External API Leak | Direct External API Leak | `intent-only` | `TypeScript` | 0 | 0 | 0.00% | no |
| DTO Mapper | DTO Mapper | `medium` | `CSharp` | 0 | 0 | 0.00% | yes |
| DTO Mapper | DTO Mapper | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| DTO Mapper | DTO Mapper | `medium` | `Java` | 0 | 0 | 0.00% | yes |
| DTO Mapper | DTO Mapper | `medium` | `JavaScript` | 0 | 0 | 0.00% | yes |
| DTO Mapper | DTO Mapper | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| DTO Mapper | DTO Mapper | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |
| Error Handling Policy | Error Handling Policy | `medium` | `CSharp` | 0 | 0 | 0.00% | yes |
| Error Handling Policy | Error Handling Policy | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| Error Handling Policy | Error Handling Policy | `medium` | `Java` | 0 | 0 | 0.00% | yes |
| Error Handling Policy | Error Handling Policy | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| Error Handling Policy | Error Handling Policy | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |
| Facade | Facade | `medium` | `CSharp` | 0 | 0 | 0.00% | yes |
| Facade | Facade | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| Facade | Facade | `medium` | `Java` | 0 | 0 | 0.00% | yes |
| Facade | Facade | `medium` | `JavaScript` | 0 | 0 | 0.00% | yes |
| Facade | Facade | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| Facade | Facade | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |
| Factory | Factory | `medium` | `CSharp` | 0 | 0 | 0.00% | yes |
| Factory | Factory | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| Factory | Factory | `medium` | `Java` | 0 | 0 | 0.00% | yes |
| Factory | Factory | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| Factory | Factory | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |
| Cobra command runner | - | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| God Class | God Class | `intent-only` | `CSharp` | 0 | 0 | 0.00% | no |
| God Class | God Class | `intent-only` | `Go` | 0 | 0 | 0.00% | no |
| God Class | God Class | `intent-only` | `Java` | 0 | 0 | 0.00% | no |
| God Class | God Class | `intent-only` | `JavaScript` | 0 | 0 | 0.00% | no |
| God Class | God Class | `intent-only` | `Python` | 0 | 0 | 0.00% | no |
| God Class | God Class | `intent-only` | `TypeScript` | 0 | 0 | 0.00% | no |
| HTTP annotated method | - | `high` | `Java` | 0 | 0 | 0.00% | yes |
| Large Conditional Dispatch | Large Conditional Dispatch | `intent-only` | `CSharp` | 0 | 0 | 0.00% | no |
| Large Conditional Dispatch | Large Conditional Dispatch | `intent-only` | `Go` | 0 | 0 | 0.00% | no |
| Large Conditional Dispatch | Large Conditional Dispatch | `intent-only` | `Java` | 0 | 0 | 0.00% | no |
| Large Conditional Dispatch | Large Conditional Dispatch | `intent-only` | `Python` | 0 | 0 | 0.00% | no |
| Large Conditional Dispatch | Large Conditional Dispatch | `intent-only` | `TypeScript` | 0 | 0 | 0.00% | no |
| Logging / Observability Boundary | Logging / Observability Boundary | `medium` | `CSharp` | 0 | 0 | 0.00% | yes |
| Logging / Observability Boundary | Logging / Observability Boundary | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| Logging / Observability Boundary | Logging / Observability Boundary | `medium` | `Java` | 0 | 0 | 0.00% | yes |
| Logging / Observability Boundary | Logging / Observability Boundary | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| Logging / Observability Boundary | Logging / Observability Boundary | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |
| Observer / PubSub | Observer / PubSub | `medium` | `CSharp` | 0 | 0 | 0.00% | yes |
| Observer / PubSub | Observer / PubSub | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| Observer / PubSub | Observer / PubSub | `medium` | `Java` | 0 | 0 | 0.00% | yes |
| Observer / PubSub | Observer / PubSub | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| Observer / PubSub | Observer / PubSub | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |
| Click command function | - | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| Decorated route handler | - | `high` | `Python` | 0 | 0 | 0.00% | yes |
| Repository | Repository | `medium` | `CSharp` | 0 | 0 | 0.00% | yes |
| Repository | Repository | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| Repository | Repository | `medium` | `Java` | 0 | 0 | 0.00% | yes |
| Repository | Repository | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| Repository | Repository | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |
| Scattered Config Access | Scattered Config Access | `intent-only` | `CSharp` | 0 | 0 | 0.00% | no |
| Scattered Config Access | Scattered Config Access | `intent-only` | `Go` | 0 | 0 | 0.00% | no |
| Scattered Config Access | Scattered Config Access | `intent-only` | `Java` | 0 | 0 | 0.00% | no |
| Scattered Config Access | Scattered Config Access | `intent-only` | `Python` | 0 | 0 | 0.00% | no |
| Scattered Config Access | Scattered Config Access | `intent-only` | `TypeScript` | 0 | 0 | 0.00% | no |
| Service Layer | Service Layer | `medium` | `CSharp` | 0 | 0 | 0.00% | yes |
| Service Layer | Service Layer | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| Service Layer | Service Layer | `medium` | `Java` | 0 | 0 | 0.00% | yes |
| Service Layer | Service Layer | `medium` | `JavaScript` | 0 | 0 | 0.00% | yes |
| Service Layer | Service Layer | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| Service Layer | Service Layer | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |
| Strategy | Strategy | `medium` | `CSharp` | 0 | 0 | 0.00% | yes |
| Strategy | Strategy | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| Strategy | Strategy | `medium` | `Java` | 0 | 0 | 0.00% | yes |
| Strategy | Strategy | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| Strategy | Strategy | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |
| Dynamic import boundary | - | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |
| NestJS route method | - | `high` | `TypeScript` | 0 | 0 | 0.00% | yes |
| Validation Boundary | Validation Boundary | `medium` | `CSharp` | 0 | 0 | 0.00% | yes |
| Validation Boundary | Validation Boundary | `medium` | `Go` | 0 | 0 | 0.00% | yes |
| Validation Boundary | Validation Boundary | `medium` | `Java` | 0 | 0 | 0.00% | yes |
| Validation Boundary | Validation Boundary | `medium` | `Python` | 0 | 0 | 0.00% | yes |
| Validation Boundary | Validation Boundary | `medium` | `TypeScript` | 0 | 0 | 0.00% | yes |

## Module Pattern Signals

| Module | Signal | Eligible files | Covered files | File coverage | Eligible lines | Pattern lines | Pattern line % | Used | Expected not detected | Uncovered examples | Module file |
|--------|--------|----------------|---------------|---------------|----------------|---------------|----------------|------|-----------------------|--------------------|-------------|
| code-map | `broad-pattern-evidence` | 14 | 11 | 78.57% | 3584 | 1346 | 37.56% | Large Conditional Dispatch, Markdown lines renderer, Command, Error Handling Policy, +13 more | Facade, Service Layer | `scripts/code-map/lib/comment-extractor.mjs`, `scripts/code-map/lib/module-linker.mjs`, `scripts/code-map/lib/signature-extractor.mjs` | `docs/code-map/modules/code-map.md` |
| lib | `broad-pattern-evidence` | 6 | 5 | 83.33% | 1064 | 480 | 45.11% | Large Conditional Dispatch, Configuration Boundary, Repository, Command, +10 more | Facade, Service Layer | `scripts/lib/sg-result.mjs` | `docs/code-map/modules/lib.md` |
| module-map | `broad-pattern-evidence` | 36 | 30 | 83.33% | 7865 | 3684 | 46.84% | Configuration Boundary, Large Conditional Dispatch, Logging / Observability Boundary, Markdown lines renderer, +16 more | Facade, Service Layer | `scripts/module-map/lib/detection/metrics.mjs`, `scripts/module-map/lib/detection/metrics.test.mjs`, `scripts/module-map/lib/detection/partitions.mjs`, +3 more | `docs/code-map/modules/module-map.md` |
| Unowned | `broad-pattern-evidence` | 1 | 1 | 100.00% | 116 | 56 | 48.28% | Command, Observer / PubSub, Error Handling Policy, Logging / Observability Boundary, +3 more | - | - | - |

## Module Details

### code-map

Root: `scripts/code-map`. Signal: `broad-pattern-evidence`. Pattern line coverage: 37.56% (1346/3584 lines).

Detected patterns:

| Pattern | Family | Confidence | Files | Occurrences | Lines | Line % | Examples |
|---------|--------|------------|-------|-------------|-------|--------|----------|
| Large Conditional Dispatch | Large Conditional Dispatch | `intent-only` | 14 | 235 | 1930 | 53.85% | `scripts/code-map/generate-code-map.mjs:57`, `scripts/code-map/generate-code-map.mjs:82`, `scripts/code-map/generate-code-map.mjs:146` |
| Markdown lines renderer | - | `medium` | 2 | 126 | 156 | 4.35% | `scripts/code-map/lib/file-header-comment.mjs:103`, `scripts/code-map/lib/patterns/render.mjs:7`, `scripts/code-map/lib/patterns/render.mjs:8` |
| Command | Command | `medium` | 4 | 82 | 374 | 10.44% | `scripts/code-map/generate-code-map.mjs:146`, `scripts/code-map/generate-code-map.mjs:146`, `scripts/code-map/generate-code-map.mjs:364` |
| Error Handling Policy | Error Handling Policy | `medium` | 5 | 78 | 536 | 14.96% | `scripts/code-map/generate-code-map.mjs:82`, `scripts/code-map/generate-code-map.mjs:106`, `scripts/code-map/generate-code-map.mjs:146` |
| Configuration Boundary | Configuration Boundary | `medium` | 6 | 67 | 395 | 11.02% | `scripts/code-map/generate-code-map.mjs:57`, `scripts/code-map/generate-code-map.mjs:61`, `scripts/code-map/generate-code-map.mjs:61` |
| Dependency Injection | Dependency Injection | `medium` | 5 | 33 | 246 | 6.86% | `scripts/code-map/generate-code-map.mjs:35`, `scripts/code-map/generate-code-map.mjs:36`, `scripts/code-map/generate-code-map.mjs:36` |
| Factory | Factory | `medium` | 3 | 23 | 426 | 11.89% | `scripts/code-map/generate-code-map.mjs:272`, `scripts/code-map/generate-code-map.mjs:272`, `scripts/code-map/generate-code-map.mjs:364` |
| Strategy | Strategy | `medium` | 2 | 20 | 139 | 3.88% | `scripts/code-map/lib/patterns/catalog.mjs:290`, `scripts/code-map/lib/patterns/catalog.mjs:323`, `scripts/code-map/lib/patterns/catalog.mjs:323` |
| Repository | Repository | `medium` | 3 | 14 | 222 | 6.19% | `scripts/code-map/generate-code-map.mjs:200`, `scripts/code-map/generate-code-map.mjs:200`, `scripts/code-map/generate-code-map.mjs:209` |
| Observer / PubSub | Observer / PubSub | `medium` | 3 | 12 | 138 | 3.85% | `scripts/code-map/generate-code-map.mjs:32`, `scripts/code-map/generate-code-map.mjs:398`, `scripts/code-map/generate-code-map.mjs:402` |
| Chain of Responsibility | Chain of Responsibility | `medium` | 1 | 7 | 8 | 0.22% | `scripts/code-map/generate-patterns.mjs:36`, `scripts/code-map/generate-patterns.mjs:41`, `scripts/code-map/generate-patterns.mjs:42` |
| JSON config loader | - | `high` | 4 | 7 | 7 | 0.20% | `scripts/code-map/lib/code-map-config.mjs:76`, `scripts/code-map/lib/patterns/catalog.mjs:112`, `scripts/code-map/lib/patterns/model.mjs:31` |
| Logging / Observability Boundary | Logging / Observability Boundary | `medium` | 2 | 6 | 68 | 1.90% | `scripts/code-map/generate-code-map.mjs:398`, `scripts/code-map/generate-code-map.mjs:402`, `scripts/code-map/generate-code-map.mjs:408` |
| Generated file writer | - | `medium` | 3 | 5 | 13 | 0.36% | `scripts/code-map/generate-code-map.mjs:381`, `scripts/code-map/generate-patterns.mjs:142`, `scripts/code-map/generate-patterns.mjs:144` |
| Scattered Config Access | Scattered Config Access | `intent-only` | 1 | 5 | 35 | 0.98% | `scripts/code-map/generate-code-map.mjs:82`, `scripts/code-map/generate-code-map.mjs:86`, `scripts/code-map/generate-code-map.mjs:86` |
| Child process runner | - | `medium` | 2 | 2 | 33 | 0.92% | `scripts/code-map/generate-code-map.mjs:157`, `scripts/code-map/lib/patterns/scanner.mjs:102` |
| Node CLI argument parser | - | `high` | 2 | 2 | 2 | 0.06% | `scripts/code-map/generate-code-map.mjs:84`, `scripts/code-map/generate-patterns.mjs:24` |

Expected headline patterns not detected:

| Pattern | Family | Confidence | Language | Tags |
|---------|--------|------------|----------|------|
| Facade | Facade | `medium` | `JavaScript` | `facade`, `design-pattern`, `service`, `api`, `subsystem`, `boundary` |
| Service Layer | Service Layer | `medium` | `JavaScript` | `service-layer`, `architecture-pattern`, `service`, `application`, `orchestration`, `business-rules` |

Files without headline pattern evidence:

- `scripts/code-map/lib/comment-extractor.mjs`
- `scripts/code-map/lib/module-linker.mjs`
- `scripts/code-map/lib/signature-extractor.mjs`

### lib

Root: `scripts/lib`. Signal: `broad-pattern-evidence`. Pattern line coverage: 45.11% (480/1064 lines).

Detected patterns:

| Pattern | Family | Confidence | Files | Occurrences | Lines | Line % | Examples |
|---------|--------|------------|-------|-------------|-------|--------|----------|
| Large Conditional Dispatch | Large Conditional Dispatch | `intent-only` | 5 | 124 | 653 | 61.37% | `scripts/lib/endpoint-extractor.mjs:56`, `scripts/lib/endpoint-extractor.mjs:77`, `scripts/lib/endpoint-extractor.mjs:99` |
| Configuration Boundary | Configuration Boundary | `medium` | 3 | 65 | 230 | 21.62% | `scripts/lib/plugin-root.mjs:8`, `scripts/lib/plugin-root.mjs:15`, `scripts/lib/plugin-root.mjs:15` |
| Repository | Repository | `medium` | 1 | 45 | 228 | 21.43% | `scripts/lib/usage.mjs:25`, `scripts/lib/usage.mjs:48`, `scripts/lib/usage.mjs:48` |
| Command | Command | `medium` | 3 | 36 | 245 | 23.03% | `scripts/lib/endpoint-extractor.mjs:99`, `scripts/lib/endpoint-extractor.mjs:104`, `scripts/lib/endpoint-extractor.mjs:110` |
| Markdown lines renderer | - | `medium` | 1 | 27 | 35 | 3.29% | `scripts/lib/usage.mjs:221`, `scripts/lib/usage.mjs:223`, `scripts/lib/usage.mjs:224` |
| Observer / PubSub | Observer / PubSub | `medium` | 1 | 13 | 105 | 9.87% | `scripts/lib/usage.mjs:25`, `scripts/lib/usage.mjs:41`, `scripts/lib/usage.mjs:44` |
| Error Handling Policy | Error Handling Policy | `medium` | 2 | 12 | 182 | 17.11% | `scripts/lib/resolve-ast-grep.mjs:31`, `scripts/lib/resolve-ast-grep.mjs:34`, `scripts/lib/resolve-ast-grep.mjs:41` |
| Scattered Config Access | Scattered Config Access | `intent-only` | 3 | 11 | 114 | 10.71% | `scripts/lib/plugin-root.mjs:8`, `scripts/lib/plugin-root.mjs:15`, `scripts/lib/plugin-root.mjs:15` |
| Factory | Factory | `medium` | 1 | 5 | 66 | 6.20% | `scripts/lib/usage.mjs:129`, `scripts/lib/usage.mjs:132`, `scripts/lib/usage.mjs:132` |
| JSON config loader | - | `high` | 2 | 2 | 2 | 0.19% | `scripts/lib/resolve-ast-grep.mjs:39`, `scripts/lib/usage.mjs:396` |
| Logging / Observability Boundary | Logging / Observability Boundary | `medium` | 1 | 2 | 72 | 6.77% | `scripts/lib/usage.mjs:206`, `scripts/lib/usage.mjs:273` |
| Child process runner | - | `medium` | 1 | 1 | 10 | 0.94% | `scripts/lib/resolve-ast-grep.mjs:51` |
| Dependency Injection | Dependency Injection | `medium` | 1 | 1 | 1 | 0.09% | `scripts/lib/skip-dirs.mjs:16` |
| Generated file writer | - | `medium` | 1 | 1 | 1 | 0.09% | `scripts/lib/usage.mjs:142` |

Expected headline patterns not detected:

| Pattern | Family | Confidence | Language | Tags |
|---------|--------|------------|----------|------|
| Facade | Facade | `medium` | `JavaScript` | `facade`, `design-pattern`, `service`, `api`, `subsystem`, `boundary` |
| Service Layer | Service Layer | `medium` | `JavaScript` | `service-layer`, `architecture-pattern`, `service`, `application`, `orchestration`, `business-rules` |

Files without headline pattern evidence:

- `scripts/lib/sg-result.mjs`

### module-map

Root: `scripts/module-map`. Signal: `broad-pattern-evidence`. Pattern line coverage: 46.84% (3684/7865 lines).

Detected patterns:

| Pattern | Family | Confidence | Files | Occurrences | Lines | Line % | Examples |
|---------|--------|------------|-------|-------------|-------|--------|----------|
| Configuration Boundary | Configuration Boundary | `medium` | 19 | 434 | 1773 | 22.54% | `scripts/module-map/generate-module-map.mjs:177`, `scripts/module-map/generate-module-map.mjs:178`, `scripts/module-map/generate-module-map.mjs:212` |
| Large Conditional Dispatch | Large Conditional Dispatch | `intent-only` | 33 | 299 | 4736 | 60.22% | `scripts/module-map/generate-module-map.mjs:72`, `scripts/module-map/generate-module-map.mjs:85`, `scripts/module-map/generate-module-map.mjs:123` |
| Logging / Observability Boundary | Logging / Observability Boundary | `medium` | 16 | 242 | 2166 | 27.54% | `scripts/module-map/generate-module-map.mjs:85`, `scripts/module-map/generate-module-map.mjs:88`, `scripts/module-map/generate-module-map.mjs:88` |
| Markdown lines renderer | - | `medium` | 6 | 165 | 191 | 2.43% | `scripts/module-map/lib/architecture.mjs:124`, `scripts/module-map/lib/architecture.mjs:125`, `scripts/module-map/lib/architecture.mjs:126` |
| Command | Command | `medium` | 12 | 131 | 1203 | 15.30% | `scripts/module-map/generate-module-map.mjs:30`, `scripts/module-map/generate-module-map.mjs:31`, `scripts/module-map/generate-module-map.mjs:57` |
| Factory | Factory | `medium` | 18 | 117 | 839 | 10.67% | `scripts/module-map/generate-module-map.mjs:24`, `scripts/module-map/generate-module-map.mjs:33`, `scripts/module-map/generate-module-map.mjs:47` |
| Dependency Injection | Dependency Injection | `medium` | 10 | 101 | 748 | 9.51% | `scripts/module-map/lib/adapters/csharp.mjs:22`, `scripts/module-map/lib/adapters/csharp.mjs:27`, `scripts/module-map/lib/adapters/csharp.mjs:51` |
| Repository | Repository | `medium` | 7 | 39 | 342 | 4.35% | `scripts/module-map/generate-module-map.mjs:25`, `scripts/module-map/generate-module-map.mjs:30`, `scripts/module-map/generate-module-map.mjs:31` |
| Error Handling Policy | Error Handling Policy | `medium` | 7 | 35 | 341 | 4.34% | `scripts/module-map/generate-module-map.mjs:85`, `scripts/module-map/generate-module-map.mjs:95`, `scripts/module-map/generate-module-map.mjs:375` |
| Strategy | Strategy | `medium` | 1 | 21 | 78 | 0.99% | `scripts/module-map/lib/adapters/typescript.mjs:361`, `scripts/module-map/lib/adapters/typescript.mjs:364`, `scripts/module-map/lib/adapters/typescript.mjs:370` |
| Adapter | Adapter | `medium` | 4 | 19 | 70 | 0.89% | `scripts/module-map/lib/adapters/csharp.mjs:54`, `scripts/module-map/lib/adapters/csharp.mjs:73`, `scripts/module-map/lib/adapters/index.mjs:8` |
| Observer / PubSub | Observer / PubSub | `medium` | 3 | 18 | 163 | 2.07% | `scripts/module-map/generate-module-map.mjs:43`, `scripts/module-map/generate-module-map.mjs:123`, `scripts/module-map/generate-module-map.mjs:127` |
| Scattered Config Access | Scattered Config Access | `intent-only` | 3 | 17 | 42 | 0.53% | `scripts/module-map/lib/bootstrap.mjs:300`, `scripts/module-map/lib/bootstrap.mjs:303`, `scripts/module-map/lib/bootstrap.mjs:303` |
| JSON config loader | - | `high` | 10 | 15 | 17 | 0.22% | `scripts/module-map/generate-module-map.mjs:93`, `scripts/module-map/lib/adapters/typescript.mjs:559`, `scripts/module-map/lib/architecture.mjs:47` |
| Generated file writer | - | `medium` | 6 | 13 | 85 | 1.08% | `scripts/module-map/generate-module-map.mjs:259`, `scripts/module-map/generate-module-map.mjs:265`, `scripts/module-map/generate-module-map.mjs:311` |
| Chain of Responsibility | Chain of Responsibility | `medium` | 2 | 10 | 58 | 0.74% | `scripts/module-map/generate-module-map.mjs:72`, `scripts/module-map/generate-module-map.mjs:77`, `scripts/module-map/generate-module-map.mjs:78` |
| Validation Boundary | Validation Boundary | `medium` | 2 | 4 | 97 | 1.23% | `scripts/module-map/generate-module-map.mjs:177`, `scripts/module-map/generate-module-map.mjs:178`, `scripts/module-map/lib/render.mjs:8` |
| Child process runner | - | `medium` | 2 | 2 | 10 | 0.13% | `scripts/module-map/lib/adapters/sg-scan.mjs:43`, `scripts/module-map/regen-if-source-changed.mjs:97` |
| Decorator | Decorator | `medium` | 1 | 1 | 9 | 0.11% | `scripts/module-map/regen-if-source-changed.mjs:41` |
| Node CLI argument parser | - | `high` | 1 | 1 | 1 | 0.01% | `scripts/module-map/generate-module-map.mjs:49` |

Expected headline patterns not detected:

| Pattern | Family | Confidence | Language | Tags |
|---------|--------|------------|----------|------|
| Facade | Facade | `medium` | `JavaScript` | `facade`, `design-pattern`, `service`, `api`, `subsystem`, `boundary` |
| Service Layer | Service Layer | `medium` | `JavaScript` | `service-layer`, `architecture-pattern`, `service`, `application`, `orchestration`, `business-rules` |

Files without headline pattern evidence:

- `scripts/module-map/lib/detection/metrics.mjs`
- `scripts/module-map/lib/detection/metrics.test.mjs`
- `scripts/module-map/lib/detection/partitions.mjs`
- `scripts/module-map/lib/detection/types.mjs`
- `scripts/module-map/lib/module-ownership.mjs`
- `scripts/module-map/lib/node-organization.mjs`

### Unowned

Root: ``. Signal: `broad-pattern-evidence`. Pattern line coverage: 48.28% (56/116 lines).

Detected patterns:

| Pattern | Family | Confidence | Files | Occurrences | Lines | Line % | Examples |
|---------|--------|------------|-------|-------------|-------|--------|----------|
| Command | Command | `medium` | 1 | 9 | 54 | 46.55% | `scripts/map-code/generate.mjs:56`, `scripts/map-code/generate.mjs:58`, `scripts/map-code/generate.mjs:58` |
| Observer / PubSub | Observer / PubSub | `medium` | 1 | 6 | 30 | 25.86% | `scripts/map-code/generate.mjs:13`, `scripts/map-code/generate.mjs:56`, `scripts/map-code/generate.mjs:60` |
| Error Handling Policy | Error Handling Policy | `medium` | 1 | 5 | 41 | 35.34% | `scripts/map-code/generate.mjs:56`, `scripts/map-code/generate.mjs:71`, `scripts/map-code/generate.mjs:91` |
| Logging / Observability Boundary | Logging / Observability Boundary | `medium` | 1 | 3 | 29 | 25.00% | `scripts/map-code/generate.mjs:56`, `scripts/map-code/generate.mjs:60`, `scripts/map-code/generate.mjs:66` |
| Child process runner | - | `medium` | 1 | 1 | 4 | 3.45% | `scripts/map-code/generate.mjs:92` |
| Large Conditional Dispatch | Large Conditional Dispatch | `intent-only` | 1 | 1 | 12 | 10.34% | `scripts/map-code/generate.mjs:91` |
| Node CLI argument parser | - | `high` | 1 | 1 | 1 | 0.86% | `scripts/map-code/generate.mjs:32` |

## Pattern Details

### Large Conditional Dispatch

Conditional dispatch keywords are present; inspect before treating this as a smell.

Confidence: `intent-only`. Headline coverage: excluded.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 33 | 299 | 91.67% |
| code-map | 14 | 235 | 100.00% |
| lib | 5 | 124 | 83.33% |
| Unowned | 1 | 1 | 100.00% |

Examples:

- `scripts/code-map/generate-code-map.mjs:57` (code-map)
- `scripts/code-map/generate-code-map.mjs:82` (code-map)
- `scripts/code-map/generate-code-map.mjs:146` (code-map)
- `scripts/code-map/generate-code-map.mjs:179` (code-map)
- `scripts/code-map/generate-code-map.mjs:209` (code-map)

### Configuration Boundary

Code reads environment or configuration values.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 19 | 434 | 52.78% |
| code-map | 6 | 67 | 42.86% |
| lib | 3 | 65 | 50.00% |

Examples:

- `scripts/code-map/generate-code-map.mjs:57` (code-map)
- `scripts/code-map/generate-code-map.mjs:61` (code-map)
- `scripts/code-map/generate-code-map.mjs:61` (code-map)
- `scripts/code-map/generate-code-map.mjs:62` (code-map)
- `scripts/code-map/generate-code-map.mjs:62` (code-map)

### Markdown lines renderer

Markdown output is assembled by pushing strings into a lines array.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 6 | 165 | 16.67% |
| code-map | 2 | 126 | 14.29% |
| lib | 1 | 27 | 16.67% |

Examples:

- `scripts/code-map/lib/file-header-comment.mjs:103` (code-map)
- `scripts/code-map/lib/patterns/render.mjs:7` (code-map)
- `scripts/code-map/lib/patterns/render.mjs:8` (code-map)
- `scripts/code-map/lib/patterns/render.mjs:9` (code-map)
- `scripts/code-map/lib/patterns/render.mjs:12` (code-map)

### Command

Names indicate command, action, job, task, or execute/run/handle entry points.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 12 | 131 | 33.33% |
| code-map | 4 | 82 | 28.57% |
| lib | 3 | 36 | 50.00% |
| Unowned | 1 | 9 | 100.00% |

Examples:

- `scripts/code-map/generate-code-map.mjs:146` (code-map)
- `scripts/code-map/generate-code-map.mjs:146` (code-map)
- `scripts/code-map/generate-code-map.mjs:364` (code-map)
- `scripts/code-map/generate-code-map.mjs:364` (code-map)
- `scripts/code-map/generate-code-map.mjs:366` (code-map)

### Logging / Observability Boundary

Code emits logs, metrics, traces, spans, or diagnostic records.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 16 | 242 | 44.44% |
| code-map | 2 | 6 | 14.29% |
| Unowned | 1 | 3 | 100.00% |
| lib | 1 | 2 | 16.67% |

Examples:

- `scripts/code-map/generate-code-map.mjs:398` (code-map)
- `scripts/code-map/generate-code-map.mjs:402` (code-map)
- `scripts/code-map/generate-code-map.mjs:408` (code-map)
- `scripts/code-map/generate-patterns.mjs:234` (code-map)
- `scripts/code-map/generate-patterns.mjs:235` (code-map)

### Factory

Names indicate factory or builder-style creation behavior.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 18 | 117 | 50.00% |
| code-map | 3 | 23 | 21.43% |
| lib | 1 | 5 | 16.67% |

Examples:

- `scripts/code-map/generate-code-map.mjs:272` (code-map)
- `scripts/code-map/generate-code-map.mjs:272` (code-map)
- `scripts/code-map/generate-code-map.mjs:364` (code-map)
- `scripts/code-map/generate-code-map.mjs:378` (code-map)
- `scripts/code-map/generate-code-map.mjs:378` (code-map)

### Dependency Injection

Names indicate providers, containers, injected dependencies, or composition roots.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 10 | 101 | 27.78% |
| code-map | 5 | 33 | 35.71% |
| lib | 1 | 1 | 16.67% |

Examples:

- `scripts/code-map/generate-code-map.mjs:35` (code-map)
- `scripts/code-map/generate-code-map.mjs:36` (code-map)
- `scripts/code-map/generate-code-map.mjs:36` (code-map)
- `scripts/code-map/generate-code-map.mjs:146` (code-map)
- `scripts/code-map/generate-code-map.mjs:147` (code-map)

### Error Handling Policy

Names indicate error classes, result wrappers, exception mapping, or failure policy.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| code-map | 5 | 78 | 35.71% |
| module-map | 7 | 35 | 19.44% |
| lib | 2 | 12 | 33.33% |
| Unowned | 1 | 5 | 100.00% |

Examples:

- `scripts/code-map/generate-code-map.mjs:82` (code-map)
- `scripts/code-map/generate-code-map.mjs:106` (code-map)
- `scripts/code-map/generate-code-map.mjs:146` (code-map)
- `scripts/code-map/generate-code-map.mjs:152` (code-map)
- `scripts/code-map/generate-code-map.mjs:364` (code-map)

### Repository

Names indicate repository, store, DAO, persistence, or data access boundaries.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| lib | 1 | 45 | 16.67% |
| module-map | 7 | 39 | 19.44% |
| code-map | 3 | 14 | 21.43% |

Examples:

- `scripts/code-map/generate-code-map.mjs:200` (code-map)
- `scripts/code-map/generate-code-map.mjs:200` (code-map)
- `scripts/code-map/generate-code-map.mjs:209` (code-map)
- `scripts/code-map/generate-code-map.mjs:211` (code-map)
- `scripts/code-map/generate-code-map.mjs:211` (code-map)

### Observer / PubSub

Names indicate event, listener, publish/subscribe, emit, or notification behavior.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 3 | 18 | 8.33% |
| lib | 1 | 13 | 16.67% |
| code-map | 3 | 12 | 21.43% |
| Unowned | 1 | 6 | 100.00% |

Examples:

- `scripts/code-map/generate-code-map.mjs:32` (code-map)
- `scripts/code-map/generate-code-map.mjs:398` (code-map)
- `scripts/code-map/generate-code-map.mjs:402` (code-map)
- `scripts/code-map/generate-code-map.mjs:402` (code-map)
- `scripts/code-map/generate-code-map.mjs:419` (code-map)

### Strategy

Names indicate interchangeable strategy, policy, rule, or selector behavior.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 1 | 21 | 2.78% |
| code-map | 2 | 20 | 14.29% |

Examples:

- `scripts/code-map/lib/patterns/catalog.mjs:290` (code-map)
- `scripts/code-map/lib/patterns/catalog.mjs:323` (code-map)
- `scripts/code-map/lib/patterns/catalog.mjs:323` (code-map)
- `scripts/code-map/lib/patterns/catalog.mjs:353` (code-map)
- `scripts/code-map/lib/patterns/catalog.mjs:353` (code-map)

### Scattered Config Access

Direct environment/config reads are present; inspect whether this module owns configuration.

Confidence: `intent-only`. Headline coverage: excluded.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 3 | 17 | 8.33% |
| lib | 3 | 11 | 50.00% |
| code-map | 1 | 5 | 7.14% |

Examples:

- `scripts/code-map/generate-code-map.mjs:82` (code-map)
- `scripts/code-map/generate-code-map.mjs:86` (code-map)
- `scripts/code-map/generate-code-map.mjs:86` (code-map)
- `scripts/code-map/generate-code-map.mjs:87` (code-map)
- `scripts/code-map/generate-code-map.mjs:87` (code-map)

### JSON config loader

Runtime configuration is loaded by parsing JSON read from disk.

Confidence: `high`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 10 | 15 | 27.78% |
| code-map | 4 | 7 | 28.57% |
| lib | 2 | 2 | 33.33% |

Examples:

- `scripts/code-map/lib/code-map-config.mjs:76` (code-map)
- `scripts/code-map/lib/patterns/catalog.mjs:112` (code-map)
- `scripts/code-map/lib/patterns/model.mjs:31` (code-map)
- `scripts/code-map/lib/patterns/runtime-config.mjs:74` (code-map)
- `scripts/code-map/lib/patterns/runtime-config.mjs:86` (code-map)

### Adapter

Names indicate adapter, mapper, translator, or gateway behavior.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 4 | 19 | 11.11% |

Examples:

- `scripts/module-map/lib/adapters/csharp.mjs:54` (module-map)
- `scripts/module-map/lib/adapters/csharp.mjs:73` (module-map)
- `scripts/module-map/lib/adapters/index.mjs:8` (module-map)
- `scripts/module-map/lib/adapters/index.mjs:9` (module-map)
- `scripts/module-map/lib/adapters/index.mjs:10` (module-map)

### Generated file writer

Code writes generated artifacts with writeFileSync.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 6 | 13 | 16.67% |
| code-map | 3 | 5 | 21.43% |
| lib | 1 | 1 | 16.67% |

Examples:

- `scripts/code-map/generate-code-map.mjs:381` (code-map)
- `scripts/code-map/generate-patterns.mjs:142` (code-map)
- `scripts/code-map/generate-patterns.mjs:144` (code-map)
- `scripts/code-map/lib/patterns/temp-rules.mjs:30` (code-map)
- `scripts/code-map/lib/patterns/temp-rules.mjs:47` (code-map)

### Chain of Responsibility

Names indicate middleware, pipeline, handler chain, or next-step behavior.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 2 | 10 | 5.56% |
| code-map | 1 | 7 | 7.14% |

Examples:

- `scripts/code-map/generate-patterns.mjs:36` (code-map)
- `scripts/code-map/generate-patterns.mjs:41` (code-map)
- `scripts/code-map/generate-patterns.mjs:42` (code-map)
- `scripts/code-map/generate-patterns.mjs:42` (code-map)
- `scripts/code-map/generate-patterns.mjs:42` (code-map)

### Child process runner

Code shells out through spawnSync for local tooling integration.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| code-map | 2 | 2 | 14.29% |
| module-map | 2 | 2 | 5.56% |
| lib | 1 | 1 | 16.67% |
| Unowned | 1 | 1 | 100.00% |

Examples:

- `scripts/code-map/generate-code-map.mjs:157` (code-map)
- `scripts/code-map/lib/patterns/scanner.mjs:102` (code-map)
- `scripts/lib/resolve-ast-grep.mjs:51` (lib)
- `scripts/map-code/generate.mjs:92` (unowned)
- `scripts/module-map/lib/adapters/sg-scan.mjs:43` (module-map)

### Node CLI argument parser

A Node CLI entry point reads command-line arguments from process.argv.

Confidence: `high`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| code-map | 2 | 2 | 14.29% |
| module-map | 1 | 1 | 2.78% |
| Unowned | 1 | 1 | 100.00% |

Examples:

- `scripts/code-map/generate-code-map.mjs:84` (code-map)
- `scripts/code-map/generate-patterns.mjs:24` (code-map)
- `scripts/map-code/generate.mjs:32` (unowned)
- `scripts/module-map/generate-module-map.mjs:49` (module-map)

### Validation Boundary

Names indicate validation, schema, guard, parser, or assertion behavior.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 2 | 4 | 5.56% |

Examples:

- `scripts/module-map/generate-module-map.mjs:177` (module-map)
- `scripts/module-map/generate-module-map.mjs:178` (module-map)
- `scripts/module-map/lib/render.mjs:8` (module-map)
- `scripts/module-map/lib/render.mjs:82` (module-map)

### Decorator

Names indicate decorator, wrapper, proxy, retry, cache, auth, or logging wrappers.

Confidence: `medium`. Headline coverage: included.

| Module | Files | Occurrences | Coverage |
|--------|-------|-------------|----------|
| module-map | 1 | 1 | 2.78% |

Examples:

- `scripts/module-map/regen-if-source-changed.mjs:41` (module-map)

## Limitations

Pattern matches are structural evidence, not proof of author intent. Pattern absence is a review signal, not a defect by itself. Inspect the cited examples and module responsibilities before changing code.
`intent-only` signals are reported separately and excluded from headline coverage.

<!-- plan-product:patterns generated 2026-07-07T21:34:24.829Z -->
