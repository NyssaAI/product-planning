---
title: "feat: code-indexer patterns command"
date: 2026-06-29
type: feat
depth: standard
status: ready
---

# feat: code-indexer `patterns` command

## Summary

Add a `/code-indexer patterns` command that scans a repo for **structurally-detectable code
patterns** and writes a report of named patterns, occurrence counts, and percent-of-codebase
coverage. It runs ast-grep pattern rules from a **plugin seed catalog plus repo-defined
extensions** (the decided ownership model), attributes matches to modules via the existing code
map, and emits `docs/code-index/patterns.md` (+ a machine-readable `patterns.json`).

This is self-contained: it reads the existing code-map output and source, and does not depend on
the incremental/depth-tier index work. It is a new engine (`scripts/patterns/`) mirroring the
existing `scripts/code-map/` rule-driven design.

---

## Problem Frame

The process sketch (`docs/code-indexer-process.md`) adds a `patterns` command: "identify common
code patterns in use and calculate the % of the codebase using formal patterns." The honest
boundary: ast-grep matches **structure and naming, not raw intent** — but empirical testing (see
Sources) showed naming conventions and structural aggregation detect many "semantic" patterns with
useful precision. So the deliverable is *tiered-confidence coverage of a defined catalog*, not
detection of every design pattern by intent.

The catalog's names and descriptions are seeded from the **jamaynor standards** (in dev-tools git
history under `standards/` — `design-patterns.md`, `error-handling.md`, `ddd.md`,
`domain-services.md`, `event-sourcing.md`, `dotnet/marten-event-store.md`, `postgres/*`, `python/*`).
Those describe patterns in prose; this work translates the **structurally-detectable subset** into
ast-grep rules.

---

## Key Technical Decisions

**KTD-1 — Tiered detection (confidence spectrum), not a binary counted/not-counted split.**
*(Revised after empirical testing against a 444-file production .NET repo — see Sources.)* Many
"semantic" patterns ARE AST-detectable via two mechanisms: **naming conventions** (e.g. Repository
matched 14 classes ↔ 14 `I*Repository` interfaces, 1:1 — a high-precision signature) and
**structural aggregation** (e.g. Strategy = an interface with ≥2 implementers, found 4 with zero
naming reliance). Each catalogued pattern carries a **detection method** (naming / structural-shape /
aggregation) and a **confidence tier**:
- **High** — naming+interface convention or a tuned return-type/attribute rule (Repository, Result,
  Service, Handler). Drives the headline %.
- **Medium** — structural shape that implies but doesn't prove intent (Strategy via interface-impl
  count; Factory/Registry via name where conventions are partial). Counted, flagged as heuristic.
- **Intent-only (documented, not counted)** — patterns with no reliable naming or structural
  signature in this codebase. This residual is **smaller** than first assumed.

The report shows each pattern's count, confidence, and method, so the % is honest about precision.

**KTD-2 — Catalog = plugin seed + repo extensions.** Seed rules ship under
`scripts/patterns/rules/<lang>/*.yml` (mirroring `scripts/code-map/rules/`). A repo adds its own
named rules via `code-indexer.config.json` → `patterns` (paths/globs to rule files, or inline
rules). Repo rules merge with the seed; a repo rule with the same id overrides the seed.

**KTD-3 — Match via a dedicated ast-grep pass; attribute via the code map.** Pattern matching needs
full AST, which `code-map.json` does not carry — so the engine runs its own ast-grep pass with the
catalog rules over the configured source roots (reusing `scripts/lib/resolve-ast-grep.mjs` and the
scan infra). It then uses `code-map.json` (symbols + module ownership) to attribute each match to a
module and to compute denominators. "Uses the code map" = attribution + denominator, not the match
itself.

