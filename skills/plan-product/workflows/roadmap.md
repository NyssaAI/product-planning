# Workflow: Roadmap Sequencing & Step Delivery

> [!IMPORTANT] Scope Directive
> This workflow sequences and maintains the dependency-ordered product delivery roadmap (`docs/roadmap.md`). It ingests technical stack context (`docs/tech-stack.md`), domain concepts (`docs/concepts/c-*.md`), and feature/use-case contracts (`docs/features/f-gg.nn/`), opportunistically probes AST symbols via CodeGraph when `.codegraph/` is present at the repository root, and delegates large-scale analysis via isolated Map-Reduce subagents when needed. It owns work delivery steps with stable `R-pp.ss` IDs, the enriched step schema (`Statement` with target link and `after:`, `Rationale`, `Concepts`, conditional `Anchors`, `Gotchas`, and `Verify`), tie-out validation against the feature inventory (`docs/features.md`), and handoff guidance to Compound Engineering (`/plan` or `ce-plan`). It does not author implementation specs, write source code snippets, or execute code edits.

---

## Operating Rules

- Reuse information and approval already supplied by the user.
- Configured paths are repo-relative. Render links relative to document location.
- Read `.nyssa-ai/plan-product/config.json` for paths and `paths.roadmapTemplate` for file shape.
- Preserve existing user-authored content and local notes. Preserve unparseable lines verbatim with flags.
- Assign step IDs once via `structure.roadmap.idPattern` (`R-pp.ss`, where `pp` is the two-digit phase and `ss` is the step). Never renumber or reuse IDs. Document order, not the ID, determines delivery order.
- Completed steps are immutable history. Never uncheck a completed step.
- Step removal is permitted only for open steps; all incoming references in other open steps (both `after:` dependencies and `Verify: with R-pp.ss` deferrals) must be checked and repaired concurrently before deletion.

### The Boundary: Planning vs. Implementation

The roadmap sequencing workflow operates strictly within the **planning phase**. It is an informed opinion on build order grounded in architecture, domain concepts, technology stack, and (when indexed) existing AST symbols—not an implementation specification:
- Technical delivery decisions, product/technology selections, symbol anchor names, and concrete verification commands **are permitted** in roadmap step bullets and `- Verify:` checkpoints (whereas feature guides and use cases must remain non-technical).
- **Strictly prohibited**: Do not include source code snippets, function definitions, file-by-file edit task lists, class diagrams, database DDL/ORM schemas, migration scripts, or unit-test mocking harnesses. Defer those implementation details to `/plan` or `ce-plan`.

| Dimension | In Scope for Roadmap Planning (Briefing Note) | Out of Scope / Deferred to `ce-plan` & Implementation |
| :--- | :--- | :--- |
| **Sequencing Rationale** | Explains *why* this step belongs here (causal dependency on prior state). | Class diagrams, call trees, function signatures, or API routing details. |
| **Conceptual Linkages** | Maps which domain concepts (`[C-nn]`) and tech-stack capabilities inform this step. | Database DDL, table schema definitions, ORM models, or migration scripts. |
| **Architectural Gotchas** | Highlights non-obvious traps, edge cases, and concurrency/idempotency risks. | Code-level solutions, algorithms, locking mechanisms, or boilerplate. |
| **CodeGraph Anchors** | Names prerequisite symbols consumed and target symbols/interfaces established. | Writing method bodies, type definitions, or line-by-line syntax. |
| **Verification Checkpoint** | User-runnable command or observable outcome with demo data (`- Verify:`). | Internal unit test mechanics, mocking harnesses, or test suites. |
| **Execution Breakdown** | Delivery slice targeting a use case or foundational feature. | File-by-file task lists, code edits, and refactoring sequences. |

### The "Sufficient Information" Step Schema

Every `R-pp.ss` step in `docs/roadmap.md` must capture high-signal attributes:

```markdown
- [ ] R-pp.ss: Imperative statement — [UC-gg.nn.uu](features/f-gg.nn/uc-gg.nn.uu-short-slug.md) — after: R-pp.ss
    - Rationale: Why this step is positioned here; what upstream state or prerequisite it relies upon.
    - Concepts: Domain models ([C-nn](concepts/c-nn-short-slug.md)) and tech-stack elements informing this slice.
    - Anchors: Consumes `ExistingSymbol` (from R-pp.ss); establishes `TargetSymbol` interface. (Optional: present only when CodeGraph is active)
    - Gotchas: Critical architectural constraints, edge cases, or concurrency/idempotency traps to account for.
    - Verify: Concrete command, test run, or screen inspection with observable demo data.
```

- **Target Linking**: Each step links to one or more `[UC-gg.nn.uu](<path>)` use cases. When a foundational or setup feature has no separate use cases, the step falls back to linking `[F-gg.nn](<path>)` directly. Append `— after: ...` only when the step declares dependencies.
- **Conditional `Anchors:`**: Include `- Anchors:` when `.codegraph/` is present at the repository root to record prerequisite AST symbols consumed and target symbols/interfaces established. Omit `- Anchors:` cleanly when `.codegraph/` is absent.
- **Verification Rigor**: Every step's `- Verify:` sub-bullet is a user-verifiable stopping point (what the user runs or clicks, expected outcome, and demo data). Steps without direct observable outcomes may defer with `Verify: with R-pp.ss`, but no more than two consecutive open steps may defer.

