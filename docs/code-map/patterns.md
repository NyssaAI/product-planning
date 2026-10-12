# plan-product Known Code Patterns

Generated: 2026-10-12T14:21:35.107Z. Regenerate with `find-code-patterns`.

Use this report to find code that may use known patterns and inspect the cited source before reusing or changing it.

Matches describe detector evidence, not a quality score. A name match suggests intent; it does not establish the relationships that define a design pattern. No match does not establish absence.

## Scan Scope

| Metric | Count |
|--------|-------|
| Source files | 69 |
| Eligible files | 69 |
| Excluded files | 0 |
| Detectors evaluated | 92 |
| Detectors matched | 17 |
| Occurrences | 1027 |

Inputs: `docs/code-map/code-map.json`, `docs/code-map/module-map.json`.
Roots: `scripts`, `skills`. Languages: JavaScript, TypeScript, CSharp, Python, Go.

## Confidence and Limits

- `high`: a detector matched specific syntax or an API shape; this confirms that shape, not correct design.
- `medium`: a structural heuristic matched; inspect its description and surrounding code.
- `intent-only`: names or other weak clues suggest a pattern; verify responsibilities and relationships in source.

Confidence is catalog-supplied, not a calibrated probability. JSON coverage fields describe matched files or syntax ranges only; they do not measure architecture quality or how much code should use patterns.

## Module Evidence

