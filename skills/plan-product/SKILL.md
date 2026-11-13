---
name: plan-product
description: >-
  Use this skill when the user asks to "plan this product", "define the product", "define product docs",
  "seed Ubiquitous Language glossary and feature inventory", "define a domain concept", "capture a macro-flow",
  "plan a feature", "create feature guide", "document a use case", "document the use case",
  "map actor workflows and alternate flows", "sequence development plan", "dependency-ordered development plan",
  "order delivery steps", "upgrade planning docs", "migrate model v1 to v2", or run any plan-product workflow.
  Do NOT use this skill for implementing source code, editing repository files directly, technical slice planning / code review / debugging (route to dev-delivery), repo standards conformance (route to dev-standards), post-implementation learnings (route to dev-learnings), PR/release shipping (route to dev-ship), or plugin/skill authoring (route to plugin-builder).
---

# Plan Product

> [!IMPORTANT] Scope Directive
> Unified facade and orchestrator for product planning workflows. Coordinates product definitions, Ubiquitous Language glossaries, domain concepts, feature specifications, actor use cases, phased development plans, and model migrations. Procedural workflows are encapsulated in `workflows/`; deterministic path resolution, initialization, migration, and validation live under `src/` (`src/init/init.mjs`, `src/migration/migrate.mjs`, `src/validation/validate.mjs`).
>
> **Out-of-Scope Cross-Plugin Routing Boundaries**:
> - Source code implementation, technical slice planning (`docs/plans/dp-pp.ss-<slug>.md`), causal-chain debugging, and diff/PR code review -> **`dev-delivery`**
> - Language/architecture coding standards, `check_adoption.py`, AST checkers, and `docs/code-map/codegraph.db` indexing -> **`dev-standards`**
> - Post-implementation grounded project learnings (`docs/learnings/`) -> **`dev-learnings`**
> - Verified GitHub PR merges (`"push it"`) and SemVer/tag/marketplace releases (`"ship that"`) -> **`dev-ship`**
> - Agent plugin scaffolding, skill authoring, topology reorganization, and multi-host `harness-adapter` packaging -> **`plugin-builder`**

---

## Canonical Numbering & Terminology Contract (v2)

| Numbering Pattern | Canonical Name | Segment Definitions | Path / Location |
| :--- | :--- | :--- | :--- |
| **`C-nn`**<br>*(e.g. `C-01`)* | **Concept ID** | • **`nn` = Concept Number** (`01`–`99`): Sequential atomic domain model or cross-feature macro-flow (`kind: domain-model` or `kind: flow`). | `docs/concepts/c-nn-short-slug.md` |
| **`F-gg.nn`**<br>*(e.g. `F-01.02`)* | **Feature ID** | • **`gg` = Feature Group** (`00`–`99`): Cohesive functional area / domain clustering related features (`00` = Foundation).<br>• **`nn` = Feature Number** (`01`–`99`): Sequential feature within that Feature Group. | `docs/features/f-gg.nn/feature.md` |
| **`UC-gg.nn.uu`**<br>*(e.g. `UC-01.02.01`)* | **Use Case ID** | • **`gg` = Feature Group** (`00`–`99`): Inherited from parent Feature.<br>• **`nn` = Feature Number** (`01`–`99`): Inherited from parent Feature.<br>• **`uu` = Use Case Number** (`01`–`99`): Sequential actor workflow within `F-gg.nn`. | `docs/features/f-gg.nn/uc-gg.nn.uu-short-slug.md` |
| **`DP-pp.ss`**<br>*(e.g. `DP-01.03`)* | **Development Plan Step ID** | • **`pp` = Phase** (`00`–`99` or `01`–`99`): Technical delivery stage in build order.<br>• **`ss` = Step** (`01`–`99`): Ordered unit of delivery work within Phase `pp` that completes/verifies target `UC-gg.nn.uu`s (or `F-gg.nn` fallback). | `docs/plans/development-plan.md` |

---

## Command Fast-Paths & Triage Matrix

When invoked directly via slash command, argument hint, or explicit user intent, immediately dispatch to the corresponding internal runbook:

| User Intent / Command | Target Workflow | Runbook Path |
| :--- | :--- | :--- |
| `/plan-product`, define a product, target audience, high-level feature inventory, seed/refresh core docs (`docs/product.md`, `docs/GLOSSARY.md`, `docs/features.md`, `docs/tech-stack.md`) | Product Discovery & Inventory | [`workflows/product.md`](workflows/product.md) |
| `/plan-concept`, define a domain concept, entity model, or cross-feature macro-flow (`docs/concepts/c-nn-short-slug.md`) | Concept & Macro-Flow Specification | [`workflows/concept.md`](workflows/concept.md) |
| `/plan-feature`, define or split a feature, establish capability boundaries, acceptance checks (`docs/features/f-gg.nn/feature.md`) | Feature Specification | [`workflows/feature.md`](workflows/feature.md) |
| `/plan-use-case`, map an actor workflow, entry route, failures, alternate flows, ASCII process tree (`docs/features/f-gg.nn/uc-gg.nn.uu-short-slug.md`) | Use Case Specification | [`workflows/use-case.md`](workflows/use-case.md) |
| `/plan-development`, sequence delivery steps (`DP-pp.ss`), define `- Verify:` checkpoints, order dependencies (`docs/plans/development-plan.md`) | Development Plan Sequencing | [`workflows/development-plan.md`](workflows/development-plan.md) |
| `/plan-maintain`, upgrade legacy planning documents (v1 or legacy `docs/roadmap.md` to v2), reconcile models, or repair references | Maintenance & Upgrade | [`workflows/maintain.md`](workflows/maintain.md) |