**KTD-4 — Coverage denominator: matched symbols over total symbols.** Headline % = (distinct
top-level symbols — classes + functions — that match ≥1 counted pattern) ÷ (total top-level symbols
in the code map). Plus per-pattern occurrence counts and per-module breakdown. The denominator is a
config-documented choice (Open Questions records the alternative of file-based or LOC-based).

**KTD-5 — Seed language: C#/.NET first.** The repo's own stack and fixtures are .NET, and the
richest standards (Marten event-sourcing, domain-services, error-handling Result types) are .NET.
Seed the C# rules first; the format and loader are language-general so TypeScript/Python/SQL seed
rules can follow without engine changes.

**KTD-6 — Built on the renamed substrate.** Targets post-rename paths (`scripts/`, the unified
`code-indexer.config.json`, `docs/code-index/`). Depends on plan 002 landing first (Dependencies).

**KTD-7 — Rules are kind-based + relational, not pattern strings.** *(Empirical finding.)* Naive
pattern-string rules (`class $N { $$$ }`) matched **zero** classes in the real repo because it uses
C# 12 primary constructors (`class Foo(deps) : IBar`). Robust rules use tree-sitter node **kinds**
(`class_declaration`, `interface_declaration`, `method_declaration`, `base_list`) with relational
(`has`, `inside`) and `regex` field constraints. This survives syntax-version variation.

**KTD-8 — Precision is tuned against a real corpus, not assumed.** *(Empirical finding.)* A naive
`returns ~ "Result"` rule counted 446 methods; ~6 were ASP.NET `IResult` noise and the tuned domain
count was ~292 — naive over-counts ~50%. Every counted rule ships with negative constraints and is
**calibrated against `nyssa-mesh-server`** (a 444-file production .NET codebase available as a
sibling repo) before it enters the seed. Calibration is a build step (U2), not a runtime cost.

---

## Output Structure

```text
scripts/patterns/
├─ generate-patterns.mjs        # entry: load catalog → match → attribute → render
├─ lib/
│  ├─ catalog.mjs               # load+merge seed + repo rules; validate
│  ├─ match.mjs                 # run ast-grep rules over source roots, collect hits
│  ├─ coverage.mjs              # attribute hits to modules; compute counts + %
│  └─ render-patterns.mjs       # patterns.md + patterns.json
└─ rules/
   └─ csharp/                   # seed rules (one file per pattern, ast-grep YAML + metadata)
      ├─ result-return.yml
      ├─ constructor-di.yml
      ├─ builder-chain.yml
      ├─ single-method-interface.yml
      └─ marten-aggregate.yml

docs/code-index/
├─ patterns.md                  # named patterns · counts · % coverage · per-module · "documented not counted"
└─ patterns.json                # machine-readable: per-pattern {count, symbols, modules}, totals, coverage
```

---

## Implementation Units

### U1. Catalog format and loader

**Goal:** Define the pattern-rule format and a loader that merges the plugin seed with repo
extensions.

**Dependencies:** none (rename substrate assumed).

**Files:** `scripts/patterns/lib/catalog.mjs`; `test/patterns/catalog.test.mjs`.

**Approach:** Each rule = a **kind-based** ast-grep rule (KTD-7) plus metadata: `id`, `name`,
`description`, `language`, `method` (`naming` | `structural` | `aggregate`), `confidence`
(`high` | `medium` | `intent-only`), `detector` (`match` for single-node counts | `aggregate` for
interface-impl-style counts computed in U3), and `reason` (required when `confidence: intent-only`).
Loader reads seed rules from `scripts/patterns/rules/<lang>/` and repo rules from
`code-indexer.config.json` → `patterns`; merges by `id` (repo overrides seed); validates that
non-`intent-only` rules carry a kind-based ast-grep rule, and that `aggregate` detectors name their
grouping target. Mirror `scripts/code-map/lib/code-map-config.mjs` conventions.

**Test scenarios:**
- Seed-only load returns the bundled C# rules with metadata intact.
- A repo rule with a new id is appended; a repo rule reusing a seed id overrides it.
- A `counted: true` rule missing an ast-grep pattern is rejected with a clear error; a
  `counted: false` rule without a pattern is accepted (documentation-only).
