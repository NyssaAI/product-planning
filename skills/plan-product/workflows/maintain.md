# Workflow: Model Versioning & Document Maintenance

> [!IMPORTANT] Scope Directive
> This workflow upgrades, validates, and maintains product planning documents across schema/model versions. It encapsulates legacy Model v1 knowledge (`F-Nxx`, `UC-nnn`, `R-NNN`, `phase:` frontmatter, singular `## Use Case`) and migrates repositories to canonical Model v2 (`F-gg.nn`, `UC-gg.nn.uu`, `R-pp.ss`, `group:` frontmatter). Deterministic file and link migrations are executed via `scripts/migrate.mjs`.

---

## Operating Rules

- Preserve all user-authored document sections, local notes, and custom templates.
- Model v1 (`version: 1`) characteristics:
  - Feature IDs: `F-Nxx` (e.g. `F-001`, `F-101`, `F-301`) packed into single 3-digit integers.
  - Feature directories: `docs/features/f-nxx/`.
  - Feature frontmatter: `phase: <number>`.
  - Use case IDs and files: `UC-nnn` in `uc-nnn-short-slug.md`.
  - Roadmap step IDs: `R-NNN` (e.g. `R-001`).
  - Legacy headings: singular `## Use Case` heading instead of `## User Need` and `## Use Cases`.
- Model v2 (`version: 2`) characteristics:
  - Feature IDs: `F-gg.nn` (e.g. `F-00.01`, `F-01.01`, `F-03.01`), where `gg` is Feature Group and `nn` is Feature Number.
  - Feature directories: `docs/features/f-gg.nn/`.
  - Feature frontmatter: `group: "<gg>"`.
  - Use case IDs and files: `UC-gg.nn.uu` in `uc-gg.nn.uu-short-slug.md`.
  - Roadmap step IDs: `R-pp.ss` (e.g. `R-01.01`), where `pp` is Phase and `ss` is Step, linking to `UC-gg.nn.uu` (or `F-gg.nn` fallback).
  - Standard headings: distinct `## User Need` and `## Use Cases`.
- Deterministic execution: Run `node "${PLUGIN_ROOT}/scripts/migrate.mjs"` from the target repository root to perform mechanical transformations without manual search-and-replace.

---

## Procedure

### 1. Version Detection & Scope Inspection
1. Read `.nyssa-ai/plan-product/config.json`.
2. Inspect current planning documents:
   - Check if config version is `1` or omitted.
   - Scan `docs/features/` for legacy `f-nxx` folders.
   - Scan `docs/features.md` for `F-Nxx` references and "Phase" feature grouping.
   - Scan `docs/roadmap.md` for `R-NNN` slices.
3. Present migration summary to user:
   - List features, use cases, and roadmap steps identified for migration.
   - Request confirmation before running migration.

### 2. Migration Execution
1. Run `node "${PLUGIN_ROOT}/scripts/migrate.mjs"` (resolving `${PLUGIN_ROOT}` in order of precedence: `PLAN_PRODUCT_PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, `PLUGIN_ROOT`, or relative path to installed plugin).
2. The migrator deterministically:
   - Updates `.nyssa-ai/plan-product/config.json` to `version: 2` with v2 patterns.
   - Upgrades bundled templates to v2 format.
   - Renames feature directories from `f-nxx` to `f-gg.nn`.
   - Renames use case files from `uc-nnn-*` to `uc-gg.nn.uu-*`.
   - Normalizes feature frontmatter (`phase:` -> `group:`) and headings.
   - Rewrites Markdown links across `docs/features.md`, feature guides, use cases, and `docs/roadmap.md`.
   - Maps roadmap slices `R-NNN` to steps `R-pp.ss`.

### 3. Post-Migration Verification & Consistency Check
1. Verify all renamed feature guides and use cases exist at their new paths.
2. Confirm `docs/features.md` is organized by Feature Groups, uses non-technical use-case language for the user, has no links in `## Feature Checklist Summary`, and includes valid relative links in `## Feature Inventory`.
3. Confirm `docs/roadmap.md` step links resolve to real targets.
4. Report completed migration details to the user.

---

## Verification Checklist

- [ ] `.nyssa-ai/plan-product/config.json` set to `version: 2` with v2 path patterns.
- [ ] All `f-nxx` directories cleanly renamed to `f-gg.nn`.
- [ ] All use case files renamed to `uc-gg.nn.uu-*` with matching frontmatter IDs.
- [ ] Feature frontmatter contains `group:` with no legacy `phase:` remaining.
- [ ] `docs/features.md` organized by Feature Groups in non-technical, use-case language with no links in `## Feature Checklist Summary` and valid relative links in `## Feature Inventory`.
- [ ] `docs/roadmap.md` updated to `R-pp.ss` with valid links to use cases and features.
- [ ] Zero broken relative links across planning documents.
- [ ] User-authored content, local notes, and custom templates preserved.
