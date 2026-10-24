---
description: Ingest tech-stack, domain concepts, feature/use-case contracts, and conditional CodeGraph AST symbols to sequence or update the dependency-ordered product delivery roadmap, then validate tie-out with the feature inventory.
argument-hint: "[step or feature to sequence, e.g. R-01.01 or F-01.01]"
---

> [!IMPORTANT] Scope Directive
> Entrypoint command for architecturally grounded roadmap delivery sequencing. Invokes the `plan-product` facade skill and executes its internal `workflows/roadmap.md` runbook.

# plan-roadmap - sequence the work

Load the `plan-product` skill and execute its `workflows/roadmap.md` runbook. The workflow owns architectural context ingestion (`docs/tech-stack.md`, `docs/concepts/c-*.md`, and feature/use-case contracts), conditional CodeGraph AST probing (when `.codegraph/` exists at the repository root), subagent Map-Reduce delegation for large feature sets, stable `R-pp.ss` ID rules, the enriched step schema, entry/exit validation passes, confirmation-gated inventory status updates, and the Compound Engineering (`ce-plan`) handoff; this command file is only the entry point.

Assemble technical stack, domain concept (`C-nn`), feature/use-case (`F-gg.nn` / `UC-gg.nn.uu`) context, and—when `.codegraph/` is present—existing AST symbols and call-graph centrality via `codegraph_explore` / `codegraph explore` (bypassing CodeGraph cleanly with zero warnings or auto-indexing when `.codegraph/` is absent). Interview the user to create or update the roadmap of dependency-ordered delivery steps. Each step is a checkbox statement line (`R-pp.ss`) with target links and `after:` dependencies, followed by structured sub-bullets: `Rationale:`, `Concepts:`, conditional `Anchors:` (included only when CodeGraph is active), `Gotchas:`, and `Verify:` (a concrete user-verifiable checkpoint with demo data, or a `with R-pp.ss` deferral to a nearby checkpoint). Keep steps strictly within the planning boundary (no source code snippets, function definitions, or DDL schemas), validate tie-out against `docs/features.md`, and conclude by recommending `ce-plan` (or `/plan`) targeting the first open `R-pp.ss` step along with any `Anchors:` ready for `codegraph_explore`.

## Invocation Context

Target step / sequence: $ARGUMENTS

## Reads

- `paths.techStack` (`docs/tech-stack.md`) and top-level repository manifests (`package.json`, `go.mod`, etc.) for foundational technical prerequisites
- `paths.concepts` (`docs/concepts/c-*.md`) for domain models, stage progressions, and cross-feature invariants
- `paths.features` (`docs/features.md`) and open feature/use-case contracts (`Inputs`, `Outputs`, `Dependencies`, and process trees)
- `.codegraph/` (when present at the repo root) via `codegraph_explore` / `codegraph explore` for AST symbol discovery and call-graph coupling
- `paths.roadmapTemplate` (`.nyssa-ai/plan-product/templates/roadmap.md`) and existing `paths.roadmap` (`docs/roadmap.md`)

## Writes

- the configured roadmap path from `paths.roadmap`, usually `docs/roadmap.md`
- the configured feature inventory path from `paths.features`, only with user confirmation when resolving status conflicts

Use `.nyssa-ai/plan-product/config.json` for paths and `paths.roadmapTemplate` for file shape. Step IDs are assigned once and never renumbered; document order is the delivery order. Unlike feature and use-case docs, roadmap step bullets and `Verify:` checkpoints may include concrete technical delivery decisions, product/technology selections, conditional AST symbol `Anchors:`, architectural `Gotchas:`, and verification commands, while deferring code-level implementation details to `ce-plan`.
