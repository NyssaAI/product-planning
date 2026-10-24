---
name: plan-product
description: >-
  Use this skill when the user asks to "plan this product", "define product docs", "define a domain concept",
  "capture a macro-flow", "plan a feature", "create feature guide", "document a use case", "sequence roadmap",
  "order delivery steps", "upgrade planning docs", "migrate model v1 to v2", or run any plan-product workflow.
  Do NOT use this skill for implementing source code, editing repository files directly, or executing engineering delivery work.
---

# Plan Product

> [!IMPORTANT] Scope Directive
> Unified facade and orchestrator for product planning workflows. Coordinates product definitions, domain concepts, feature specifications, actor use cases, delivery roadmaps, and model migrations. Procedural workflows are encapsulated in `workflows/`; deterministic path resolution and initialization are handled by `scripts/init.mjs`.

---

## Canonical Numbering & Terminology Contract (v2)

| Numbering Pattern | Canonical Name | Segment Definitions | Path / Location |
| :--- | :--- | :--- | :--- |
| **`C-nn`**<br>*(e.g. `C-01`)* | **Concept ID** | • **`nn` = Concept Number** (`01`–`99`): Sequential atomic domain model or cross-feature macro-flow. | `docs/concepts/c-nn-short-slug.md` |
| **`F-gg.nn`**<br>*(e.g. `F-01.02`)* | **Feature ID** | • **`gg` = Feature Group** (`00`–`99`): Cohesive functional area / domain clustering related features (`00` = Foundation).<br>• **`nn` = Feature Number** (`01`–`99`): Sequential feature within that Feature Group. | `docs/features/f-gg.nn/feature.md` |
| **`UC-gg.nn.uu`**<br>*(e.g. `UC-01.02.01`)* | **Use Case ID** | • **`gg` = Feature Group** (`00`–`99`): Inherited from parent Feature.<br>• **`nn` = Feature Number** (`01`–`99`): Inherited from parent Feature.<br>• **`uu` = Use Case Number** (`01`–`99`): Sequential actor workflow within `F-gg.nn`. | `docs/features/f-gg.nn/uc-gg.nn.uu-short-slug.md` |
| **`R-pp.ss`**<br>*(e.g. `R-01.03`)* | **Roadmap Step ID** | • **`pp` = Phase** (`00`–`99` or `01`–`99`): Technical delivery stage in build order.<br>• **`ss` = Step** (`01`–`99`): Ordered unit of delivery work within Phase `pp` that completes/verifies target `UC-gg.nn.uu`s (or `F-gg.nn` fallback). | `docs/roadmap.md` |

---

## Command Fast-Paths & Triage Matrix

When invoked directly via slash command, argument hint, or explicit user intent, immediately dispatch to the corresponding internal runbook:

| User Intent / Command | Target Workflow | Runbook Path |
| :--- | :--- | :--- |
| `/plan-product`, define a product, seed/refresh core docs (`docs/product.md`, `docs/features.md`, `docs/tech-stack.md`) | Product Discovery & Inventory | [`workflows/product.md`](workflows/product.md) |
| `/plan-concept`, define a domain concept, entity model, or cross-feature macro-flow (`docs/concepts/c-nn-short-slug.md`) | Concept & Macro-Flow Specification | [`workflows/concept.md`](workflows/concept.md) |
| `/plan-feature`, define or split a feature, establish capability boundaries, acceptance checks (`docs/features/f-gg.nn/feature.md`) | Feature Specification | [`workflows/feature.md`](workflows/feature.md) |
| `/plan-use-case`, map an actor workflow, entry route, ASCII process tree (`docs/features/f-gg.nn/uc-gg.nn.uu-short-slug.md`) | Use Case Specification | [`workflows/use-case.md`](workflows/use-case.md) |
| `/plan-roadmap`, sequence delivery steps (`R-pp.ss`), define `- Verify:` checkpoints, order dependencies (`docs/roadmap.md`) | Roadmap Sequencing | [`workflows/roadmap.md`](workflows/roadmap.md) |
| `/plan-maintain`, upgrade legacy planning documents (v1 to v2), reconcile models, or repair references | Maintenance & Upgrade | [`workflows/maintain.md`](workflows/maintain.md) |

If the user's intent is broad or ambiguous (e.g. `"help me plan my app"`), start with [`workflows/product.md`](workflows/product.md).

---

## Core Operating Invariants

1. **Path Authority**: `.nyssa-ai/plan-product/config.json` is the sole path authority. Starter templates and schema are bundled in `skills/plan-product/assets/` and initialized into `.nyssa-ai/plan-product/`. Read configured templates immediately before writing. All output paths are repo-relative.
2. **Deterministic Bootstrapping**: If `.nyssa-ai/plan-product/config.json` or required templates are missing, run `node "${PLUGIN_ROOT}/scripts/init.mjs"` from the target repository root before interviewing. Resolve `${PLUGIN_ROOT}` in order of precedence: `PLAN_PRODUCT_PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, `PLUGIN_ROOT`, or the relative path to this installed plugin directory.
3. **Strict Model v2 Enforcement (Zero Dual v1/v2 Operation)**: This plugin operates **exclusively** under Model v2 rules. It CANNOT attempt to operate under the rules of Model v1 and Model v2 simultaneously. If legacy `.plan-product/` exists, `config.version < 2`, or legacy `F-Nxx` / `UC-nnn` / `R-NNN` paths are detected, **stop immediately, alert the user of the version conflict, and dispatch to [`workflows/maintain.md`](workflows/maintain.md)** to run migration (`node "${PLUGIN_ROOT}/scripts/migrate.mjs"`) before attempting any planning operations.
4. **Preserve User Content**: Merge by section heading and preserve unmatched sections, comments, links, and local notes. A file matching its configured template byte-for-byte is `template only` and may be initialized without confirmation.
5. **Non-Technical Feature & Use-Case Language**: `product.md`, `features.md`, `feature.md`, and `uc-gg.nn.uu-short-slug.md` MUST be written in plain, non-technical user-outcome and actor-behavior language. Never leak overly technical decisions, implementation mechanics, or specific product/technology selections into features or use cases. Technology context belongs in `tech-stack.md`, and concrete technical decisions or technology selections may appear in `roadmap.md` entries.
6. **Structured Interview**: Ask one blocking question cluster at a time. Present numbered choices in terminal runtimes. Mark inferred items with `[inferred]` and confirm before writing.

---

## Verification

Before concluding any planning workflow:
- [ ] Confirmed path resolution via `.nyssa-ai/plan-product/config.json`.
- [ ] Confirmed template read immediately prior to document write.
- [ ] Confirmed candidate capsule, feature boundary, use case flow, or roadmap step sequence with user prior to writing.
- [ ] Verified no overly technical decisions or technology selections leaked into feature or use-case documents (kept in `tech-stack.md` or `roadmap.md` only).
- [ ] Verified all markdown links are relative to document location and resolve to existing targets.
- [ ] Preserved all unedited user-authored sections and local notes.
- [ ] Executed the target workflow's specific `## Verification Checklist`.
- [ ] Reported all created or updated paths to the user.