- Unknown-language rules are loaded but flagged when no source of that language exists.

**Verification:** loader returns a merged, validated catalog; invalid rules fail loudly.

---

### U2. Seed catalog — C#/.NET structural patterns

**Goal:** Author the initial seed rules for the structurally-detectable patterns, named and
described from the jamaynor standards.

**Dependencies:** U1.

**Files:** `scripts/patterns/rules/csharp/*.yml`.

**Approach:** Author **kind-based / relational** rules (KTD-7), each tagged with confidence + method
(KTD-1). The empirically-validated seed set:
- **High (naming + interface):** Repository (`class` named `*Repository` ↔ `interface` `I*Repository`),
  Service (`*Service`), Handler (`*Handler`).
- **High (tuned return type):** Result/error-handling — `method_declaration` returning `Result<…>`,
  excluding ASP.NET `IResult` and tuned to include `Task<Result<…>>` (KTD-8).
- **Medium (structural aggregation):** Strategy — an `interface_declaration` with ≥2 classes naming
  it in their `base_list` (an *aggregate* detector, computed in U3, not a single-node match).
- **Medium (naming, partial recall):** Factory (`*Factory`), Registry (`*Registry` OR a class with a
  `Dictionary`/`ConcurrentDictionary` field plus register/get methods).
- **Structural:** constructor dependency injection (primary-constructor or ctor params stored in
  `readonly` interface-typed fields), Marten aggregate shape (`dotnet/marten-event-store.md`),
  God-Object size-heuristic anti-pattern.
- **Intent-only (documented, not counted):** Adapter, and any pattern lacking a naming or structural
  signature in the target repo — listed with a one-line reason.

Names/descriptions are drawn from the jamaynor standards so the report uses the team's vocabulary.

**Calibration (KTD-8):** before a counted rule enters the seed, run it against `nyssa-mesh-server`
and confirm the count is sane and precision is acceptable (spot-check matches; add negative
constraints until noise is low). Record each rule's calibrated count as its baseline.

**Test scenarios:**
- Each counted rule matches a positive fixture and rejects a near-miss negative (Result rule matches
  `Result<T>` and `Task<Result<T>>`, rejects `IResult` and bare `T`).
- The Repository rule produces a 1:1-ish class↔interface count on a convention-following fixture.
- The Strategy aggregate detector flags an interface with 2 implementers and ignores one with a
  single implementer.
- Intent-only entries carry a name + reason and produce zero counts.

**Verification:** catalog run over `test/ai-plan-adapters/fixtures/csharp-repo/` yields sane counts;
calibration counts against `nyssa-mesh-server` are recorded and reproducible.

---

### U3. Match and coverage engine

**Goal:** Run the catalog over source, attribute hits to modules, compute counts and coverage.

**Dependencies:** U1, U2.

**Files:** `scripts/patterns/lib/match.mjs`, `scripts/patterns/lib/coverage.mjs`;
`test/patterns/coverage.test.mjs`.

**Approach:** `match.mjs` runs ast-grep with the rules over the configured source roots (reuse
`scripts/lib/resolve-ast-grep.mjs` + skip-dirs), returning hits with `file:line`, rule id, and the
matched node text. `coverage.mjs` loads `code-map.json`, maps each hit to its owning module and
symbol, dedups symbols matching the same pattern, and computes per-pattern occurrence count,
distinct matched symbols, per-module breakdown, and the headline coverage % over **high-confidence
counted** patterns (KTD-4). **Aggregate detectors** (e.g. Strategy) are computed here, not by a
single match: group hits by their target (e.g. interface name referenced in `base_list`) and count
groups meeting the threshold (≥2 implementers). Medium-confidence and intent-only patterns are
carried in the result but excluded from the headline %. Emit a structured result object.

