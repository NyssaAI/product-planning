---
name: plan-product
description: >-
  Define products, features, use cases, and dependency-ordered roadmaps through guided conversational workflows.
  Use when the user asks to "plan this product", "define product docs", "plan a feature", "create feature guide",
  "document a use case", "sequence roadmap", "order delivery slices", or run any plan-product workflow.
  Do NOT use this skill for implementing source code, editing repository files directly, or executing engineering delivery work.
---

# Plan Product

> [!IMPORTANT] Scope Directive
> Unified facade and orchestrator for product planning workflows. Coordinates product definitions, feature specifications, actor use cases, and delivery roadmaps. Procedural workflows are encapsulated in `workflows/`; deterministic path resolution and initialization are handled by `scripts/init.mjs`.

---

## Command Fast-Paths & Triage Matrix

When invoked directly via slash command, argument hint, or explicit user intent, immediately dispatch to the corresponding internal runbook:

| User Intent / Command | Target Workflow | Runbook Path |
| :--- | :--- | :--- |
| `/plan-product`, define a product, seed/refresh core docs (`docs/product.md`, `docs/features.md`, `docs/tech-stack.md`) | Product Discovery & Inventory | [`workflows/product.md`](workflows/product.md) |
| `/plan-feature`, define or split a feature, establish capability boundaries, acceptance checks (`docs/features/f-nxx/feature.md`) | Feature Specification | [`workflows/feature.md`](workflows/feature.md) |
| `/plan-use-case`, map an actor workflow, entry route, ASCII process tree (`docs/features/f-nxx/uc-nnn-slug.md`) | Use Case Specification | [`workflows/use-case.md`](workflows/use-case.md) |
| `/plan-roadmap`, sequence delivery slices (`R-NNN`), define `- Verify:` checkpoints, order dependencies (`docs/roadmap.md`) | Roadmap Sequencing | [`workflows/roadmap.md`](workflows/roadmap.md) |

If the user's intent is broad or ambiguous (e.g. `"help me plan my app"`), start with [`workflows/product.md`](workflows/product.md).

---

## Core Operating Invariants

1. **Path Authority**: `.plan-product/config.json` is the sole path authority. Read configured templates immediately before writing. All output paths are repo-relative.
2. **Deterministic Bootstrapping**: If `.plan-product/config.json` or required templates are missing, run `node "${PLUGIN_ROOT}/scripts/init.mjs"` from the target repository root before interviewing. Resolve `${PLUGIN_ROOT}` in order of precedence: `PLAN_PRODUCT_PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, `PLUGIN_ROOT`, or the relative path to this installed plugin directory.
3. **Preserve User Content**: Merge by section heading and preserve unmatched sections, comments, links, and local notes. A file matching its configured template byte-for-byte is `template only` and may be initialized without confirmation.
4. **Structured Interview**: Ask one blocking question cluster at a time. Present numbered choices in terminal runtimes. Mark inferred items with `[inferred]` and confirm before writing.

---

## Execution Checklist

Before concluding any planning workflow:
- [ ] Confirmed path resolution via `.plan-product/config.json`.
- [ ] Confirmed template read immediately prior to document write.
- [ ] Confirmed candidate capsule, feature boundary, or slice sequence with user prior to writing.
- [ ] Verified all markdown links are relative to document location and resolve to existing targets.
- [ ] Preserved all unedited user-authored sections and local notes.
- [ ] Executed the target workflow's specific `## Verification Checklist`.
- [ ] Reported all created or updated paths to the user.
