# Workflow: Development Plan Sequencing & Step Delivery

> [!IMPORTANT] Scope Directive
> This workflow sequences and maintains the dependency-ordered product **Development Plan** (`docs/plans/development-plan.md`). It ingests technical stack context (`docs/tech-stack.md`), Ubiquitous Language (`docs/GLOSSARY.md`), domain concepts (`docs/concepts/c-*.md`), machine-readable entity/interface specifications (`docs/specs/*.json`), project learnings (`docs/learnings/**/*.md`), and feature/use-case contracts (`docs/features/f-gg.nn/`), opportunistically probes AST symbols via on-demand CodeGraph (`codegraph_explore` MCP or `dev-standards` `codegraph-mcp.mjs` backed by ephemeral `.temp/codegraph/`) when repository source code exists, and delegates large-scale analysis via isolated Depth-1 Map-Reduce subagents staged in `.temp/plan-product/<run-id>/`. It owns work delivery steps with stable `DP-pp.ss` IDs, the enriched step schema (`Statement` with target link and `after:`, `Rationale`, `Concepts`, conditional `Anchors`, `Gotchas`, and `Verify`), tie-out validation against the feature inventory (`docs/features.md`), and handoff guidance to `dev-delivery` (`plan` / `implement`). It does not author implementation specs, write source code snippets, or execute code edits.

---

## Operating Rules

- Reuse information and approval already supplied by the user.
- Configured paths are `repo_root`-relative. Render links relative to document location (from `docs/plans/development-plan.md`, links to features and concepts use `../features/...` and `../concepts/...`).
- Resolve paths and `development-plan.md` template via zero-footprint precedence (`plugin_root` defaults -> `~/.nyssa-ai/plan-product/` -> optional `<repo_root>/.nyssa-ai/plan-product/` override, without creating `.nyssa-ai/plan-product/` in `repo_root`). Never emit `.tessl/plugins/...` or internal `SKILL.md` paths into committed docs.
- Preserve existing user-authored content and local notes. Preserve unparseable lines verbatim with flags.
- Assign step IDs once via `structure.developmentPlan.idPattern` (`DP-pp.ss`, where `pp` is the two-digit phase and `ss` is the step). Never renumber or reuse IDs. Document order, not the ID, determines delivery order.
- Completed steps are immutable history. Never uncheck a completed step.
- Step removal is permitted only for open steps; all incoming references in other open steps (both `after:` dependencies and `Verify: with DP-pp.ss` deferrals) must be checked and repaired concurrently before deletion.

### The Boundary: Planning vs. Implementation

The development plan sequencing workflow operates strictly within the **planning phase**. It is an informed opinion on build order grounded in architecture, Ubiquitous Language (`docs/GLOSSARY.md`), domain concepts, DTO/interface specs (`docs/specs/*.json`), technology stack, and (when indexed) existing AST symbols—not an implementation specification:
- Technical delivery decisions, product/technology selections, symbol anchor names, and concrete verification commands **are permitted** in development plan step bullets and `- Verify:` checkpoints (whereas feature guides and use cases must remain non-technical).
- **Strictly prohibited**: Do not include source code snippets, function definitions, file-by-file edit task lists, class diagrams, database DDL/ORM schemas, migration scripts, or unit-test mocking harnesses. Defer architectural `Delivery Phase` / slice design, 3-Tier Architectural Fit Checklist verification (including Operational Telemetry), adversarial plan review (`plan-adversary`), context-isolated Dual-Agent TDD, always-on $0 verification gates, and complexity-gated adversarial reviews to `dev-delivery` (`plan` → `docs/plans/{phase-pp,f-gg.nn,f-gg,dp-pp.ss}-<slug>.md`, then `implement` on a `feat/<slug>` branch).
- **Cross-Plugin Lifecycle Boundaries**: `dev-standards` owns language/architecture coding standards, `check_adoption.py`, AST checkers, and ephemeral `.temp/codegraph/` CodeGraph indexing (`codegraph-mcp.mjs`; never committing `docs/code-map/`); `dev-delivery` owns feature-branch isolation (`feat/<slug>`), autonomous Step 1.5 spec synthesis / Draft-PR fail-fast, `docs/plans/{phase-pp,f-gg.nn,f-gg,dp-pp.ss}-<slug>.md` technical implementation planning, causal-chain debugging, context-isolated Dual-Agent TDD, and complexity-gated adversarial diff/PR review; `dev-learnings` owns post-implementation grounded project learnings in `docs/learnings/` (later consumed into `Gotchas:`); `dev-ship` owns verified GitHub PR merges (`"push it"`) and SemVer/tag/marketplace releases (`"ship that"`); and `plugin-builder` owns agent plugin scaffolding, skill authoring, topology reorganization, and multi-host `harness-adapter` packaging.