**Test scenarios:**
- A symbol matching two patterns counts once toward the coverage numerator, twice in per-pattern
  counts.
- Hits in skipped dirs (`fixtures/`, `node_modules/`) are excluded.
- Coverage % = matched ÷ total symbols from the code map; empty code map → 0% with no divide error.
- A hit in a file owned by module M is attributed to M; an unowned file is counted in totals but
  attributed to "(unowned)".

**Verification:** coverage numbers reconcile (sum of per-module matched symbols = total matched).

---

### U4. Report renderer

**Goal:** Render `patterns.md` and `patterns.json` from the coverage result.

**Dependencies:** U3.

**Files:** `scripts/patterns/lib/render-patterns.mjs`; `test/patterns/render.test.mjs`.

**Approach:** `patterns.json` = the structured result (per-pattern count/symbols/modules, totals,
coverage). `patterns.md` = a readable report: headline coverage %, a counted-patterns table (name ·
count · % of symbols), a per-module breakdown, and a "Documented but not counted" section listing
the semantic patterns with their reasons (KTD-1). Write both under `docs/code-index/`.

**Test scenarios:**
- Report lists every counted pattern with its count and a total coverage line.
- The "documented but not counted" section appears with each semantic pattern + reason.
- `patterns.json` round-trips the coverage object; `patterns.md` headline matches the json coverage.

**Verification:** both files write under `docs/code-index/`; numbers agree between them.

---

### U5. Command wiring

**Goal:** Expose `/code-indexer patterns` and the engine entry point; surface it in the skill and doctor.

**Dependencies:** U1–U4.

**Files:** `scripts/patterns/generate-patterns.mjs`; `commands/code-indexer.md` (the `patterns`
arg branch); `skills/using-code-indexer/SKILL.md`; `scripts/module-map/lib/doctor.mjs` (note
`patterns.md` presence/age).

**Approach:** `generate-patterns.mjs` orchestrates load → match → coverage → render. The
`code-indexer` command branches on the `patterns` arg to invoke it. The skill documents the
command, the structural-only limit, and how a repo extends the catalog via config.

**Test scenarios:**
- `node scripts/patterns/generate-patterns.mjs` on this repo produces `docs/code-index/patterns.md`
  and `patterns.json` with the seed C# patterns counted over the fixtures.
- The command branch routes `patterns` to the engine and bare invocation to the main loop (unchanged).

**Verification:** the command produces a coherent report end-to-end.

---

### U6. Tests and end-to-end verification

**Goal:** Lock behavior with the retained `node --test` suite and a real run.

**Dependencies:** U1–U5.

**Files:** `test/patterns/*.test.mjs` (created in U1–U4); this unit runs the full set + a live run.

**Approach:** Run the patterns suite; run the engine on the repo; eyeball `patterns.md` for sane
counts and an honest "not counted" section.

**Test scenarios:**
- Full `test/patterns/` suite passes alongside the existing `test/ai-plan*` / `test/code-map/` suites.
- Live run coverage % is in a believable range (not 0%, not 100%) for the fixtures.

**Verification:** suite green; report believable.

---

## System-Wide Impact

- **New engine, additive.** No change to the code-map or module-map generators; `patterns` is a new
  command reading their output. CE dovetail unaffected (writes only under `docs/code-index/`).
