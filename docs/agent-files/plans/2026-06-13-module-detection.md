# Implementation Plan — Language-Agnostic Module Detection

**Spec:** `docs/agent-files/specs/2026-06-13-module-detection-design.md`
**Branch:** `feature/module-detection` (base: `main` @ 332b29c)
**PR target:** `main`
**Planning area:** `scripts/ai-plan/` + `scripts/code-map/`

Implements #3/#4/#5 as one capability: per-language graph adapter → shared detection core (directory-anchored, coupling/cohesion-scored) → pin/eject overrides → C# adapter (symbols + file-level edges). Standards: `Result`-style returns, structured `createLogger` logging, behavior-focused tests, generated vs. authored separation.

Each phase ends green (existing `ai-plan`/`code-map` runs still succeed) and is independently committable.

---

## Phase 1 — Detection core (language-agnostic)

- [ ] **1.1 Types/interface** — `scripts/ai-plan/lib/detection/types.mjs`: JSDoc typedefs for `StackGraphAdapter` (`id`, `matches(repoRoot)`, `extract(repoRoot, files) -> FileGraph`), `FileGraph` (`files[]` with `symbols`, `edges[]` `{from,to,weight}`), `Module`, `Pin`.
- [ ] **1.2 Metrics** — `scripts/ai-plan/lib/detection/metrics.mjs`: pure functions `internalExternalRatio(partition, edges)`, `modularity(partition, edges)`, `cohesion(module, edges)`, `coupling(a, b, edges)`. No I/O. Deterministic.
- [ ] **1.3 Depth enumeration** — `scripts/ai-plan/lib/detection/partitions.mjs`: given a directory tree + claimed (pinned) subtrees removed, enumerate candidate partitions = "cut at depth N" per top-level area; exclude `bin/obj/.git/node_modules/Properties/dist/build`.
- [ ] **1.4 deriveModules** — `scripts/ai-plan/lib/detection/derive-modules.mjs`: `deriveModules(repoRoot, fileGraph, dirTree, pins, config) -> Result<Module[]>`. Apply pins → enumerate (1.3) → score (1.2) → constrain by `[minFiles,maxFiles]` → pick max, tie-break shallower-then-lexical → emit advisory merge/split flags. Sparse-graph fallback to directory heuristic; log fallback.
- [ ] **1.5 Unit tests** — `test/ai-plan-detection/` (or repo test convention): metrics on hand-checked graphs; `deriveModules` on fixture graphs with known-good partitions; **determinism** (two runs byte-identical); fallback path.

## Phase 2 — Pin & eject overrides

- [ ] **2.1 Config schema** — `scripts/ai-plan/lib/config.mjs`: accept `modules.pinned[]` (`root`, `id?`, `name?`, `description?`, `capabilities?`, `doesNotOwn?`, `exclude?`). Validate; malformed pin → `Result` failure, skip that pin, log.
- [ ] **2.2 Pin merge** — wire pins into `deriveModules` (claim subtrees) and `build.mjs` (pinned fields/boundaries win over derived; extends existing manual-merge).
- [ ] **2.3 `--pin`/`--unpin` CLI** — `scripts/ai-plan/generate.mjs`: `--pin <id>` materializes the current derived module's definition into `ai-plan.config.json` `modules.pinned[]`; `--unpin <id>` removes it. Idempotent; preserves existing config formatting.
- [ ] **2.4 Behavior test** — pin a module → regenerate → pinned boundary/fields preserved, unclaimed remainder re-derived; `--pin`/`--unpin` round-trip.

## Phase 3 — C# adapter (#4 symbols, #5 edges)

- [ ] **3.1 Symbol coverage (#4)** — extend `scripts/code-map/rules/` with member rules (`map-csharp-public-method.yml`, `map-csharp-public-property.yml`) and broaden existing type rules (handle `sealed/static/abstract`, generics). Update `scripts/code-map/lib/signature-extractor.mjs` as needed. Assert coverage jump on the fixture.
- [ ] **3.2 Edge resolution (#5)** — `scripts/ai-plan/lib/adapters/csharp.mjs`: build a type→file index (namespace + type name per file), then per file resolve `using` directives + referenced type identifiers to declaring file(s) → weighted `file→file` edges; add `.csproj` `ProjectReference` as coarse cross-project edges. Returns `FileGraph` (symbols from code-map + edges).
- [ ] **3.3 Adapter registry** — `scripts/ai-plan/lib/adapters/index.mjs`: register adapters, select by `matches()`; `config.modules.discover` can force one.
- [ ] **3.4 C# fixture tests** — `.NET`-shaped fixture (one multi-feature project + mirrored Domain/Infra): assert non-empty edges, symbol count well above baseline, and feature-level module set from `deriveModules`.

## Phase 4 — Integration

- [ ] **4.1 Wire discovery** — `scripts/ai-plan/lib/discover-modules.mjs`: `discover: auto` (or unset) runs adapter→`extract`→`deriveModules`; `manual`/`pinned` still take precedence. Keep `stack-profiles` project-level detection as the degraded path.
- [ ] **4.2 End-to-end** — run `ai-plan` on the C# fixture and on this repo; confirm renderers (`render.mjs`/`embed.mjs`) project the new module set unchanged; byte-stable across two runs.

## Phase 5 — Docs

- [ ] **5.1** Update `skills/using-ai-plan/SKILL.md` and `scripts/ai-plan/README.md`: new `auto` discover mode, pin/eject workflow, that module files are read-only projections.
- [ ] **5.2** CHANGELOG entry.

## Verification (per phase and final)

- `Result`-style returns; no thrown exceptions for expected failures; structured logging on adapter-select and fallback.
- All existing `ai-plan`/`code-map` invocations still succeed.
- Determinism: two consecutive regenerations byte-identical with no source change.
- Acceptance criteria in the spec all satisfied.
