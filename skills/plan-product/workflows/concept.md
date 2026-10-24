# Workflow: Concept & Macro-Flow Specification

> [!IMPORTANT] Scope Directive
> This workflow defines or updates an atomic domain concept or end-to-end macro-flow (`docs/concepts/c-nn-short-slug.md`), links participating features (`docs/features/f-gg.nn/feature.md`), and indexes the concept in `docs/product.md`. It owns system-wide mental models, entity hierarchies, cross-feature lifecycles, and domain invariants. Microscopic actor steps belong in `workflows/use-case.md`; technical implementation choices belong in `docs/tech-stack.md`.

---

## Operating Rules

- Reuse information and approval already supplied by the user. Interview only for missing decisions.
- Configured paths are repo-relative. Render Markdown links relative to the document containing the link.
- Read `.nyssa-ai/plan-product/config.json` for paths and `paths.conceptTemplate` for file shape.
- Preserve existing user-authored content unless explicit replacement is requested.
- Ask one blocking question at a time only for missing required information.
- Keep each concept document atomic and single-subject (typically 40–80 lines), fitting into one of two archetypes:
  - `flow`: Macro-flows & lifecycles (stage progression across features, handoff triggers, cross-stage invariants).
  - `domain-model`: Domain entities & mental models (core nouns, ubiquitous language, cardinality/relationships, system-wide invariants).
- Keep `Summary`, `Core Model / Stages`, `Invariants & Rules`, and `Participating Features` as distinct output sections.
- Write all concept content in plain, non-technical domain and user-outcome language. Do **not** leak microscopic UI clicks/actor steps (which belong in `use-case.md`) or technology/framework selections (which belong in `tech-stack.md` or `roadmap.md`).
- Synchronize bi-directional links: every feature listed in `## Participating Features` must have a reciprocal link to this concept under `## Conceptual Context` in its `feature.md`, and `docs/product.md` must index the concept under `## Core Concepts & Macro-Flows`.

---

## Procedure

### 1. Target Concept Resolution
1. Read `.nyssa-ai/plan-product/config.json`, `paths.product`, `paths.features`, and `paths.conceptTemplate`.
2. Determine target concept:
   - User named ID (`C-nn`) or file: resolve under `structure.concepts.root` (or `paths.concepts`).
   - User named title: match against existing files in `structure.concepts.root`.
   - User requests new concept: scan existing `c-nn-*.md` files, select next sequential ID (`C-01`, `C-02`, ...), and derive path from `structure.concepts.pathPattern`.
3. Read existing concept files to check for overlapping domain definitions or contradictory invariants.

### 2. Concept Discovery & Boundary Pass
1. Interview for:
   - Concept archetype (`flow` for cross-feature lifecycles/stage progressions, or `domain-model` for core entities/relationships).
   - Plain-language summary (2–3 sentences).
   - Core model or stage progression (stages and handoff triggers for flows; entities, relationships, and hierarchy for domain models).
   - System-wide invariants and boundary rules that must hold across participating features.
   - Participating `F-gg.nn` features and each feature's role in the concept or flow.
2. Restate candidate concept with marked `[inferred]` fields for confirmation.
3. Boundary & contradiction check:
   - Ensure microscopic step-by-step UI interactions are deferred to `workflows/use-case.md`.
   - Ensure technical implementation details and stack choices are deferred to `docs/tech-stack.md`.
   - Stop and resolve contradictions if invariants conflict with existing concepts or feature guides.

### 3. File Generation & Cross-Link Synchronization
1. Read `paths.conceptTemplate` immediately before writing.
2. Write or update the concept file at `docs/concepts/c-nn-short-slug.md` (or configured path).
3. Update `paths.product` (`docs/product.md`):
   - Under `## Core Concepts & Macro-Flows`, add or update the relative link `- [C-nn: Title](concepts/c-nn-short-slug.md) — brief summary`.
4. Update each participating feature guide (`docs/features/f-gg.nn/feature.md`):
   - Under `## Conceptual Context`, replace `None.` or append `- [C-nn: Title](../../concepts/c-nn-short-slug.md) — role in this concept/flow`.

---

## Verification Checklist

- [ ] Path derived from `structure.concepts.pathPattern` without hardcoding.
- [ ] `paths.conceptTemplate` read immediately prior to write.
- [ ] Frontmatter contains valid `id: C-nn`, `type: flow` or `domain-model`, and `status`.
- [ ] No microscopic UI steps or technical stack selections leaked into the concept document.
- [ ] All participating feature links in `## Participating Features` resolve to existing feature guides.
- [ ] Reciprocal links updated under `## Conceptual Context` in each participating `feature.md`.
- [ ] Concept indexed under `## Core Concepts & Macro-Flows` in `paths.product`.
