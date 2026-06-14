# Language-Agnostic Module Detection — Design

**Date:** 2026-06-13
**Status:** Approved design, pending implementation plan

## Source

Ad-hoc idea from working sessions. Supersedes the current project-level-only module carve and addresses three ai-plan gaps surfaced while using it against a .NET repo:

- **#3** modules are project-level (one per `.csproj`), so L1 planning context is too coarse.
- **#4** C# symbol extraction captures ~10% of public types.
- **#5** the module dependency graph has no edges for .NET.

This spec resolves all three as one capability.

## Module scope

**Primary area:** `scripts/ai-plan/` (module detection, build, render) and `scripts/code-map/` (symbol + edge extraction) in the dev-tools plugin.

**Affected:** the existing `stack-profiles/index.mjs`, `discover-modules.mjs`, `module-deps.mjs`, `build.mjs`, and the C# rule set under `scripts/code-map/rules/`.

## Summary

Replace build-system-shaped module discovery (one module per `.csproj`/workspace) with a general capability: a per-language adapter emits a code graph (symbols + dependency edges); a shared, language-agnostic core derives module boundaries from the directory tree, using coupling/cohesion metrics to choose the right granularity and to flag merge/split candidates. Boundaries default to auto-derivation but can be **pinned** so user adjustments survive regeneration. The C# adapter is the first concrete implementation.

## Goals / Non-goals

**Goals**
- Modules scoped to coherent feature slices, not whole projects.
- A reusable detection core that works for any language given an adapter.
- Coupling/cohesion metrics used to *select granularity* and *validate* boundaries.
- Deterministic, stable output across regenerations.
- User-adjustable boundaries that are not re-derived once pinned.

**Non-goals**
- Automatic source refactoring or moving files.
- Opaque clustering as the primary boundary engine (rejected — see Approaches).
- A backward-compatibility/opt-in layer (decision: default-on, re-derivation of existing repos is acceptable).

## Architecture

```
per-language adapter ──► code graph ──► detection core ──► module set ──► renderers
  (symbols + edges)     (nodes,edges)   (depth + metrics    (+ pin layer)   (existing
                                          + pin merge)                        index/module files)
```

Modules are always **directories** (preserves the single-`root` constraint, yields human-meaningful names, and keeps output stable). The detection core never knows the language; the adapter never decides boundaries.

## Components

### 1. Stack graph adapter (interface)

```
StackGraphAdapter {
  id: string                              // 'csharp', 'typescript', …
  matches(repoRoot): boolean              // detect the stack
  extract(repoRoot, files): FileGraph     // symbols + file-level edges
}

FileGraph = {
  files: { path: string, symbols: Symbol[] }[],
  edges: { from: string /*path*/, to: string /*path*/, weight: number }[]
}
```

Edges are **file→file**, aggregated from type/symbol references. `symbols` feeds the existing code-map; `edges` feed detection. Adapters are selected by `matches()`; manual `discover` config can force one.

### 2. Detection core

```
deriveModules(repoRoot, fileGraph, dirTree, pins, config) -> Module[]
```