| Dimension | In Scope for Development Plan (Briefing Note) | Out of Scope / Deferred to `dev-delivery` (`plan` & `implement`) |
| :--- | :--- | :--- |
| **Sequencing Rationale** | Explains *why* this step belongs here (causal dependency on prior state). | Class diagrams, call trees, function signatures, or API routing details. |
| **Conceptual Linkages** | Maps which domain concepts (`[C-nn]`), `docs/specs/*.json` DTO/interface specs, and tech-stack capabilities inform this step. | Database DDL, table schema definitions, ORM models, or migration scripts. |
| **Architectural Gotchas** | Highlights non-obvious traps, `docs/learnings/` constraints, edge cases, concurrency/idempotency risks, and **High-Risk Surfaces** (`Security/Auth boundaries`, `Money/Billing/Ledger mutations`, `Prompt-Injection/Untrusted-Input boundaries`). | Code-level solutions, algorithms, locking mechanisms, or boilerplate. |
| **CodeGraph Anchors** | Names prerequisite symbols consumed and target symbols/interfaces established. | Writing method bodies, type definitions, or line-by-line syntax. |
| **Verification Checkpoint** | User-runnable command (`test/unit/`, `test/use_case/`, `test/e2e/`) or observable outcome with demo data (`- Verify:`). | Internal unit test mechanics, mocking harnesses, or test suites. |
| **Execution Breakdown** | Delivery slice targeting a use case or foundational feature. | File-by-file task lists, Dual-Agent TDD slices, code edits, and refactorings. |

### The "Sufficient Information" Step Schema

Every `DP-pp.ss` step in `docs/plans/development-plan.md` must capture high-signal attributes:

