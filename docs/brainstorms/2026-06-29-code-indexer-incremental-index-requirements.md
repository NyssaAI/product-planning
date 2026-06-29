---
title: "code-indexer: incremental, depth-tiered code index"
date: 2026-06-29
type: requirements
status: ready-for-planning
---

# code-indexer: incremental, depth-tiered code index

## Problem Frame

code-indexer (the renamed dev-tools plugin) generates a code index for AI agents — a symbol/endpoint
map, a module graph, and per-module architecture files consumed via L0–L3 progressive disclosure.
Today every run **fully regenerates** all of it: it is a stateless snapshot. Two costs follow.
First, depth is all-or-nothing — a large repo either pays to generate full detail for every module
on every run, or gets none. Second, the snapshot goes stale the moment code changes, and the only
remedy is to regenerate everything from scratch.

This brainstorm reshapes the product from a **one-shot snapshot generator** into an
**incrementally-built, incrementally-maintained code index**: detail accrues in depth tiers over
successive runs, and each run refreshes only what changed instead of rebuilding the world.

---

## Actors

- **A1 — Planning agent** *(primary)*. An AI agent (across Claude Code, Cursor, Codex, OpenCode,
  Gemini) that reads the index to plan code changes via L0–L3 disclosure. The consumer the product
  is optimized for.
- **A2 — Maintainer/developer**. Runs `/code-indexer` (or its scripts) to build and advance the
  index, and commits the result. Not a direct *reader* of a dashboard yet (see Scope Boundaries).

---

## Core Outcome

A repo accumulates an index whose detail **deepens over successive runs** and **stays fresh per
module** — so an agent always has the cheapest-useful, non-stale context for the area it's working
in, without anyone paying full-regeneration cost on every run.

---

## Requirements

- **R1 — Depth tiers.** Module/code detail is produced at increasing depth levels: a shallow
  baseline (module boundaries, capabilities, `dependsOn`/`usedBy`, key public symbols, routes, test
  roots), then deeper tiers (full public API with signatures and short per-symbol summaries; then
  intra-module relationships and a prose architecture description). The exact tier contents are a
  planning detail (see Outstanding Questions); the requirement is that depth is *layered*, not
  all-or-nothing.
- **R2 — Configurable target depth per run.** A run targets a depth (via flag/config, e.g.
  `--depth=N`), defaulting to a sensible baseline. A small repo can reach full depth in one run; a
  large repo can cap depth cheaply.
- **R3 — Phased advance by default.** Absent an explicit target, each run advances the index one
  depth phase toward full — so re-running repeatedly deepens the whole index over time.
- **R4 — Stateful index.** The index records, per module, the **depth reached** and a **source
  fingerprint** sufficient to detect change. This state is the basis for R3 and R5.
