# Workflow: Model Versioning & Document Maintenance

> [!IMPORTANT] Scope Directive
> This workflow upgrades, validates, and maintains product planning documents across schema/model versions. It encapsulates legacy Model v1 knowledge (`.plan-product/`, `F-Nxx`, `UC-nnn`, `R-NNN`, `phase:` frontmatter, singular `## Use Case`) and legacy pre-rename v2 artifacts (`docs/roadmap.md`, `R-pp.ss`, concept `type:` frontmatter, `.nyssa-ai/plan-product/usage/`), migrating repositories to canonical Model v2 (`.nyssa-ai/plan-product/`, `docs/GLOSSARY.md`, `F-gg.nn`, `UC-gg.nn.uu`, `docs/plans/development-plan.md`, `DP-pp.ss`, `group:` and `kind:` frontmatter, `.nyssa-ai/plan-product/runtime/usage/`). Deterministic file and link migrations are executed via `src/migration/migrate.mjs`.

---

## Operating Rules

- Preserve all user-authored document sections, local notes, and custom templates.
- Legacy Model v1 (`version: 1`) and legacy pre-rename artifacts handled by migration:
  - Legacy config directory: `.plan-product/`.
  - Feature IDs: `F-Nxx` (e.g. `F-001`, `F-101`, `F-301`) packed into single 3-digit integers in `docs/features/f-nxx/` with `phase: <number>` frontmatter and singular `## Use Case` heading.
  - Use case IDs and files: `UC-nnn` in `uc-nnn-short-slug.md`.
  - Legacy roadmap file & step IDs: `docs/roadmap.md` containing `R-NNN` (e.g. `R-001`) or `R-pp.ss` (e.g. `R-01.01`).
  - Legacy concept frontmatter: `type: flow` or `type: domain-model`.
  - Legacy telemetry directory: `.nyssa-ai/plan-product/usage/` outside `runtime_root`.
- Canonical Model v2 (`version: 2`) characteristics:
  - Path authority: `.nyssa-ai/plan-product/config.json` (with `user_home` -> `repo_root` lookup) and `docs/GLOSSARY.md` (`paths.glossary`).
  - Feature IDs: `F-gg.nn` (e.g. `F-00.01`, `F-01.01`, `F-03.01`), where `gg` is Feature Group and `nn` is Feature Number, in `docs/features/f-gg.nn/` with `group: "<gg>"` and distinct `## User Need` and `## Use Cases`.
  - Use case IDs and files: `UC-gg.nn.uu` in `uc-gg.nn.uu-short-slug.md`.
  - Concept frontmatter: `kind: flow` or `kind: domain-model` (**Concept Kind**).
  - Development Plan & Step IDs: `docs/plans/development-plan.md` with `DP-pp.ss` (e.g. `DP-01.01`), linking to `../features/...` and `../concepts/...`.
  - Runtime state: `.nyssa-ai/plan-product/runtime/usage/` under `runtime_root`.
- Deterministic execution: Run `node "${PLUGIN_ROOT}/src/migration/migrate.mjs"` from `repo_root` to perform mechanical transformations without manual search-and-replace.

---

## Procedure

### 1. Version Detection & Scope Inspection
1. Read `.nyssa-ai/plan-product/config.json` (or legacy `.plan-product/config.json`).
2. Inspect current planning documents under `repo_root`:
   - Check if config version is `1`, omitted, or still contains legacy `roadmap` keys.
   - Scan `docs/features/` for legacy `f-nxx` folders and `docs/concepts/` for `type:` frontmatter.
   - Scan `docs/features.md` for `F-Nxx` references and "Phase" feature grouping.
   - Check whether legacy `docs/roadmap.md` (`R-NNN` or `R-pp.ss`) or `.nyssa-ai/plan-product/usage/` exists.
3. Present migration summary to user:
   - List features, use cases, concepts, and development plan steps identified for migration.
   - Request confirmation before running migration.

### 2. Migration Execution
1. Run `node "${PLUGIN_ROOT}/src/migration/migrate.mjs"` from `repo_root` (resolving `${PLUGIN_ROOT}` in order of precedence: `PLAN_PRODUCT_PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, `PLUGIN_ROOT`, or relative path to installed plugin).
2. The migrator deterministically:
   - Relocates `.plan-product/` -> `.nyssa-ai/plan-product/`, relocates `.nyssa-ai/plan-product/usage/` -> `.nyssa-ai/plan-product/runtime/usage/`, and updates `config.json` to `version: 2` with canonical `developmentPlan` and `glossary` paths.
   - Upgrades unmodified bundled templates and seeds `docs/GLOSSARY.md` if missing.
   - Renames feature directories from `f-nxx` to `f-gg.nn` and use case files from `uc-nnn-*` to `uc-gg.nn.uu-*`.
   - Normalizes feature frontmatter (`phase:` -> `group:`), headings, and concept frontmatter (`type:` -> `kind:`).
   - Moves `docs/roadmap.md` -> `docs/plans/development-plan.md`, maps `R-NNN` and `R-pp.ss` steps to `DP-pp.ss`, and rewrites relative Markdown links (`features/...` -> `../features/...`, `concepts/...` -> `../concepts/...`).

### 3. Post-Migration Verification & Consistency Check
1. Verify all renamed feature guides, use cases, concepts, `docs/GLOSSARY.md`, and `docs/plans/development-plan.md` exist at their canonical paths.
2. Confirm `docs/features.md` is organized by Feature Groups, uses non-technical use-case language for the user, has no links in `## Feature Checklist Summary`, and includes valid relative links in `## Feature Inventory`.
3. Confirm `docs/plans/development-plan.md` step links (`DP-pp.ss`) resolve to real targets.
4. Report completed migration details to the user.

---

## Verification Checklist

- [ ] `.nyssa-ai/plan-product/config.json` set to `version: 2` with `glossary` and `developmentPlan` path patterns.
- [ ] `docs/GLOSSARY.md` exists and templates under `.nyssa-ai/plan-product/templates/` include `glossary.md` and `development-plan.md`.
- [ ] All `f-nxx` directories cleanly renamed to `f-gg.nn` and use case files renamed to `uc-gg.nn.uu-*` with matching frontmatter IDs.
- [ ] Feature frontmatter contains `group:` (no `phase:`) and concept frontmatter contains `kind:` (no `type:`).
- [ ] `docs/features.md` organized by Feature Groups in non-technical, use-case language with no links in `## Feature Checklist Summary` and valid relative links in `## Feature Inventory`.
- [ ] `docs/plans/development-plan.md` migrated with `DP-pp.ss` IDs and valid `../features/...` / `../concepts/...` relative links (no leftover `docs/roadmap.md`).
- [ ] Zero broken relative links across planning documents.
- [ ] User-authored content, local notes, and custom templates preserved.