```markdown
- [ ] DP-pp.ss: Imperative statement — [UC-gg.nn.uu](../features/f-gg.nn/uc-gg.nn.uu-short-slug.md) — after: DP-pp.ss
    - Rationale: Why this step is positioned here; what upstream state or prerequisite it relies upon.
    - Concepts: Domain models ([C-nn](../concepts/c-nn-short-slug.md)), `docs/specs/*.json` contracts, and tech-stack elements informing this slice.
    - Anchors: Consumes `ExistingSymbol` (from DP-pp.ss); establishes `TargetSymbol` interface. (Optional: present only when CodeGraph is active on existing source code)
    - Gotchas: Critical architectural constraints, `docs/learnings/` rules, edge cases, concurrency/idempotency traps, and High-Risk Surfaces (Security/Auth, Money/Ledger, or Prompt-Injection/Untrusted-Input boundaries) to flag for `High` Complexity & Risk review.
    - Verify: Concrete command, test run, or screen inspection with observable demo data.
```

- **Target Linking**: Each step links to one or more `[UC-gg.nn.uu](<path>)` use cases. When a foundational or setup feature has no separate use cases, the step falls back to linking `[F-gg.nn](<path>)` directly. Append `— after: ...` only when the step declares dependencies.
- **Conditional `Anchors:`**: Include `- Anchors:` when repository source code exists and on-demand CodeGraph is available (`codegraph_explore` MCP or `dev-standards` `codegraph-mcp.mjs` warming ephemeral `.temp/codegraph/<unit-slug>/codegraph.db`) to record prerequisite AST symbols consumed and target symbols/interfaces established. Omit `- Anchors:` cleanly on greenfield repositories (no source code yet) or when CodeGraph is unavailable.
- **Verification Rigor**: Every step's `- Verify:` sub-bullet is a user-verifiable stopping point (what the user runs or clicks, expected outcome, and demo data; automated test commands follow `test/unit/`, `test/use_case/`, and `test/e2e/`). Steps without direct observable outcomes may defer with `Verify: with DP-pp.ss`, but no more than two consecutive open steps may defer.

---

## Procedure

### 1. Initialization, Context Assembly & Conditional CodeGraph Detection
1. Resolve effective paths (`plugin_root` defaults -> `~/.nyssa-ai/plan-product/config.json` -> optional `<repo_root>/.nyssa-ai/plan-product/config.json`). If required starter `docs/` files are missing, run `node "<skill-dir>/scripts/init/init.mjs"` (adding `--unit <apps/...|tools/...>` for monorepo units; see [`configuration-and-paths.md`](configuration-and-paths.md)).
2. Read the resolved `development-plan.md` template (`user_home` -> `plugin_root`, or existing repo override) to confirm the target structure.
3. Read the feature inventory (`paths.features`). If absent or containing only placeholder features, route user to [`references/workflow-product.md`](workflow-product.md).
4. **Assemble Architectural & Contract Context** (read document contents rather than merely checking file existence on disk):
   - **Technology Stack**: Read `paths.techStack` (`docs/tech-stack.md`) and top-level repository manifests (`package.json`, `go.mod`, `pyproject.toml`, `*.csproj`, etc.) to identify technical prerequisites (e.g., storage initialization, connection pooling, authentication middleware, test runners).
   - **Ubiquitous Language & Domain Concepts**: Read `paths.glossary` (`docs/GLOSSARY.md`, and `apps/*/docs/GLOSSARY.md` + `apps/*/docs/concepts/*.md` in monorepos when present) alongside all concept files under `structure.concepts.root` / `paths.concepts` (`docs/concepts/c-*.md`) to extract canonical domain terms, banned synonyms, stage progressions, and cross-feature invariants (`C-nn`).
   - **Entity / DTO & Interface Specifications (`docs/specs/`)**: When `docs/specs/*.json` (or `<unit>/docs/specs/*.json`) exists, read machine-readable JSON specifications for business entities (DTOs) and interface definitions so step ordering respects shared contract dependencies.
   - **Project Learnings (`docs/learnings/`)**: When `docs/learnings/**/*.md` exists, read applicable project lessons to seed concrete architectural traps in `- Gotchas:`.
   - **Feature & Use-Case Contracts**: For every open feature in the inventory, read its feature guide (`docs/features/f-gg.nn/feature.md`) and child use cases (`uc-gg.nn.uu-*.md`), specifically inspecting `## Conceptual Context`, `## Scope`, `## Inputs`, `## Outputs`, `## Dependencies`, and `## Process` trees to determine true causal build order.
5. **Conditional AST Code Mapping (On-Demand Ephemeral CodeGraph Detection)**:
   - Check whether repository source code exists (`src/`, `apps/*/src/`, `tools/*/src/`, or existing language source files) **and** CodeGraph is available via the `codegraph_explore` MCP tool (or `mcp__codegraph__codegraph_explore` via `tool_search` on Hermes Agent, or `<dev-standards-plugin-root>/skills/dev-standards/scripts/codegraph-mcp.mjs` — never invoke bare `codegraph`, never require committed `docs/code-map/` snapshots, and never create `.codegraph/` or `docs/code-map/`):
     - **If Source Code Exists & CodeGraph Is Available (CodeGraph Active)**:
       1. *On-Demand Index Warmup & Empirical Code Discovery*: Query `codegraph_explore` (which automatically builds or incrementally refreshes gitignored `.temp/codegraph/<unit-slug>/codegraph.db` on demand via `dev-standards`; or when running without MCP, warm and query via `node "<dev-standards-plugin-root>/skills/dev-standards/scripts/codegraph-mcp.mjs" --ensure-fresh --init` followed by `--cli explore "<query>"`) to probe existing code symbols, classes, and call paths relevant to `docs/concepts/` (`C-nn`), `docs/specs/*.json`, and open `docs/features/` targets. Identify whether prerequisite models, pools, or handlers already exist to avoid redundant foundational steps.
       2. *Call Graph Centrality & Coupling Gotchas*: Prioritize high-centrality symbols (nodes with many callers/callees) into earlier phases to stabilize core interfaces before downstream leaves are built, and extract real coupling constraints into `Gotchas:`.
       3. *Step Anchoring*: Populate `- Anchors:` on each step naming prerequisite symbols consumed and target symbols/interfaces established (using canonical `docs/GLOSSARY.md` names).
     - **If Greenfield (No Source Code Yet) or CodeGraph Is Unavailable (Standard Markdown Fallback)**:
       1. *Graceful Bypass*: Completely bypass CodeGraph with **zero errors, zero warnings, and zero attempts to install tools or write `codegraph.db` into tracked paths** (CodeGraph indexing is strictly owned by `dev-standards` inside gitignored `.temp/codegraph/`).
       2. *Declarative Ingestion*: Rely cleanly on `docs/tech-stack.md`, repository manifests, `docs/GLOSSARY.md`, `docs/specs/*.json`, `docs/learnings/`, `docs/concepts/`, and feature/use-case contracts.
       3. *Schema Adaptability*: Omit the `- Anchors:` sub-bullet from steps without validation penalty.