| Module | Eligible files | Matched detectors | Source examples |
|--------|----------------|-------------------|-----------------|
| [code-map](#module-code-map) | 15 | 16 | [scripts/code-map/generate-code-map.mjs:113](../../scripts/code-map/generate-code-map.mjs#L113), [scripts/code-map/generate-code-map.mjs:118](../../scripts/code-map/generate-code-map.mjs#L118), [scripts/code-map/generate-code-map.mjs:164](../../scripts/code-map/generate-code-map.mjs#L164) |
| [lib](#module-lib) | 12 | 12 | [scripts/lib/usage.mjs:269](../../scripts/lib/usage.mjs#L269), [scripts/lib/usage.mjs:271](../../scripts/lib/usage.mjs#L271), [scripts/lib/usage.mjs:272](../../scripts/lib/usage.mjs#L272) |
| [map-code](#module-map-code) | 3 | 9 | [scripts/map-code/generate.mjs:82](../../scripts/map-code/generate.mjs#L82), [scripts/map-code/generate.mjs:128](../../scripts/map-code/generate.mjs#L128), [scripts/map-code/generate.mjs:131](../../scripts/map-code/generate.mjs#L131) |
| [module-map](#module-module-map) | 39 | 16 | [scripts/module-map/lib/architecture.mjs:124](../../scripts/module-map/lib/architecture.mjs#L124), [scripts/module-map/lib/architecture.mjs:125](../../scripts/module-map/lib/architecture.mjs#L125), [scripts/module-map/lib/architecture.mjs:126](../../scripts/module-map/lib/architecture.mjs#L126) |

Each module shows up to 12 matched detectors and 3 source examples per detector. [patterns.json](patterns.json) contains every detector and its complete `occurrences` list (file, line range, module).

<a id="module-code-map"></a>
### code-map

Root: `scripts/code-map`.

- **Error Handling Policy** — `intent-only`, 7 files, 43 occurrences. [scripts/code-map/generate-code-map.mjs:113](../../scripts/code-map/generate-code-map.mjs#L113), [scripts/code-map/generate-code-map.mjs:118](../../scripts/code-map/generate-code-map.mjs#L118), [scripts/code-map/generate-code-map.mjs:164](../../scripts/code-map/generate-code-map.mjs#L164)
  Detector: `error-handling-policy-error-policy-language-javascript` (JavaScript). Names indicate error classes, result wrappers, exception mapping, or failure policy.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: errors are typed or classified; transport mapping is consistent; retries and fallbacks are explicit.
  40 further occurrences are available under this detector in patterns.json.

- **Command** — `intent-only`, 4 files, 33 occurrences. [scripts/code-map/generate-code-map.mjs:16](../../scripts/code-map/generate-code-map.mjs#L16), [scripts/code-map/generate-code-map.mjs:158](../../scripts/code-map/generate-code-map.mjs#L158), [scripts/code-map/generate-code-map.mjs:167](../../scripts/code-map/generate-code-map.mjs#L167)
  Detector: `command-named-command-javascript` (JavaScript). Names indicate command, action, job, task, or execute/run/handle entry points.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: action is named and testable; execution contract is consistent; side effects are contained.
  30 further occurrences are available under this detector in patterns.json.

- **Configuration Boundary** — `intent-only`, 5 files, 28 occurrences. [scripts/code-map/generate-code-map.mjs:90](../../scripts/code-map/generate-code-map.mjs#L90), [scripts/code-map/generate-code-map.mjs:96](../../scripts/code-map/generate-code-map.mjs#L96), [scripts/code-map/generate-code-map.mjs:108](../../scripts/code-map/generate-code-map.mjs#L108)
  Detector: `configuration-boundary-config-access-javascript` (JavaScript). Code reads environment or configuration values.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: config access is centralized; callers receive typed settings; defaults and validation are visible.
  25 further occurrences are available under this detector in patterns.json.

- **Markdown lines renderer** — `medium`, 2 files, 21 occurrences. [scripts/code-map/lib/file-header-comment.mjs:103](../../scripts/code-map/lib/file-header-comment.mjs#L103), [scripts/code-map/lib/patterns/render.mjs:49](../../scripts/code-map/lib/patterns/render.mjs#L49), [scripts/code-map/lib/patterns/render.mjs:51](../../scripts/code-map/lib/patterns/render.mjs#L51)
  Detector: `markdown-lines-renderer` (JavaScript). Markdown output is assembled by pushing strings into a lines array.
  18 further occurrences are available under this detector in patterns.json.

- **Repository** — `intent-only`, 5 files, 18 occurrences. [scripts/code-map/generate-code-map.mjs:19](../../scripts/code-map/generate-code-map.mjs#L19), [scripts/code-map/generate-code-map.mjs:116](../../scripts/code-map/generate-code-map.mjs#L116), [scripts/code-map/generate-code-map.mjs:196](../../scripts/code-map/generate-code-map.mjs#L196)
  Detector: `repository-named-repository-javascript` (JavaScript). Names indicate repository, store, DAO, persistence, or data access boundaries.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: data access is centralized; domain/application code avoids raw database calls; queries are named and testable.
  15 further occurrences are available under this detector in patterns.json.

- **Dependency Injection** — `intent-only`, 4 files, 16 occurrences. [scripts/code-map/generate-code-map.mjs:42](../../scripts/code-map/generate-code-map.mjs#L42), [scripts/code-map/generate-code-map.mjs:43](../../scripts/code-map/generate-code-map.mjs#L43), [scripts/code-map/generate-code-map.mjs:160](../../scripts/code-map/generate-code-map.mjs#L160)
  Detector: `dependency-injection-injection-language-javascript` (JavaScript). Names indicate providers, containers, injected dependencies, or composition roots.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: dependencies are explicit; construction lives at the composition root; consumers are testable with fakes.
  13 further occurrences are available under this detector in patterns.json.

- **Factory** — `intent-only`, 4 files, 14 occurrences. [scripts/code-map/generate-code-map.mjs:37](../../scripts/code-map/generate-code-map.mjs#L37), [scripts/code-map/generate-code-map.mjs:266](../../scripts/code-map/generate-code-map.mjs#L266), [scripts/code-map/generate-code-map.mjs:276](../../scripts/code-map/generate-code-map.mjs#L276)
  Detector: `factory-named-factory-javascript` (JavaScript). Names indicate factory or builder-style creation behavior.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: construction is centralized; callers avoid scattered variant branching; creation rules are testable.
  11 further occurrences are available under this detector in patterns.json.

- **JSON config loader** — `high`, 4 files, 8 occurrences. [scripts/code-map/lib/code-map-config.mjs:80](../../scripts/code-map/lib/code-map-config.mjs#L80), [scripts/code-map/lib/code-map-config.mjs:110](../../scripts/code-map/lib/code-map-config.mjs#L110), [scripts/code-map/lib/patterns/catalog.mjs:86](../../scripts/code-map/lib/patterns/catalog.mjs#L86)
  Detector: `node-json-config-loader` (JavaScript). Runtime configuration is loaded by parsing JSON read from disk.
  5 further occurrences are available under this detector in patterns.json.

- **Strategy** — `intent-only`, 2 files, 8 occurrences. [scripts/code-map/lib/patterns/catalog.mjs:299](../../scripts/code-map/lib/patterns/catalog.mjs#L299), [scripts/code-map/lib/patterns/catalog.mjs:332](../../scripts/code-map/lib/patterns/catalog.mjs#L332), [scripts/code-map/lib/patterns/catalog.mjs:335](../../scripts/code-map/lib/patterns/catalog.mjs#L335)
  Detector: `strategy-named-strategy-javascript` (JavaScript). Names indicate interchangeable strategy, policy, rule, or selector behavior.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: stable abstraction; multiple implementations; caller depends on abstraction; selection logic is isolated.
  5 further occurrences are available under this detector in patterns.json.

- **Decorator** — `intent-only`, 3 files, 7 occurrences. [scripts/code-map/generate-code-map.mjs:37](../../scripts/code-map/generate-code-map.mjs#L37), [scripts/code-map/generate-code-map.mjs:276](../../scripts/code-map/generate-code-map.mjs#L276), [scripts/code-map/generate-code-map.mjs:276](../../scripts/code-map/generate-code-map.mjs#L276)
  Detector: `decorator-named-decorator-javascript` (JavaScript). Names indicate decorator, wrapper, proxy, retry, cache, auth, or logging wrappers.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: wrapper delegates to wrapped dependency; cross-cutting policy is isolated; callers still see the original contract.
  4 further occurrences are available under this detector in patterns.json.

- **Observer / PubSub** — `intent-only`, 2 files, 5 occurrences. [scripts/code-map/generate-code-map.mjs:38](../../scripts/code-map/generate-code-map.mjs#L38), [scripts/code-map/generate-code-map.mjs:430](../../scripts/code-map/generate-code-map.mjs#L430), [scripts/code-map/generate-code-map.mjs:447](../../scripts/code-map/generate-code-map.mjs#L447)
  Detector: `observer-pubsub-event-listener-javascript` (JavaScript). Names indicate event, listener, publish/subscribe, emit, or notification behavior.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: subscription API is explicit; publisher does not know concrete observers; events carry stable payloads.
  2 further occurrences are available under this detector in patterns.json.

- **Chain of Responsibility** — `intent-only`, 1 files, 4 occurrences. [scripts/code-map/generate-patterns.mjs:43](../../scripts/code-map/generate-patterns.mjs#L43), [scripts/code-map/generate-patterns.mjs:44](../../scripts/code-map/generate-patterns.mjs#L44), [scripts/code-map/generate-patterns.mjs:44](../../scripts/code-map/generate-patterns.mjs#L44)
  Detector: `chain-of-responsibility-pipeline-handler-javascript` (JavaScript). Names indicate middleware, pipeline, handler chain, or next-step behavior.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: steps are independently testable; ordering is explicit; next/fallthrough behavior is visible.
  1 further occurrences are available under this detector in patterns.json.

4 additional matched detectors for `code-map` are available in patterns.json.

<a id="module-lib"></a>
### lib

Root: `scripts/lib`.

- **Markdown lines renderer** — `medium`, 1 files, 27 occurrences. [scripts/lib/usage.mjs:269](../../scripts/lib/usage.mjs#L269), [scripts/lib/usage.mjs:271](../../scripts/lib/usage.mjs#L271), [scripts/lib/usage.mjs:272](../../scripts/lib/usage.mjs#L272)
  Detector: `markdown-lines-renderer` (JavaScript). Markdown output is assembled by pushing strings into a lines array.
  24 further occurrences are available under this detector in patterns.json.

- **Configuration Boundary** — `intent-only`, 2 files, 26 occurrences. [scripts/lib/map-freshness.mjs:97](../../scripts/lib/map-freshness.mjs#L97), [scripts/lib/map-freshness.mjs:98](../../scripts/lib/map-freshness.mjs#L98), [scripts/lib/map-freshness.mjs:103](../../scripts/lib/map-freshness.mjs#L103)
  Detector: `configuration-boundary-config-access-javascript` (JavaScript). Code reads environment or configuration values.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: config access is centralized; callers receive typed settings; defaults and validation are visible.
  23 further occurrences are available under this detector in patterns.json.

- **Repository** — `intent-only`, 3 files, 23 occurrences. [scripts/lib/map-freshness.mjs:9](../../scripts/lib/map-freshness.mjs#L9), [scripts/lib/map-freshness.mjs:48](../../scripts/lib/map-freshness.mjs#L48), [scripts/lib/repo-paths.mjs:28](../../scripts/lib/repo-paths.mjs#L28)
  Detector: `repository-named-repository-javascript` (JavaScript). Names indicate repository, store, DAO, persistence, or data access boundaries.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: data access is centralized; domain/application code avoids raw database calls; queries are named and testable.
  20 further occurrences are available under this detector in patterns.json.

- **Command** — `intent-only`, 2 files, 16 occurrences. [scripts/lib/endpoint-extractor.mjs:187](../../scripts/lib/endpoint-extractor.mjs#L187), [scripts/lib/endpoint-extractor.mjs:206](../../scripts/lib/endpoint-extractor.mjs#L206), [scripts/lib/endpoint-extractor.mjs:226](../../scripts/lib/endpoint-extractor.mjs#L226)
  Detector: `command-named-command-javascript` (JavaScript). Names indicate command, action, job, task, or execute/run/handle entry points.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: action is named and testable; execution contract is consistent; side effects are contained.
  13 further occurrences are available under this detector in patterns.json.

- **Error Handling Policy** — `intent-only`, 6 files, 14 occurrences. [scripts/lib/endpoint-syntax.mjs:68](../../scripts/lib/endpoint-syntax.mjs#L68), [scripts/lib/map-freshness.mjs:112](../../scripts/lib/map-freshness.mjs#L112), [scripts/lib/map-freshness.mjs:116](../../scripts/lib/map-freshness.mjs#L116)
  Detector: `error-handling-policy-error-policy-language-javascript` (JavaScript). Names indicate error classes, result wrappers, exception mapping, or failure policy.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: errors are typed or classified; transport mapping is consistent; retries and fallbacks are explicit.
  11 further occurrences are available under this detector in patterns.json.

- **Dependency Injection** — `intent-only`, 5 files, 9 occurrences. [scripts/lib/endpoint-extractor.mjs:64](../../scripts/lib/endpoint-extractor.mjs#L64), [scripts/lib/endpoint-extractor.mjs:308](../../scripts/lib/endpoint-extractor.mjs#L308), [scripts/lib/go-mod.mjs:14](../../scripts/lib/go-mod.mjs#L14)
  Detector: `dependency-injection-injection-language-javascript` (JavaScript). Names indicate providers, containers, injected dependencies, or composition roots.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: dependencies are explicit; construction lives at the composition root; consumers are testable with fakes.
  6 further occurrences are available under this detector in patterns.json.

- **Factory** — `intent-only`, 4 files, 8 occurrences. [scripts/lib/endpoint-extractor.mjs:136](../../scripts/lib/endpoint-extractor.mjs#L136), [scripts/lib/endpoint-extractor.mjs:875](../../scripts/lib/endpoint-extractor.mjs#L875), [scripts/lib/map-freshness.mjs:1](../../scripts/lib/map-freshness.mjs#L1)
  Detector: `factory-named-factory-javascript` (JavaScript). Names indicate factory or builder-style creation behavior.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: construction is centralized; callers avoid scattered variant branching; creation rules are testable.
  5 further occurrences are available under this detector in patterns.json.

- **Strategy** — `intent-only`, 1 files, 7 occurrences. [scripts/lib/endpoint-syntax.mjs:8](../../scripts/lib/endpoint-syntax.mjs#L8), [scripts/lib/endpoint-syntax.mjs:10](../../scripts/lib/endpoint-syntax.mjs#L10), [scripts/lib/endpoint-syntax.mjs:29](../../scripts/lib/endpoint-syntax.mjs#L29)
  Detector: `strategy-named-strategy-javascript` (JavaScript). Names indicate interchangeable strategy, policy, rule, or selector behavior.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: stable abstraction; multiple implementations; caller depends on abstraction; selection logic is isolated.
  4 further occurrences are available under this detector in patterns.json.

- **JSON config loader** — `high`, 4 files, 5 occurrences. [scripts/lib/map-freshness.mjs:99](../../scripts/lib/map-freshness.mjs#L99), [scripts/lib/map-freshness.mjs:127](../../scripts/lib/map-freshness.mjs#L127), [scripts/lib/plugin-root.mjs:17](../../scripts/lib/plugin-root.mjs#L17)
  Detector: `node-json-config-loader` (JavaScript). Runtime configuration is loaded by parsing JSON read from disk.
  2 further occurrences are available under this detector in patterns.json.

- **Observer / PubSub** — `intent-only`, 1 files, 5 occurrences. [scripts/lib/usage.mjs:44](../../scripts/lib/usage.mjs#L44), [scripts/lib/usage.mjs:45](../../scripts/lib/usage.mjs#L45), [scripts/lib/usage.mjs:103](../../scripts/lib/usage.mjs#L103)
  Detector: `observer-pubsub-event-listener-javascript` (JavaScript). Names indicate event, listener, publish/subscribe, emit, or notification behavior.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: subscription API is explicit; publisher does not know concrete observers; events carry stable payloads.
  2 further occurrences are available under this detector in patterns.json.

- **Generated file writer** — `medium`, 2 files, 3 occurrences. [scripts/lib/usage.mjs:97](../../scripts/lib/usage.mjs#L97), [scripts/lib/usage.mjs:179](../../scripts/lib/usage.mjs#L179), [scripts/lib/write-artifact.mjs:156](../../scripts/lib/write-artifact.mjs#L156)
  Detector: `node-generated-file-writer` (JavaScript). Code writes generated artifacts with writeFileSync.

- **Child process runner** — `medium`, 2 files, 2 occurrences. [scripts/lib/endpoint-syntax.mjs:63](../../scripts/lib/endpoint-syntax.mjs#L63), [scripts/lib/resolve-ast-grep.mjs:107](../../scripts/lib/resolve-ast-grep.mjs#L107)
  Detector: `node-child-process-runner` (JavaScript). Code shells out through spawnSync for local tooling integration.

<a id="module-map-code"></a>
### map-code

Root: `scripts/map-code`.

- **Error Handling Policy** — `intent-only`, 2 files, 8 occurrences. [scripts/map-code/generate.mjs:82](../../scripts/map-code/generate.mjs#L82), [scripts/map-code/generate.mjs:128](../../scripts/map-code/generate.mjs#L128), [scripts/map-code/generate.mjs:131](../../scripts/map-code/generate.mjs#L131)
  Detector: `error-handling-policy-error-policy-language-javascript` (JavaScript). Names indicate error classes, result wrappers, exception mapping, or failure policy.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: errors are typed or classified; transport mapping is consistent; retries and fallbacks are explicit.
  5 further occurrences are available under this detector in patterns.json.

- **Command** — `intent-only`, 1 files, 3 occurrences. [scripts/map-code/generate.mjs:68](../../scripts/map-code/generate.mjs#L68), [scripts/map-code/generate.mjs:69](../../scripts/map-code/generate.mjs#L69), [scripts/map-code/generate.mjs:122](../../scripts/map-code/generate.mjs#L122)
  Detector: `command-named-command-javascript` (JavaScript). Names indicate command, action, job, task, or execute/run/handle entry points.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: action is named and testable; execution contract is consistent; side effects are contained.

- **Logging / Observability Boundary** — `intent-only`, 2 files, 3 occurrences. [scripts/map-code/generate.mjs:77](../../scripts/map-code/generate.mjs#L77), [scripts/map-code/query.mjs:45](../../scripts/map-code/query.mjs#L45), [scripts/map-code/query.mjs:45](../../scripts/map-code/query.mjs#L45)
  Detector: `logging-observability-boundary-observability-access-javascript` (JavaScript). Code emits logs, metrics, traces, spans, or diagnostic records.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: logs are structured; metrics/traces use a shared boundary; diagnostics avoid ad hoc prints.

- **Observer / PubSub** — `intent-only`, 1 files, 3 occurrences. [scripts/map-code/generate.mjs:13](../../scripts/map-code/generate.mjs#L13), [scripts/map-code/generate.mjs:71](../../scripts/map-code/generate.mjs#L71), [scripts/map-code/generate.mjs:83](../../scripts/map-code/generate.mjs#L83)
  Detector: `observer-pubsub-event-listener-javascript` (JavaScript). Names indicate event, listener, publish/subscribe, emit, or notification behavior.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: subscription API is explicit; publisher does not know concrete observers; events carry stable payloads.

- **Repository** — `intent-only`, 1 files, 3 occurrences. [scripts/map-code/generate.mjs:105](../../scripts/map-code/generate.mjs#L105), [scripts/map-code/generate.mjs:106](../../scripts/map-code/generate.mjs#L106), [scripts/map-code/generate.mjs:113](../../scripts/map-code/generate.mjs#L113)
  Detector: `repository-named-repository-javascript` (JavaScript). Names indicate repository, store, DAO, persistence, or data access boundaries.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: data access is centralized; domain/application code avoids raw database calls; queries are named and testable.

- **Configuration Boundary** — `intent-only`, 1 files, 2 occurrences. [scripts/map-code/query.mjs:76](../../scripts/map-code/query.mjs#L76), [scripts/map-code/query.mjs:77](../../scripts/map-code/query.mjs#L77)
  Detector: `configuration-boundary-config-access-javascript` (JavaScript). Code reads environment or configuration values.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: config access is centralized; callers receive typed settings; defaults and validation are visible.

- **Node CLI argument parser** — `high`, 2 files, 2 occurrences. [scripts/map-code/generate.mjs:35](../../scripts/map-code/generate.mjs#L35), [scripts/map-code/query.mjs:62](../../scripts/map-code/query.mjs#L62)
  Detector: `node-cli-argv-parser` (JavaScript). A Node CLI entry point reads command-line arguments from process.argv.

- **Child process runner** — `medium`, 1 files, 1 occurrences. [scripts/map-code/generate.mjs:123](../../scripts/map-code/generate.mjs#L123)
  Detector: `node-child-process-runner` (JavaScript). Code shells out through spawnSync for local tooling integration.

- **JSON config loader** — `high`, 1 files, 1 occurrences. [scripts/map-code/query.mjs:77](../../scripts/map-code/query.mjs#L77)
  Detector: `node-json-config-loader` (JavaScript). Runtime configuration is loaded by parsing JSON read from disk.

<a id="module-module-map"></a>
### module-map

Root: `scripts/module-map`.

- **Markdown lines renderer** — `medium`, 6 files, 167 occurrences. [scripts/module-map/lib/architecture.mjs:124](../../scripts/module-map/lib/architecture.mjs#L124), [scripts/module-map/lib/architecture.mjs:125](../../scripts/module-map/lib/architecture.mjs#L125), [scripts/module-map/lib/architecture.mjs:126](../../scripts/module-map/lib/architecture.mjs#L126)
  Detector: `markdown-lines-renderer` (JavaScript). Markdown output is assembled by pushing strings into a lines array.
  164 further occurrences are available under this detector in patterns.json.

- **Configuration Boundary** — `intent-only`, 13 files, 152 occurrences. [scripts/module-map/generate-module-map.mjs:223](../../scripts/module-map/generate-module-map.mjs#L223), [scripts/module-map/generate-module-map.mjs:224](../../scripts/module-map/generate-module-map.mjs#L224), [scripts/module-map/generate-module-map.mjs:234](../../scripts/module-map/generate-module-map.mjs#L234)
  Detector: `configuration-boundary-config-access-javascript` (JavaScript). Code reads environment or configuration values.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: config access is centralized; callers receive typed settings; defaults and validation are visible.
  149 further occurrences are available under this detector in patterns.json.

- **Dependency Injection** — `intent-only`, 17 files, 71 occurrences. [scripts/module-map/lib/adapters/csharp.mjs:22](../../scripts/module-map/lib/adapters/csharp.mjs#L22), [scripts/module-map/lib/adapters/csharp.mjs:27](../../scripts/module-map/lib/adapters/csharp.mjs#L27), [scripts/module-map/lib/adapters/csharp.mjs:51](../../scripts/module-map/lib/adapters/csharp.mjs#L51)
  Detector: `dependency-injection-injection-language-javascript` (JavaScript). Names indicate providers, containers, injected dependencies, or composition roots.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: dependencies are explicit; construction lives at the composition root; consumers are testable with fakes.
  68 further occurrences are available under this detector in patterns.json.

- **Command** — `intent-only`, 10 files, 60 occurrences. [scripts/module-map/generate-module-map.mjs:30](../../scripts/module-map/generate-module-map.mjs#L30), [scripts/module-map/generate-module-map.mjs:31](../../scripts/module-map/generate-module-map.mjs#L31), [scripts/module-map/generate-module-map.mjs:57](../../scripts/module-map/generate-module-map.mjs#L57)
  Detector: `command-named-command-javascript` (JavaScript). Names indicate command, action, job, task, or execute/run/handle entry points.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: action is named and testable; execution contract is consistent; side effects are contained.
  57 further occurrences are available under this detector in patterns.json.

- **Factory** — `intent-only`, 19 files, 59 occurrences. [scripts/module-map/generate-module-map.mjs:24](../../scripts/module-map/generate-module-map.mjs#L24), [scripts/module-map/generate-module-map.mjs:33](../../scripts/module-map/generate-module-map.mjs#L33), [scripts/module-map/generate-module-map.mjs:47](../../scripts/module-map/generate-module-map.mjs#L47)
  Detector: `factory-named-factory-javascript` (JavaScript). Names indicate factory or builder-style creation behavior.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: construction is centralized; callers avoid scattered variant branching; creation rules are testable.
  56 further occurrences are available under this detector in patterns.json.

- **Error Handling Policy** — `intent-only`, 15 files, 35 occurrences. [scripts/module-map/generate-module-map.mjs:95](../../scripts/module-map/generate-module-map.mjs#L95), [scripts/module-map/generate-module-map.mjs:383](../../scripts/module-map/generate-module-map.mjs#L383), [scripts/module-map/generate-module-map.mjs:428](../../scripts/module-map/generate-module-map.mjs#L428)
  Detector: `error-handling-policy-error-policy-language-javascript` (JavaScript). Names indicate error classes, result wrappers, exception mapping, or failure policy.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: errors are typed or classified; transport mapping is consistent; retries and fallbacks are explicit.
  32 further occurrences are available under this detector in patterns.json.

- **Repository** — `intent-only`, 7 files, 21 occurrences. [scripts/module-map/generate-module-map.mjs:25](../../scripts/module-map/generate-module-map.mjs#L25), [scripts/module-map/generate-module-map.mjs:30](../../scripts/module-map/generate-module-map.mjs#L30), [scripts/module-map/generate-module-map.mjs:31](../../scripts/module-map/generate-module-map.mjs#L31)
  Detector: `repository-named-repository-javascript` (JavaScript). Names indicate repository, store, DAO, persistence, or data access boundaries.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: data access is centralized; domain/application code avoids raw database calls; queries are named and testable.
  18 further occurrences are available under this detector in patterns.json.

- **Adapter** — `intent-only`, 4 files, 16 occurrences. [scripts/module-map/lib/adapters/csharp.mjs:54](../../scripts/module-map/lib/adapters/csharp.mjs#L54), [scripts/module-map/lib/adapters/csharp.mjs:73](../../scripts/module-map/lib/adapters/csharp.mjs#L73), [scripts/module-map/lib/adapters/index.mjs:8](../../scripts/module-map/lib/adapters/index.mjs#L8)
  Detector: `adapter-named-adapter-javascript` (JavaScript). Names indicate adapter, mapper, translator, or gateway behavior.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: external details stay at the boundary; local code depends on local shapes; mapping is explicit.
  13 further occurrences are available under this detector in patterns.json.

- **JSON config loader** — `high`, 11 files, 14 occurrences. [scripts/module-map/generate-module-map.mjs:93](../../scripts/module-map/generate-module-map.mjs#L93), [scripts/module-map/lib/adapters/typescript.mjs:606](../../scripts/module-map/lib/adapters/typescript.mjs#L606), [scripts/module-map/lib/architecture.mjs:47](../../scripts/module-map/lib/architecture.mjs#L47)
  Detector: `node-json-config-loader` (JavaScript). Runtime configuration is loaded by parsing JSON read from disk.
  11 further occurrences are available under this detector in patterns.json.

- **Generated file writer** — `medium`, 6 files, 11 occurrences. [scripts/module-map/install-git-hook.mjs:93](../../scripts/module-map/install-git-hook.mjs#L93), [scripts/module-map/install-git-hook.mjs:113](../../scripts/module-map/install-git-hook.mjs#L113), [scripts/module-map/lib/bootstrap.mjs:91](../../scripts/module-map/lib/bootstrap.mjs#L91)
  Detector: `node-generated-file-writer` (JavaScript). Code writes generated artifacts with writeFileSync.
  8 further occurrences are available under this detector in patterns.json.

- **Strategy** — `intent-only`, 1 files, 10 occurrences. [scripts/module-map/lib/adapters/typescript.mjs:393](../../scripts/module-map/lib/adapters/typescript.mjs#L393), [scripts/module-map/lib/adapters/typescript.mjs:399](../../scripts/module-map/lib/adapters/typescript.mjs#L399), [scripts/module-map/lib/adapters/typescript.mjs:422](../../scripts/module-map/lib/adapters/typescript.mjs#L422)
  Detector: `strategy-named-strategy-javascript` (JavaScript). Names indicate interchangeable strategy, policy, rule, or selector behavior.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: stable abstraction; multiple implementations; caller depends on abstraction; selection logic is isolated.
  7 further occurrences are available under this detector in patterns.json.

- **Chain of Responsibility** — `intent-only`, 2 files, 9 occurrences. [scripts/module-map/generate-module-map.mjs:77](../../scripts/module-map/generate-module-map.mjs#L77), [scripts/module-map/generate-module-map.mjs:78](../../scripts/module-map/generate-module-map.mjs#L78), [scripts/module-map/generate-module-map.mjs:78](../../scripts/module-map/generate-module-map.mjs#L78)
  Detector: `chain-of-responsibility-pipeline-handler-javascript` (JavaScript). Names indicate middleware, pipeline, handler chain, or next-step behavior.
  Limit: Identifier names suggest this family; verify the listed relationships in source before claiming the pattern is implemented.
  Verify in source: steps are independently testable; ordering is explicit; next/fallthrough behavior is visible.
  6 further occurrences are available under this detector in patterns.json.

4 additional matched detectors for `module-map` are available in patterns.json.

## Excluded Source Files

No detected source files were excluded from the enabled catalogs.

## Configuration

Catalog: `.plan-product/patterns/library.json`.
Configured review expectations: `.plan-product/patterns/expectations.json`.
Use language-specific structural rules when a relationship can be detected. Keep name clues tentative. Inspect source responsibilities and dependency direction before claiming a design pattern or recommending a refactor.

<!-- plan-product:patterns generated 2026-10-12T14:21:35.107Z -->