- **R5 — Incremental refresh.** Each run re-analyzes only the modules whose source changed since
  the last run (detected via R4's fingerprint) and leaves unchanged modules untouched — never a
  full regenerate.
- **R6 — Committed index.** Both the readable artifacts and the depth/fingerprint state are
  committed to the repo, so accrued depth persists and is shared across machines, teammates, and CI
  (see Key Decisions).
- **R7 — Depth-aware disclosure.** The existing L0–L3 disclosure keeps working, and a consuming
  agent can tell how deep a given module currently is (e.g., "this module is at depth 1 so far"), so
  shallow-but-present detail is used correctly rather than mistaken for complete.
- **R8 — Cross-harness parity.** All behavior works invocation-driven across the five harnesses;
  no background daemon and no required hook.
- **R9 — CE dovetail preserved.** The index writes only under its own output directory (no
  collision with compound-engineering's `docs/plans`, `docs/brainstorms`, `docs/solutions`,
  `docs/pulse-reports`, `STRATEGY.md`, `CONCEPTS.md`, `.compound-engineering/`), and the
  `AGENTS.md`/`CLAUDE.md` module-map embed remains the integration seam.
- **R10 — Future-proof data model.** The index data model is kept clean enough that a later
  human-facing architecture-audit view, and a later pattern layer, can be built on the same data
  without a rebuild (see Scope Boundaries).

---

## Key Flows

- **F1 — First index (cold start).** A2 runs `/code-indexer` on a repo with no index. It builds to
  the configured/default target depth, writes artifacts + state, and commits. Modules not yet
  deepened past baseline are marked as such (R7).
- **F2 — Deepen.** A2 re-runs. Unchanged modules below the target advance one depth phase (R3); the
  state records the new depth. Over several runs the whole index reaches full depth.
- **F3 — Refresh on change.** Source changes in some modules. On the next run, only those modules
  are re-analyzed (at their current depth), their fingerprints updated; everything else is left
  intact (R5). Deepening (F2) and refresh (F3) happen in the same run.

---

## Acceptance Examples

- **AE1 — Cheap first run, capped.** On a large repo, `/code-indexer --depth=1` produces baseline
  detail for every module and commits state showing depth=1 everywhere; no deeper detail is
  generated. *(Covers R1, R2, R4)*
- **AE2 — Deepening compounds.** Running `/code-indexer` three times with no source changes leaves
  modules at progressively deeper tiers each run, until full depth; counts/contents of module files
  grow, and state reflects the depth. *(Covers R3, R4)*
- **AE3 — Only changed modules refresh.** With the index fully deepened, editing one module's source
  and re-running re-analyzes only that module (its fingerprint changes); other module files are
  byte-unchanged. *(Covers R5)*
- **AE4 — Shared accrued depth.** A teammate clones the repo and immediately has the committed,
  deepened index — no re-deepen from empty. *(Covers R6)*
- **AE5 — Depth legible to agent.** An agent reading a baseline-only module file can tell it is at
  depth 1 and that deeper detail is not yet available. *(Covers R7)*

---

## Scope Boundaries

### Deferred for later
- **Pattern naming & counting.** Auto-discovering, naming, and counting recurring code patterns is
  **out of this build**, parked as a possible future layer. R10 keeps the data model from precluding
  it. (Cut during this brainstorm: auto-discovery needs a fingerprint+cluster pipeline and stable
  curated identity to make counts comparable over time — real complexity not justified yet.)
- **Human-facing architecture-audit view.** A dashboard/report for developers/architects is deferred
  by the agents-now decision; R10 keeps it buildable later on the same data.

### Outside this product's identity
- **Background daemon / always-on watcher.** The product is invocation-driven (R8). No resident
  process, no required hook, no file-watcher.
- **CI-as-the-mechanism.** CI may *run* `/code-indexer`, but the product's model is the
  manual/invocation cadence; CI is a deployment choice, not part of the product.

---

## Key Decisions

- **KD1 — Agents now, humans later.** Optimize output for agent consumption; design the data model
  so a human-facing view can layer on later (R10).
- **KD2 — Phased/eager, not lazy-on-demand.** Detail is built in depth passes across all modules
  (R3), not deepened only-when-an-agent-asks. Configurable depth (R2) is the control surface.
- **KD3 — Each run advances one phase + refreshes changes.** A single invocation both deepens (R3)
  and refreshes changed modules (R5); no daemon (R8).
- **KD4 — Index + state committed (not gitignored).** Accrued depth is a shared, compounding asset
  (R6). Accepted cost: index files appear in diffs/PRs.
- **KD5 — Built on the code-indexer rename.** This rides on the in-flight rename
  (`docs/plans/2026-06-29-002-refactor-rename-to-code-indexer-plan.md`) as its naming/path substrate
  — the new `docs/code-index/` output, merged config, and `scripts/module-map/` engine.

---

## Dependencies & Assumptions

- **Depends on** the code-indexer rename (KD5). Sequencing — rename first, then build incremental
  generation on the renamed substrate — is a planning decision.
- **Assumes** the current generators' output structure (symbol map, module graph, per-module files)
  as the thing that gains depth tiers and state — verified this session.
- **Assumes** `@ast-grep/cli` remains the structural-extraction engine (unchanged).
- **Assumes** the existing manual-module config workaround (for the stack-profile fixtures
  discovery bug) carries forward; the incremental model does not depend on fixing that bug.

---

## Outstanding Questions (for planning)

- **OQ1 — Depth ladder contents.** Exactly what each depth tier adds (baseline → APIs+signatures →
  intra-module relationships + prose architecture). Proposed 3-tier ladder above is a starting
  point; the precise cut points are a planning decision.
- **OQ2 — Fingerprint granularity.** What "source fingerprint" hashes (per-file content hash rolled
  to module? git tree hash? mtime?) — affects refresh accuracy and cost. Planning-time.
- **OQ3 — Refresh-vs-advance interaction.** When a changed module is below target depth, does the
  refresh re-do it at current depth and *also* advance it a phase in the same run, or refresh-only?
  Default proposal: refresh to current depth, then advance with the rest. Confirm in planning.
- **OQ4 — Targeted deepen (maybe future).** Whether to allow advancing a *specific* module on demand
  (a controlled nod to the rejected lazy model) — deferred unless it proves needed.
- **OQ5 — Backward compatibility.** How an existing full-regen index (pre-state) is migrated into
  the new stateful model on first run after upgrade.

---

## Success Criteria

- A large repo can be indexed at baseline cheaply and deepened incrementally over runs, with each
  run's cost proportional to (changed modules + one depth phase), not the whole repo.
- After a source change, re-running touches only changed modules' artifacts.
- A teammate or CI gets the accrued, deepened index from the commit — no re-deepen from empty.
- Agents consume the index exactly as today (L0–L3), now depth-aware, across all five harnesses,
  with no new CE path collisions.