---

## Procedure

### 1. Initialization, Context Assembly & Conditional CodeGraph Detection
1. Read `.nyssa-ai/plan-product/config.json`. If missing or incomplete, run `node "${PLUGIN_ROOT}/scripts/init.mjs"` (resolving `${PLUGIN_ROOT}` from `PLAN_PRODUCT_PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, `PLUGIN_ROOT`, or the relative path to this installed plugin).
2. Verify `paths.roadmapTemplate` exists and read it to confirm the target structure.
3. Read the feature inventory (`paths.features`). If absent or containing only placeholder features, route user to [`workflows/product.md`](product.md).
4. **Assemble Architectural & Contract Context** (read document contents rather than merely checking file existence on disk):
   - **Technology Stack**: Read `paths.techStack` (`docs/tech-stack.md`) and top-level repository manifests (`package.json`, `go.mod`, etc.) to identify technical prerequisites (e.g., storage initialization, connection pooling, authentication middleware, test runners).
   - **Domain Concepts & Macro-Flows**: Read all concept files under `structure.concepts.root` / `paths.concepts` (`docs/concepts/c-*.md`) to extract core domain models, stage progressions, and cross-feature invariants (`C-nn`).
   - **Feature & Use-Case Contracts**: For every open feature in the inventory, read its feature guide (`docs/features/f-gg.nn/feature.md`) and child use cases (`uc-gg.nn.uu-*.md`), specifically inspecting `## Conceptual Context`, `## Scope`, `## Inputs`, `## Outputs`, `## Dependencies`, and `## Process` trees to determine true causal build order.
5. **Conditional AST Code Mapping (CodeGraph Detection)**:
   - Check whether a `.codegraph/` directory exists at the repository root:
     - **If `.codegraph/` is present (CodeGraph Active)**:
       1. *Empirical Code Discovery*: Use the `codegraph_explore` MCP tool or `codegraph explore "<symbol names or question>"` CLI command to probe existing code symbols, classes, and call paths relevant to `docs/concepts/` (`C-nn`) and open `docs/features/` targets. Identify whether prerequisite models, pools, or handlers already exist to avoid redundant foundational steps.
       2. *Call Graph Centrality & Coupling Gotchas*: Prioritize high-centrality symbols (nodes with many callers/callees) into earlier phases to stabilize core interfaces before downstream leaves are built, and extract real coupling constraints into `Gotchas:`.
       3. *Step Anchoring*: Populate `- Anchors:` on each step naming prerequisite symbols consumed and target symbols/interfaces established.
     - **If `.codegraph/` is absent (Standard Markdown Fallback)**:
       1. *Graceful Bypass*: Completely bypass CodeGraph with **zero errors, zero warnings, and no attempt to auto-index** (indexing is strictly the user's decision).
       2. *Declarative Ingestion*: Rely cleanly on `docs/tech-stack.md`, repository manifests (`package.json`, `go.mod`, etc.), `docs/concepts/`, and feature/use-case contracts.
       3. *Schema Adaptability*: Omit the `- Anchors:` sub-bullet from steps without validation penalty.
6. Read existing roadmap (`paths.roadmap`). If absent, initialize from `paths.roadmapTemplate`.

### 2. Multi-Agent / Map-Reduce Delegation (For Large Scope)
When sequencing a small set of open features (5 or fewer), synthesize the assembled context directly. When sequencing a large system (many concepts, more than 5 open features, or dozens of use cases), prevent context bloat and attention degradation by executing a **Fan-Out / Fan-In (Map-Reduce)** pass via isolated subagents:

1. **Partition into Domain Clusters**: Group open features (`F-gg.nn`) and their participating concepts (`C-nn`) by Feature Group (`F-gg`) or cohesive domain cluster.
2. **Fan-Out to Fresh-Context Domain Subagents**:
   - Launch an isolated subagent per domain cluster.
   - Instruct each subagent to read **only** `paths.techStack`, its assigned `C-nn` concept files, and its assigned `F-gg.nn` feature guides and `UC-gg.nn.uu` use-case contracts, and (when `.codegraph/` is present) query domain AST symbols via `codegraph_explore` / `codegraph explore`.
   - Each subagent determines local technical ordering and writes an intermediate domain manifest (`<domain-id>.manifest.json`) to scratch disk following this contract:
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
           "anchors": "Consumes `PostgresPool`; establishes `UserEntity`",
           "gotchas": "Enforce unique email constraints at database level, not application level",
           "after": ["database-infrastructure"],
           "verify": "npm test test/auth/schema.test.mjs"
         }
       ]
     }
     ```
3. **Fan-In via Topological Aggregator Pass**:
   - Launch a fresh-context aggregator subagent (or execute a dedicated aggregation pass) that reads **only** the lightweight `*.manifest.json` files from scratch disk.
   - Perform a topological sort across all cross-domain `ingressPrerequisites` and `egressCapabilities`, resolving circularities or flagging missing foundational prerequisites.
   - Allocate global delivery phases (`Phase 00`, `Phase 01`, ...) and stable `R-pp.ss` IDs, emitting the unified `docs/roadmap.md` draft for human review and tie-out.

### 3. Entry Validation Pass
Validate the following in order:
1. **Resolution & Contract Alignment**: Every step's target use case (`UC-gg.nn.uu`) or parent feature (`F-gg.nn`) exists on disk, and its declared `Inputs` and `Dependencies` are satisfied by prior steps.
2. **Coverage**: Every incomplete feature in `paths.features` has at least one step covering it or its use cases.
3. **Ordering**: No open step appears before any step or feature listed in its `after:` clause, or before upstream stages required by its linked `C-nn` concepts.
4. **Reference Integrity**: Every `after:` entry and `Verify: with R-pp.ss` deferral resolves without cycles or dangling IDs.
5. **Enriched Schema & Verification Rigor**: Every open step includes `Rationale:`, `Concepts:`, `Gotchas:`, conditional `Anchors:` (when `.codegraph/` is present), and a concrete `- Verify:` stopping point (or valid `with R-pp.ss` deferral, with no more than two consecutive open steps deferring), and remains free of source code snippets, function definitions, or DDL schemas.

Prompt user to resolve any detected entry violations before proceeding.

### 4. Step Sequencing & Interview Pass
1. Interview for requested step additions, completions, removals, or reordering.
2. For new or updated steps, capture the enriched step schema:
   - Imperative statement line with target `[UC-gg.nn.uu](<path>)` (or `[F-gg.nn](<path>)` fallback) and explicit `after:` dependencies.
   - `- Rationale:` causal reason for its position in sequence and prerequisite state required.
   - `- Concepts:` domain models (`[C-nn](<path>)`) and tech-stack capabilities informing the slice.
   - `- Anchors:` *(conditional: included only when `.codegraph/` is present)* prerequisite symbols consumed and target symbols/interfaces established.
   - `- Gotchas:` critical architectural constraints, edge cases, and pitfalls to watch out for (without prescribing implementation code).
   - `- Verify:` runnable command, screen check, or observable outcome with demo data.
3. Assign the next highest `R-pp.ss` ID within target phase `pp`.
4. When removing an open step, inspect all other open steps for incoming `after:` and `Verify: with R-pp.ss` references and obtain user confirmation on replacement checkpoints or dependencies before deleting.

### 5. Inventory Synchronization, Exit Validation & Compound Engineering Handoff
1. Cross-check status with feature inventory (`paths.features`):
   - Flag complete features with open steps.
   - Flag incomplete features whose steps are all checked.
   - Update inventory checkboxes only with user confirmation.
2. Read `paths.roadmapTemplate` immediately before writing, then write `paths.roadmap` preserving order, headings, and local notes.
3. Re-run entry validation rules on the written document.
4. **Compound Engineering Handoff (`ce-plan` Bridge)**:
   - Report a concise summary of sequenced phases, total delivery steps, and cross-domain dependency sanity confirmation.
   - Generate an explicit handoff to `/plan` or `ce-plan` targeting the first open `R-pp.ss` step, noting any `Anchors:` so `ce-plan` can immediately query `codegraph_explore "<SymbolName>"` without exploratory grep loops:
     ```text
     Roadmap sequenced. To begin technical planning for the first open step:
     Run `/plan` or `ce-plan` targeting R-pp.ss (linked to UC-gg.nn.uu / F-gg.nn).
     [If CodeGraph active: CodeGraph anchor `<SymbolName>` ready for `codegraph_explore` querying]
     ```

---

## Verification Checklist

- [ ] Read `paths.techStack`, repository manifests, `paths.concepts` (`c-*.md`), and open feature/use-case contracts (`Inputs`, `Outputs`, `Dependencies`, and process trees).
- [ ] Checked for `.codegraph/` at repository root: probed AST symbols and populated `Anchors:` when present, or bypassed cleanly with zero errors/warnings and no auto-indexing when absent.
- [ ] Delegated large-scale domain analysis via isolated subagents and `*.manifest.json` scratch manifests when sequencing large feature sets.
- [ ] All target use cases (`UC-gg.nn.uu`) and parent features (`F-gg.nn`) exist and link to real files.
- [ ] Every non-completed feature has step coverage.
- [ ] No circular dependencies or backward references in document order.
- [ ] Every open step captures the enriched schema: target link + `after:`, `Rationale:`, `Concepts:`, conditional `Anchors:`, `Gotchas:`, and `Verify:`.
- [ ] Planning boundary enforced: no source code snippets, function definitions, file-by-file edit tasks, or DDL schemas in roadmap steps.
- [ ] Every open step has a verified `- Verify:` stopping point, and no more than two consecutive open steps defer verification.
- [ ] Stable `R-pp.ss` IDs assigned sequentially without renumbering history.
- [ ] Inventory checkboxes synchronized with user confirmation.
- [ ] Exit handoff generated for `/plan` or `ce-plan` targeting the first open `R-pp.ss` step (including any `Anchors:` for instant `codegraph_explore` querying).