6. Read existing development plan (`paths.developmentPlan`). If absent, initialize from `paths.developmentPlanTemplate`.

### 2. Multi-Agent / Map-Reduce Delegation (For Large Scope — Flat Depth-1)
When sequencing a small set of open features (5 or fewer), synthesize the assembled context directly. When sequencing a large system (many concepts, more than 5 open features, or dozens of use cases), prevent context bloat and attention degradation by executing a **Flat Depth-1 (`max_depth = 1`) Fan-Out / Fan-In (Map-Reduce)** pass staged in `.temp/plan-product/<run-id>/` (falling back cleanly to sequential `degraded-inline` analysis if running inside a nested subagent where child spawning is blocked):

1. **Partition into Domain Clusters**: Group open features (`F-gg.nn`) and their participating concepts (`C-nn`) by Feature Group (`F-gg`) or cohesive domain cluster, and create `.temp/plan-product/<run-id>/`.
2. **Fan-Out to Clean-Context Domain Subagents (`Model Tier: mid` / `Thinking Budget: medium` — **Argon**; `fast` / `light` / **Hydrogen** with `Thinking Budget: low` for purely mechanical file inventory)**:
   - Launch one isolated Depth-1 leaf subagent per domain cluster (*"Read-only over project docs/source; do NOT spawn subagents"*).
   - Instruct each subagent to read **only** `paths.techStack`, `docs/GLOSSARY.md`, relevant `docs/specs/*.json` and `docs/learnings/**/*.md`, its assigned `C-nn` concept files, and its assigned `F-gg.nn` feature guides and `UC-gg.nn.uu` use-case contracts, and (when CodeGraph is active on existing source code) query domain AST symbols via `codegraph_explore` (or `mcp__codegraph__codegraph_explore` via `tool_search` on Hermes Agent).
   - Each subagent determines local technical ordering and writes an intermediate domain manifest to `.temp/plan-product/<run-id>/<domain-id>.manifest.json` following this contract:
     ```json
     {
       "domainId": "identity-auth",
       "conceptsCovered": ["C-01"],
       "featuresCovered": ["F-00.01", "F-01.01"],
       "ingressPrerequisites": [
         {
           "requires": "database-infrastructure",
           "reason": "Needs PostgreSQL connection pool and user table migration"
         }
       ],
       "egressCapabilities": [
         {
           "provides": "auth-jwt-middleware",
           "description": "Bearer token verification middleware for protected routes"
         }
       ],
       "proposedLocalSteps": [
         {
           "localId": "AUTH-01",
           "target": "F-00.01",
           "statement": "Initialize user schema and password hashing module",
           "rationale": "Base credential storage for authentication",
           "concepts": ["C-01"],
           "anchors": "Consumes `PostgresPool`; establishes `UserAccount`",
           "gotchas": "Enforce unique email constraints at database level; High-Risk Surface (Security/Auth): enforce hashed secrets and constant-time comparison",
           "after": ["database-infrastructure"],
           "verify": "npm test test/use_case/auth/schema.test.mjs"
         }
       ]
     }
     ```
