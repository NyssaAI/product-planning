---
title: How to Add a Language to the plan-product Code-Map
date: 2026-07-31
category: architecture-patterns
module: code-map
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "adding a new language to the code-map/module-map pipeline"
  - "implementing a new stack-graph adapter under scripts/module-map/lib/adapters/"
  - "a language already has partial/legacy support that must be reconciled, not replaced"
  - "adding endpoint-extraction support for a new language's router/framework conventions"
tags:
  - language-support
  - ast-grep
  - code-map
  - module-map
  - stack-graph
  - adapter-pattern
related_components:
  - code-map
  - module-map
  - lib
---

# How to Add a Language to the plan-product Code-Map

## Context

Go repos got no code-map context at all — no symbol index entries, no endpoint index, no dependency-aware module graph, just a coarse directory fallback. Adding Go support (F-204) required touching every layer of the code-map/module-map stack, and doing so surfaced a full integration surface plus several traps that are invisible until hit. A 5-persona code review and a flow-analysis pass caught real bugs (three wrong-path-at-high-confidence group-resolution cases, and a symbol-scan bypass that let vendored files leak into the endpoint union) before they shipped. This guidance turns that one-off investigation into a repeatable recipe for the next language.

## Guidance

Add a language in this dependency order — each step builds on state the previous step established.

**1. Check for existing partial support first.** Search `scripts/code-map/rules/`, `sgconfig.yml` languageGlobs, and `scripts/module-map/lib/stack-profiles/index.mjs` before writing anything new. Go already had a legacy `cmd/*`-based `goProfile` that contradicted the new package-level module semantics, plus two too-coarse pattern rules (`func $NAME` matched free functions but missed methods with receivers). Reconcile or replace these — do not add new logic alongside contradictory old logic.

**2. Symbol rules are kind-based, one `mapKind` per rule.** No generator change is needed for symbols — the rules alone are the contract:

```yaml
id: map-go-method
message: method
severity: info
language: Go
metadata:
  mapKind: method
rule:
  kind: method_declaration
  has: { field: name, pattern: $NAME }
```

`function_declaration` / `method_declaration` / `type_spec` (refined by field to distinguish struct vs interface) cover Go. The shared `symbolNameFromMatch` reads the `$NAME` capture; do not write a bespoke name extractor per language.

**3. Hygiene is ONE shared predicate, imported everywhere — not per-consumer logic.** `scripts/lib/go-mod.mjs` exports `isExcludedGoFile` (vendor/, testdata/, `*.pb.go`, `_test.go`) as the single Go file-exclusion policy — every consumer imports it. It has three consumers: the adapter (`scripts/module-map/lib/adapters/go.mjs`), the stack profile (`stack-profiles/index.mjs`), and — critically — a post-filter inside `generate-code-map.mjs`'s `collectSymbols`:

```js
// The ast-grep scan walks roots itself and bypasses sourceFilesInRoots,
// so excluded Go files must be dropped here or their symbols re-enter
// the index and the endpoint file union.
if (isExcludedGoFile(file)) {
  continue;
}
```

This is the trap that is easy to miss: the ast-grep symbol scan walks scan roots itself, so file-walk filters in `scripts/code-map/lib/source-files.mjs` never see those files at all. Without this post-filter, vendored/generated files leak into the symbol index and then re-enter the endpoint file union downstream. If you skip this step for a new language, expect silent leakage, not an error.

**4. Adapter conforms to `StackGraphAdapter`** (`matches()` / `extract()`) and registers **last**:

```js
// Go is appended after the original three so polyglot repos keep their
// current adapter selection.
const ADAPTERS = [csharpAdapter, pythonAdapter, typescriptAdapter, goAdapter];
```

`matches()` does a bounded BFS for markers (go.mod/go.work + `.go` files) honoring skip dirs, so fixture repos elsewhere in the test tree never false-positive-match. `extract()` normalizes candidates, resolves imports statically via `go.mod`/`go.work` (no Go toolchain invoked), gets symbols via `runBatchedScan(..., ['--config', SG_CONFIG_PATH, ...])` — reusing the same rules from step 2 rather than writing adapter-local symbol logic — produces deterministic sorted edges/files, and never throws: on any failure it logs a warning and returns `{ files: [], edges: [] }`.