If the user's intent is broad or ambiguous (e.g. `"help me plan my app"`), start with [`workflows/product.md`](workflows/product.md).

---

## Core Operating Invariants

1. **Path Authority, 5-Root Taxonomy, & Opt-In Telemetry**: Configuration in `.nyssa-ai/plan-product/config.json` resolves in strict precedence from `user_home` (`~/.nyssa-ai/plan-product/config.json`) to `repo_root` (`<repo_root>/.nyssa-ai/plan-product/config.json`), falling back to `plugin_root` (`skills/plan-product/assets/config.json`), including optional `runtimeRoot` and `telemetry.enabled` settings. `<repo_root>/.nyssa-ai/plan-product/config.json` is the repository path authority; all committed output paths are `repo_root`-relative. `runtime_root` resolves via the 4-step precedence contract: (1) `--runtime-root` -> (2) `NYSSA_RUNTIME_ROOT` (namespaced to `<NYSSA_RUNTIME_ROOT>/.nyssa-ai/plan-product/runtime/` when pointing at a persona workspace) -> (3) active persona `cwd` containing both `SOUL.md` and `IDENTITY.md` (`<persona_cwd>/.nyssa-ai/plan-product/runtime/`) -> (4) layered `config.json` `runtimeRoot` (`user_home` -> `repo_root`), `<repo_root>/.nyssa-ai/plan-product/runtime/` when `<repo_root>/.nyssa-ai/plan-product/` exists, or `~/.nyssa-ai/plan-product/runtime/`. Usage telemetry is strictly opt-in (`"telemetry": { "enabled": false }` by default): zero `usage/` directories or files are created unless `telemetry.enabled === true`, in which case events append to `<runtime_root>/usage/events.jsonl` (never directly under `.nyssa-ai/plan-product/usage/`).
2. **Deterministic Bootstrapping**: If `<repo_root>/.nyssa-ai/plan-product/config.json` or required templates are missing, run `node "${PLUGIN_ROOT}/src/init/init.mjs"` from `repo_root` before interviewing. Resolve `${PLUGIN_ROOT}` (`plugin_root`) in order of precedence: `PLAN_PRODUCT_PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, `PLUGIN_ROOT`, or the relative path to this installed plugin directory.
3. **Strict Model v2 Enforcement (Zero Dual v1/v2 Operation)**: This plugin operates **exclusively** under Model v2 rules. It CANNOT attempt to operate under the rules of Model v1 and Model v2 simultaneously. If legacy `.plan-product/` exists, `config.version < 2`, legacy `docs/roadmap.md` or `R-pp.ss` / `R-NNN` paths exist, or legacy `F-Nxx` / `UC-nnn` paths are detected, **stop immediately, alert the user of the version conflict, and dispatch to [`workflows/maintain.md`](workflows/maintain.md)** to run migration (`node "${PLUGIN_ROOT}/src/migration/migrate.mjs"`) before attempting any planning operations.
4. **Preserve User Content**: Merge by section heading (**Merge-by-Heading Preservation**) and preserve unmatched sections, comments, links, and local notes. A file matching its configured template byte-for-byte is `template only` (**Template-Only Detection**) and may be initialized without confirmation.
5. **Non-Technical Feature & Use-Case Language**: `product.md`, `features.md`, `feature.md`, and `uc-gg.nn.uu-short-slug.md` MUST be written in plain, non-technical user-outcome and actor-behavior language. Feature titles must follow canonical formulas (Title Case, active verbs, concrete domain artifacts, and user safeguards/protections, e.g. `Update Tasks & Projects without Overwriting Personal Notes` or `Define, Refine & Update Ideal Client Profiles (ICPs)`). Plumbing jargon (*Surgical*, *Ingestion*, *Storage*, *Syndication*), vague 1–2 word stubs (*Reminders*, *Shift Swaps*), and user-story phrasing (*"Allow users to..."*) are strictly banned (*Canonical* is permitted). Never leak overly technical decisions, implementation mechanics, or specific product/technology selections into features or use cases. Technology context belongs in `tech-stack.md`, and concrete technical decisions or technology selections may appear in `docs/plans/development-plan.md` entries.
6. **Ubiquitous Language Alignment (`docs/GLOSSARY.md`)**: `init` and `/plan-product` seed and maintain `docs/GLOSSARY.md` (`<app>/docs/GLOSSARY.md` in monorepos). Always read `paths.glossary` (`docs/GLOSSARY.md`) before drafting domain concepts, feature titles, actor terms, or development plan steps so product docs enforce canonical domain terms and avoid banned synonyms (`ARCH-NAME`).
7. **Structured Interview**: Ask one blocking question cluster at a time. Present numbered choices in terminal runtimes. Mark inferred items with `[inferred]` and confirm before writing.

---

## Verification

Before concluding any planning workflow:
- [ ] Confirmed path resolution via `.nyssa-ai/plan-product/config.json` (`user_home` -> `repo_root`).
- [ ] Confirmed template read immediately prior to document write.
- [ ] Confirmed candidate capsule, glossary terms, feature boundary, use case flow, or development plan step sequence with user prior to writing.
- [ ] Verified feature titles adhere to canonical naming formulas without banned plumbing jargon (*Surgical*, *Storage*, *Ingestion*, *Syndication*), vague stubs, or user-story phrasing.
- [ ] Verified no overly technical decisions or technology selections leaked into feature or use-case documents (kept in `tech-stack.md` or `docs/plans/development-plan.md` only).
- [ ] Verified all markdown links are relative to document location and resolve to existing targets.
- [ ] Preserved all unedited user-authored sections and local notes.
- [ ] Executed the target workflow's specific `## Verification Checklist`.
- [ ] Reported all created or updated paths to the user.