3. **Fan-In via High-Reasoning Topological Synthesis (`Model Tier: deep` / `Thinking Budget: high` — **Carbon** / **Gemini Orchestrator**)**:
   - Synthesize in a clean `deep`/`high` pass reading **only** `.temp/plan-product/<run-id>/*.manifest.json`.
   - Perform a topological sort across all cross-domain `ingressPrerequisites` and `egressCapabilities`, resolving circularities or flagging missing foundational prerequisites.
   - Allocate global delivery phases (`Phase 00`, `Phase 01`, ...) and stable `DP-pp.ss` IDs, emitting the unified `docs/plans/development-plan.md` draft for human review and tie-out.

### 3. Entry Validation Pass
Validate the following in order:
1. **Resolution & Contract Alignment**: Every step's target use case (`UC-gg.nn.uu`) or parent feature (`F-gg.nn`) exists on disk, and its declared `Inputs` and `Dependencies` are satisfied by prior steps. Flag any linked `feature.md` or `uc-*.md` still marked `status: blocked` with `## Open Questions & Blockers` (interview to unblock in interactive mode, or preserve `status: blocked` cleanly in non-interactive mode).
2. **Coverage**: Every incomplete feature in `paths.features` has at least one step covering it or its use cases.
3. **Ordering**: No open step appears before any step or feature listed in its `after:` clause, or before upstream stages required by its linked `C-nn` concepts.
4. **Reference Integrity**: Every `after:` entry and `Verify: with DP-pp.ss` deferral resolves without cycles or dangling IDs.
5. **Enriched Schema & Verification Rigor**: Every open step includes `Rationale:`, `Concepts:`, `Gotchas:` (explicitly flagging any High-Risk Surface: **Security/Auth boundaries**, **Money/Billing/Ledger mutations**, or **Prompt-Injection/Untrusted-Input boundaries**), conditional `Anchors:` (when CodeGraph is active on existing source code), and a concrete `- Verify:` stopping point (or valid `with DP-pp.ss` deferral, with no more than two consecutive open steps deferring), and remains free of source code snippets, function definitions, or DDL schemas.

Prompt user to resolve any detected entry violations before proceeding (or record blocking questions and return unresolved blockers when invoked non-interactively).

### 4. Step Sequencing & Interview Pass
1. Interview for requested step additions, completions, removals, or reordering (or synthesize non-interactively via the Zero-Guessing Sufficiency Gate without inventing missing facts).
2. For new or updated steps, capture the enriched step schema:
   - Imperative statement line with target `[UC-gg.nn.uu](<path>)` (or `[F-gg.nn](<path>)` fallback) and explicit `after:` dependencies.
   - `- Rationale:` causal reason for its position in sequence and prerequisite state required.
   - `- Concepts:` domain models (`[C-nn](<path>)`), `docs/specs/*.json` specs, and tech-stack capabilities informing the slice.
   - `- Anchors:` *(conditional: included only when CodeGraph is active on existing source code)* prerequisite symbols consumed and target symbols/interfaces established.
   - `- Gotchas:` critical architectural constraints, `docs/learnings/` lessons, edge cases, concurrency/idempotency pitfalls, and High-Risk Surfaces (**Security/Auth**, **Money/Ledger**, **Prompt-Injection/Untrusted Input**) to escalate `dev-delivery` Complexity & Risk to `High` (without prescribing implementation code).
   - `- Verify:` runnable command, screen check, or observable outcome with demo data.
3. Assign the next highest `DP-pp.ss` ID within target phase `pp`.
4. When removing an open step, inspect all other open steps for incoming `after:` and `Verify: with DP-pp.ss` references and obtain user confirmation on replacement checkpoints or dependencies before deleting.

### 5. Inventory Synchronization, Exit Validation & `dev-delivery` Handoff
1. Cross-check status with feature inventory (`paths.features`) and linked `uc-*.md` / `feature.md` files:
   - Flag complete features with open steps, and flag any `status: blocked` feature/use case retaining unresolved `## Open Questions & Blockers`.
   - Flag incomplete features or use cases whose `DP-pp.ss` steps are all checked (`dev-delivery` `implement` automatically rolls up `status: completed` — or `awaiting-deferred-verify` on the implementation plan when deferred — to `uc-*.md` / `feature.md` and `- [x] F-gg.nn` in `docs/features.md` upon step verification; reconcile any manual edits here with user confirmation).