- **Catalog maintenance.** The seed rules become plugin-maintained content (like `code-map/rules/`);
  per-language expansion is future work.

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| % is misread as "design-pattern adherence" when it measures catalogued rules only | **High** | KTD-1 tiered confidence + per-pattern method/confidence in the report make the boundary explicit in the output |
| ast-grep rules over-match (false positives inflate %) — **proven ~50% on naive `Result`** | **High** | KTD-8 corpus calibration against `nyssa-mesh-server`; negative constraints per rule; tuned before seeding |
| Naming-convention detection has recall gaps (e.g. `ActorRegistry*` missed by `*Registry` suffix) | Medium | Pair naming rules with structural detectors where possible; confidence tier flags naming-only rules; repos extend with their own naming |
| Structural shape ≠ intent (Strategy "≥2 implementers" also catches plain polymorphism) | Medium | Tag as Medium confidence, exclude from headline %, label "structural shape" in report |
| Pattern-string rules break on C# syntax variants (primary constructors) — **proven (0 matches)** | Confirmed | KTD-7 mandates kind-based + relational rules; covered by U2 calibration |
| Coverage denominator disputed (symbols vs files vs LOC) | Medium | KTD-4 picks symbols, documents it; config knob; Open Questions records alternatives |
| `dev-standards` is actually a separate repo with different/more rules | Medium | Source = jamaynor standards (git history); a real `dev-standards` repo only changes U2's authoring source, not structure |

---

## Dependencies & Assumptions

- **Depends on** the code-indexer rename (plan 002) for paths/config/output names. If built before
  the rename, map paths to the current names and rename with 002.
- **Assumes** the catalog source is the jamaynor standards now in dev-tools git history under
  `standards/` (the `dev-standards` directory was not found on this machine).
- **Assumes** `code-map.json` provides symbol + module-ownership data for attribution and denominators.
- **Reuses** `scripts/lib/resolve-ast-grep.mjs` and skip-dirs for the ast-grep pass.

---

## Open Questions

- **OQ1 — Coverage denominator.** Symbols (chosen) vs files vs LOC. Symbols is the default; confirm
  or switch in config.
- **OQ2 — Seed catalog breadth.** Which counted patterns ship in the C# seed for v1, and how many
  before the report is useful. U2 proposes ~6; adjust.
- **OQ3 — Repo rule format.** Inline ast-grep in `code-indexer.config.json` vs paths to rule files
  vs both. Default: paths/globs to rule files, with inline allowed.
- **OQ4 — Restore/relocate standards?** Whether to re-bundle the standards prose (or a derived
  `PATTERNS.md` catalog doc) somewhere discoverable, vs keeping them only as the rule-authoring
  source from git history.

---

## Sources & Research

- **Empirical detection test (this session)** — ran ast-grep 0.42.3 against `nyssa-mesh-server`
  (444 C# files, a production .NET repo; sibling of dev-tools). Findings that reshaped KTD-1/7/8 and U2:
  - 237 classes, 42 interfaces (kind-based rules work; pattern-string `class $N {}` matched **0** —
    C# 12 primary constructors → KTD-7).
  - Repository: **14 classes ↔ 14 `I*Repository` interfaces** (1:1, high-precision naming signature).
  - Strategy: **4 interfaces with ≥2 implementers** via `base_list` aggregation, no naming needed.
  - Service 47, Handler 2, Factory 2 by naming; Registry 0 by `*Registry` suffix (recall gap — names
    like `ActorRegistry*` use the term as a prefix).
  - Result returns: naive regex 446 → ~6 ASP.NET `IResult` noise, ~292 tuned domain count (**~50%
    over-count** without constraints → KTD-8).
- `docs/code-indexer-process.md` — the command sketch and the Layer A/B + catalog-ownership decisions.
- jamaynor `standards/` (dev-tools git history, pre-`75aeb77`) — `design-patterns.md` (Factory,
  Strategy, Registry, Builder, Adapter, Result, anti-patterns), `error-handling.md` (Result/Either),
  `ddd.md`, `domain-services.md`, `event-sourcing.md`, `dotnet/marten-event-store.md` — the catalog
  naming/description source.
- `scripts/code-map/rules/` — the existing ast-grep-rules-as-YAML convention the seed catalog mirrors.
- `scripts/lib/resolve-ast-grep.mjs` — the ast-grep resolution reused by the match pass.
- `dev-standards` sibling directory — **not found** on this machine (searched workspace + user
  folder); source defaulted to the jamaynor standards above.