**5. Stack-profile fallback needs its own attention, not an afterthought.** It is package-level (not the old `cmd/*` heuristic), extends `BASE_SKIP_DIRS` rather than building a fresh skip set, and derives module ids from path when basenames collide (`internal/util` vs `pkg/util` would otherwise clobber each other's module docs):

```js
const id = taken.has(base) ? rel.replace(/\//g, '-') : base;
```

Stack profiles are pre-empted by cohesion detection in normal e2e runs, so end-to-end tests never actually exercise this fallback path — it needs direct unit tests or it ships untested.

**6. Endpoints are an extension-dispatch branch** in `scripts/lib/endpoint-extractor.mjs` (`if (ext === '.go') return extractGoEndpoints(file, text);`), with per-framework regexes gated on imports for precision — chi's `.Get(` collides with ordinary getters (`store.Get("/tmp/x")`), so it's only trusted when `github.com/go-chi/chi` is imported and the literal starts with `/`. Confidence is honest, not optimistic: file-scoped `Group()` prefix resolution degrades to sub-path with `confidence: 'medium'` whenever the prefix can't be resolved in this file (cross-file group params, rebound variables) — silently guessing would fabricate wrong paths at high confidence, which is worse than a lower-confidence correct one.

**7. Tests mirror the existing per-language parity suite (`python.test.mjs`) with six tests, plus a fixture repo full of decoys**, not just happy-path files: a vendored file, a generated (`.pb.go`) file, a `_test.go` file, a nested module (own `go.mod` under `tools/`), colliding package basenames (`internal/util` vs `pkg/util`), and a `go.mod`-only directory under the test fixtures tree (to prove `matches()` doesn't false-positive on sibling fixtures). The six tests: matches/selectAdapter, exact edge weights, excluded files really excluded, symbols with kinds + 1-based lines, byte-stability, and `deriveModules`/`buildPlanProductModel` integration. Add direct tests for the profile and shared parsers (not reachable via e2e — see step 5), and configure e2e fixtures with cohesion thresholds (`minFiles`/`maxFiles`) set low, since tiny fixture repos fall below the default `minFiles` and silently fall back to coarse directory modules if left at defaults.

## Why This Matters

Every trap here is invisible until something actually exercises it:

- The symbol-scan bypass (step 3) only shows up as leaked vendored endpoints in generated output — no test failure, no exception, just wrong data quietly present downstream.
- Skipping step 1's "check first" step produces exactly what happened here: the exclusion predicate got duplicated in three places within one PR before it was consolidated into `go-mod.mjs`.
- Adversarial review of the group-prefix resolution (step 6) probe-verified three cases where naive first-binding-wins logic would have reported a fabricated path at `confidence: 'high'` — a correctness bug that's strictly worse than reporting a weaker but honest `medium`-confidence sub-path.
- Stack-profile bugs (step 5) are the kind that only surface on a genuinely tiny or oddly-shaped repo, because cohesion detection masks the fallback path in every other configuration.

Following the recipe in order avoids re-discovering these the hard way on the next language.

## When to Apply

- Adding support for a new language in `scripts/module-map/lib/adapters/`.
- Adding new ast-grep symbol rules under `scripts/code-map/rules/` for a language that doesn't yet have adapter/profile support.
- Adding a new framework's endpoint regex to an existing language branch in `endpoint-extractor.mjs`.
- Reviewing a PR that claims to "add a language" — check it hit all seven touchpoints, especially the shared exclusion predicate (step 3) and direct profile tests (step 5), since both are easy to silently skip.

## Examples

Reference implementation for the whole recipe, in file order:

- `scripts/lib/go-mod.mjs` — shared parsing + the single exclusion predicate.
- `scripts/code-map/rules/map-go-method.yml` (and sibling `map-go-*.yml` rules) — kind-based symbol rules.
- `scripts/code-map/generate-code-map.mjs` (`collectSymbols`) — the required post-filter.
- `scripts/module-map/lib/adapters/go.mjs` — the adapter.
- `scripts/module-map/lib/adapters/index.mjs` — registration order.
- `scripts/module-map/lib/stack-profiles/index.mjs` (`goProfile`) — the fallback.
- `scripts/lib/endpoint-extractor.mjs` (`extractGoEndpoints`, `collectGoGroupPrefixes`) — extension dispatch + honest confidence.
- `test/module-map-adapters/go.test.mjs` + `test/module-map-adapters/fixtures/go-repo/` — the six-test parity shape and decoy fixture layout to copy for the next language.

## Related

- `docs/plans/R-006-2026.07.31-go-code-map-support.md` — the implementation plan with the decision rationale (adapter-first discovery, replace-not-augment rules, hygiene placement, static go.mod/go.work resolution).
- `docs/features/f-204/feature.md` — the F-204 feature guide with scope boundaries (gRPC, build tags, and pattern-library detectors deferred).
- `docs/features/f-204/uc-001-map-a-go-repository.md`, `docs/features/f-204/uc-002-verify-go-endpoint-detection.md` — the end-to-end and verification workflows, including the present-with-wrong-path triage for medium-confidence grouped routes.
