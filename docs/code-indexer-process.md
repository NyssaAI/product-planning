# code-indexer — process (editable draft)

A simple view of the commands and what each run does. Edit freely; this is the working sketch
the plan will be written against.

## Commands

| Command                     | What it does                                                                                            |
|-----------------------------|---------------------------------------------------------------------------------------------------------|
| `/code-indexer init`        | One-time setup: scaffold the product docs, write `code-indexer.config.json`, create `docs/code-index/`. |
| `/code-indexer doctor`      | Check readiness (docs, ast-grep, state) and report how deep the index is so far. |
| `/code-indexer [--depth=N]` | The main loop: build / deepen / refresh the index.  default to 3 levels|
| `/code-indexer arch`        | Uses the code map to build a system-architecture.md document with a system overview and component-diagram at the same level as the intex. |
| `/code-indexer patterns`    | Uses the code map to identify common code patterns in use and calculate the % of the code base using formal patterns |

## The main loop

```
/code-indexer [--depth=N]
│
├─ Layer A — engine  (deterministic · Node + ast-grep)
│   ├─ rebuild the raw symbol index  (code-map.json)
│   └─ for each module:
│       ├─ changed?            → refresh it
│       ├─ not deep enough?    → deepen one tier   (or jump to --depth=N)
│       └─ already deep enough → skip (file untouched)
│   └─ write only touched files + module-map.json + index.md + update state
│
├─ Layer B — prose  (agent · only when run via /code-indexer, not a bare node call)
│   └─ for modules that just got deep enough OR changed:
│       └─ agent writes/updates the prose summary inside the module file
│       (budget-bounded per run; re-runs prose only when the structure changed)
│
└─ commit the index  (files + state, so depth compounds and is shared)
```

## /code-indexer arch

Builds a system-architecture document from the code map + module graph, alongside the index.

```
/code-indexer arch
├─ Layer A — engine   → render a component diagram (mermaid) from module-map.json edges
├─ Layer B — agent    → write the system-overview prose from the module/code detail
└─ write docs/code-index/system-architecture.md   (sits at the same level as index.md)
```

## /code-indexer patterns

Scans for formal/structural code patterns and reports how much of the codebase uses them.

```
/code-indexer patterns
├─ Layer A — engine   → match the pattern catalog (ast-grep rules) across the code map
│                       count occurrences + compute % coverage per pattern
└─ write docs/code-index/patterns.md   (named patterns · counts · % coverage)
```

**Catalog = plugin seed + repo extensions:**

- The plugin ships a small per-language seed of high-confidence **structural** patterns
  (e.g. Result/Either returns, interface implementations, decorators/attributes, singletons)
  as ast-grep rules under `scripts/patterns/rules/<lang>/` — mirroring the existing
  `scripts/code-map/rules/` convention.
- A repo adds its own named rules via `code-indexer.config.json` — its conventions *are* its formal patterns.

**Honest limit:** ast-grep matches **structure, not intent**, so the catalog covers structurally
unambiguous idioms — not semantic design patterns like "Repository" (not reliably detectable by
shape). The % is exact for what's catalogued; it is not a claim about every named pattern.

**To define:** what the % is taken over (functions? classes? all symbols?), and the seed catalog contents.

## What one run does (in a sentence)

Each run **refreshes** changed modules, **deepens** unchanged ones by one tier (or to `--depth=N`),
and **skips** anything already at target — then the agent adds/updates prose for what changed.

## Depth tiers (fill in / adjust)

1. **Baseline** — module boundaries, dependsOn/usedBy, key public symbols, routes, test roots.
2. **Full structural** — full signatures, doc-comments, intra-module call/reference edges, key data structures.
3. **Prose** — agent-authored architecture summary (Layer B).

## Outputs — directory tree

After a run, the index lives under `docs/code-index/`:

```
docs/code-index/
├─ code-map.json             raw symbol + endpoint index   (full regen each run)
├─ module-map.json           module dependency graph        (depth-aware)
├─ index.md                  guide — lists modules + each module's current depth
├─ system-architecture.md    from `arch`: system overview + component diagram
├─ patterns.md               from `patterns`: named patterns · counts · % coverage
├─ state.json                per-module depth + change fingerprint (drives refresh/deepen/skip)
└─ modules/
   ├─ <module-a>.md          per-module detail: structural tiers + prose section
   ├─ <module-b>.md
   └─ …
```

Embedded outside `docs/code-index/`:

- `AGENTS.md` / `CLAUDE.md` — the module-map table is embedded between markers (the compound-engineering integration seam).

## Notes / open edits

- (your notes here)
```