2. Read `paths.developmentPlanTemplate` immediately before writing, then write `paths.developmentPlan` preserving order, headings, and local notes.
3. Re-run entry validation rules on the written document.
4. **Engineering Delivery Handoff (`dev-delivery` Bridge)**:
   - Report a concise summary of sequenced phases, total delivery steps, flagged High-Risk Surfaces, and cross-domain dependency sanity confirmation.
   - Generate an explicit handoff to `dev-delivery` (`plan` → `docs/plans/{phase-pp,f-gg.nn,f-gg,dp-pp.ss}-<slug>.md`, followed by `implement` on a `feat/<slug>` branch enforcing the 3-Tier Architectural Fit Checklist with Operational Telemetry, context-isolated Dual-Agent TDD, always-on $0 verification, and complexity-gated adversarial reviews) targeting the next open **`Delivery Phase`** (`Phase pp`, or a specific `F-gg` / `F-gg.nn` / `DP-pp.ss` target when requested), noting phase `Anchors:` so `dev-delivery` queries `codegraph_explore` across the whole `Delivery Phase` up front without exploratory grep loops:
     ```text
     Development plan sequenced. To begin feature-branch delivery (`feat/<slug>`), architectural fit evaluation, Dual-Agent TDD, and complexity-gated adversarial review:
     Invoke `dev-delivery` (`plan` / `implement`) targeting Delivery Phase pp, Feature Group F-gg, or Feature F-gg.nn.
     [If CodeGraph active: CodeGraph anchors `<SymbolNames>` ready for Stage 0 `--phase pp` querying]
     ```

---

## Verification Checklist

- [ ] Read `paths.techStack`, repository manifests, `docs/GLOSSARY.md` / `docs/specs/*.json` / `docs/learnings/` (when present), `paths.concepts` (`c-*.md`), and open feature/use-case contracts (`Inputs`, `Outputs`, `Dependencies`, and process trees).
- [ ] Checked whether repository source code exists and CodeGraph is available (`codegraph_explore` / ephemeral `.temp/codegraph/`, never requiring committed `docs/code-map/` snapshots): probed AST symbols and populated `Anchors:` when active, or bypassed cleanly with zero errors/warnings when greenfield or unavailable.
- [ ] Delegated large-scale domain analysis via Flat Depth-1 subagents (`mid` **Argon** / `fast` **Hydrogen**) staged in `.temp/plan-product/<run-id>/*.manifest.json` with `deep` **Carbon** / **Gemini Orchestrator** topological synthesis when sequencing large feature sets.
- [ ] All target use cases (`UC-gg.nn.uu`) and parent features (`F-gg.nn`) exist and link to real files (using relative `../features/...` / `../concepts/...` paths from `docs/plans/development-plan.md`), with any `status: blocked` docs flagged or unblocked cleanly.
- [ ] Every non-completed feature has step coverage.
- [ ] No circular dependencies or backward references in document order.
- [ ] Every open step captures the enriched schema: target link + `after:`, `Rationale:`, `Concepts:`, conditional `Anchors:`, `Gotchas:` (explicitly flagging any High-Risk Surface: Security/Auth, Money/Ledger, Prompt-Injection), and `Verify:`.
- [ ] Planning boundary enforced: no source code snippets, function definitions, file-by-file edit tasks, or DDL schemas in development plan steps.
- [ ] Every open step has a verified `- Verify:` stopping point, and no more than two consecutive open steps defer verification.
- [ ] Stable `DP-pp.ss` IDs assigned sequentially without renumbering history.
- [ ] Inventory checkboxes synchronized with user confirmation.
- [ ] Exit handoff generated for `dev-delivery` (`plan` / `implement`) targeting the next open `Delivery Phase` (`Phase pp`, including phase `Anchors:` for Stage 0 `codegraph_explore` querying).