Algorithm:
1. **Apply pins.** Remove every directory subtree claimed by a pin from the candidate space (a pinned root and everything under it is authoritative; detection never proposes sub-boundaries inside it).
2. **Enumerate candidates.** For each unclaimed top-level area, generate candidate partitions = "cut the directory tree at depth N" for each feasible N.
3. **Score.** For each candidate partition, compute a cohesion/coupling objective on `fileGraph`: modularity-style `Q = Σ_m (internal_weight_m / total_weight) − (expected)`, equivalently the internal-vs-external edge ratio averaged across modules. Higher = more cohesive, less coupled.
4. **Constrain.** Reject candidates whose modules fall outside `[minFiles, maxFiles]` bounds (config, with defaults). Among the rest, pick the max score.
5. **Deterministic tie-break.** Prefer the shallower partition (fewer, larger modules), then lexicographic by path. No RNG, no time.
6. **Flags (advisory).** Emit notes — a module with low internal cohesion → "consider splitting deeper"; two sibling modules with high cross-coupling → "consider merging" (surfaced as a note; single-`root` can't auto-merge siblings). Flags are reported, never applied automatically.

Final module set = `pinned ∪ derived(unclaimed)`.

### 3. Pin & override layer

The mechanism that lets users adjust boundaries without losing them to re-derivation.

- **Derived modules are defaults** — ephemeral, recomputed every regen.
- A **pin** is an authoritative module declaration keyed by directory `root`, stored in `ai-plan.config.json` under `modules.pinned[]`. A pin may override any field (`id`, `name`, `description`, `capabilities`, `doesNotOwn`) **or** the boundary itself: claim a parent directory as one module (merge), claim child directories (split), or `exclude: true` a directory from being a module.
- On regen, **pinned roots are taken as-is and excluded from re-derivation**; the core derives only the unclaimed remainder.
- Generated module `.md` files are **read-only projections** of the final set. Users never hand-edit them (regen overwrites); all adjustment happens through pins. This formalizes the `preserveModule` flag referenced in `standards/project-structure.md`.

**Creating a pin — `--pin <module-id>` (eject):** materializes the *current derived definition* of `<module-id>` into `modules.pinned[]` with `pinned: true`, so the user can see what detection produced, freeze it, and tweak it. Hand-authored inline pins remain valid (the eject command just bootstraps one). `--unpin <id>` removes a pin and returns the subtree to auto-derivation.

### 4. C# adapter (resolves #4 and #5)

- **Symbols (#4):** expand the ast-grep C# rules under `scripts/code-map/rules/` to capture types **and** members (public methods, properties) — not only top-level public types. Target materially higher coverage than the current ~10%.
- **Edges (#5):** build a file/type-level dependency graph. Index declared types per file (namespace + type name), then for each file resolve `using` directives and referenced type identifiers to the declaring file(s), emitting weighted `file→file` edges. `.csproj` `ProjectReference` edges are added as coarse cross-project links. The within-project (`using`/type) edges are what make feature-level detection inside a single `.csproj` possible.

## Determinism & degradation

- No `Math.random` / `Date.now` anywhere in detection (consistent with the existing workflow-script constraint). Enumerate-and-score with stable ordering and lexical tie-breaks.
- **Sparse-graph fallback:** if `fileGraph` has fewer than a threshold of edges (e.g. an incomplete adapter), skip metric scoring and fall back to a directory-structure heuristic — cut at the shallowest depth whose module count and per-module file counts sit within bounds. The capability still produces feature-ish modules; it just can't validate cohesion. Fallback is logged.

## Integration

- Becomes the default behaviour of `discoverModules` when `config.modules.discover` is `auto` (or unset). `manual` and `pinned` entries still take precedence.
- `build.mjs` continues to merge config-authored fields over derived ones (already its behaviour); pins extend this to boundaries, not just fields.
- Existing renderers (`render.mjs`, `embed.mjs`) are unchanged — they project whatever module set is produced.

## Error handling

Per `error-handling` standard: detection and extraction return `Result`-style outcomes for expected failures (no adapter matched, unreadable file, malformed config pin), never throw for control flow. A failed adapter degrades to the directory-structure fallback rather than aborting the regen. Structured logging via the existing `createLogger`.

## Testing

- **Detection core (unit):** fixture graphs with known-good partitions; assert the chosen depth maximizes the objective and respects size bounds; assert deterministic output across repeated runs.
- **Metrics (unit):** cohesion/coupling/modularity computed on hand-checked small graphs.
- **C# adapter (unit + fixture):** a `.NET`-shaped fixture (multi-feature single project, mirrored Domain/Infra) with an expected module set and symbol counts well above the current baseline.
- **Pins (behavior):** pin a module, regenerate, assert the pinned boundary/fields are preserved and the unclaimed remainder is re-derived; `--pin`/`--unpin` round-trip.
- **Degradation (behavior):** empty/sparse graph falls back to directory heuristics and logs it.

## Rollout

Default-on. Re-deriving existing repos' module sets is acceptable (no opt-in/compat layer). Repos that want specific boundaries frozen use pins.

## Acceptance criteria

- [ ] A `StackGraphAdapter` interface exists; detection core consumes it and is language-agnostic (no C#-specific code in the core).
- [ ] The C# adapter produces a file-level dependency graph with non-empty edges for a single multi-feature `.csproj`.
- [ ] C# symbol coverage is materially higher than the current baseline (types **and** members) on the fixture.
- [ ] On a .NET fixture shaped like nyssa, detection yields feature-level modules (not one-per-project), chosen by the cohesion/coupling objective.
- [ ] Output is byte-stable across two consecutive regenerations with no source change.
- [ ] A pinned module survives regeneration unchanged while unpinned modules are re-derived; `--pin`/`--unpin` work.
- [ ] Sparse/empty graph falls back to directory-structure detection and logs the fallback.
- [ ] Merge/split flags are reported for a fixture with a deliberately mis-sized folder.
- [ ] Detection and extraction use `Result`-style returns and structured logging; no thrown exceptions for expected failures.

## Standards Applied

| Standard | Key constraints for this design |
|----------|----------------------------------|
| project-structure | Generated module files under `docs/agent-plan/context/` are machine-owned/read-only; authored adjustments (pins) live in `ai-plan.config.json`; generated vs. authored separation is explicit |
| error-handling | `Result`-style returns for expected failures (no adapter, unreadable file, bad pin); exceptions only for unrecoverable faults; adapter failure degrades, never aborts |
| logging | Structured logging via existing `createLogger`; fallback and adapter selection are logged |
| testing-principles | Behavior-focused tests over fixtures with known-good module sets; deterministic-output assertions; both success and degradation paths |

## Approaches considered

- **Directory-anchored, metric-scored depth selection (chosen).** Modules = directories; metrics pick depth + flag. Deterministic, stable names, honors single-`root`, degrades gracefully.
- **Graph clustering (Louvain/Leiden), directory-named (rejected).** More cohesion-optimal but clusters cross directories (breaks single-`root`), names get murky, less stable run-to-run.
- **Directory structure only, no graph (rejected as primary).** Simplest but ignores actual coupling and can't flag; retained only as the sparse-graph fallback.
