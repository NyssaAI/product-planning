# Ubiquitous Language Glossary

> [!IMPORTANT] Scope Directive
> Canonical domain vocabulary, identifier taxonomy, 5-root filesystem boundaries, and retired synonyms for `plan-product`. All workflows, commands, templates, `src/` modules, tests, and documentation MUST use these exact terms (`ARCH-NAME`).

---

## Canonical Domain Terms

### Ecosystem 5-Root Taxonomy & Host Packaging

| Canonical Term | Code / Config Identifier | Definition |
| :--- | :--- | :--- |
| **`repo_root`** | `repoRoot` / `--repo-root` | Target git repository or monorepo root containing `<repo_root>/.nyssa-ai/plan-product/` and `docs/`. All committed planning paths are `repo_root`-relative. |
| **`user_home`** | `userHome` / `~/.nyssa-ai/plan-product/` | Per-OS-account configuration root (`~/.nyssa-ai/plan-product/config.json`). Configuration lookup resolves `user_home` defaults first, overridden by `repo_root` (`<repo_root>/.nyssa-ai/plan-product/config.json`), including optional `runtimeRoot` and `telemetry.enabled`. |
| **`runtime_root`** | `runtimeRoot` / `--runtime-root` / `NYSSA_RUNTIME_ROOT` | Mutable agent execution state and opt-in usage telemetry root, resolved via the 4-step precedence contract: (1) `--runtime-root` -> (2) `NYSSA_RUNTIME_ROOT` (namespaced to `<NYSSA_RUNTIME_ROOT>/.nyssa-ai/plan-product/runtime/` when `SOUL.md` and `IDENTITY.md` are present) -> (3) `<persona_cwd>/.nyssa-ai/plan-product/runtime/` when `cwd` contains both `SOUL.md` and `IDENTITY.md` -> (4) layered `config.json` `runtimeRoot` (`user_home` -> `repo_root`), `<repo_root>/.nyssa-ai/plan-product/runtime/`, or `~/.nyssa-ai/plan-product/runtime/`. Opt-in usage telemetry (`telemetry.enabled === true`, default `false`) writes strictly to `<runtime_root>/usage/events.jsonl` and creates zero `usage/` directories or files when disabled. |
| **`plugin_root`** | `pluginRoot` / `PLUGIN_ROOT` / `PLAN_PRODUCT_PLUGIN_ROOT` | Read-only installed `plan-product` plugin directory providing `skills/plan-product/assets/`, `commands/`, and `src/` entrypoints. Never mutated at runtime. |
| **`vault_root`** | `vaultRoot` | Shared user work-product vault root in sibling plugins; never read or mutated by `plan-product`. |
| **`harness-adapter`** | `.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `.tessl-plugin/`, `gemini-extension.json` | Host-specific manifest projection generated deterministically from canonical `plugin.json` and `skills/plan-product/` by `scripts/assemble.mjs`. |

### Planning Artifacts, Identifiers & Preservation Rules

| Canonical Term | Pattern / Values | Definition |
| :--- | :--- | :--- |
| **`Product Vision`** | `docs/product.md` (`paths.product`) | High-level non-technical product capsule capturing purpose, audience, core problem, solution shape, boundaries, success signals, and core concepts. |
| **`Feature Group (gg)`** | `00`–`99` (`00` = Foundation) | Two-digit functional domain cluster grouping cohesive capabilities in `docs/features.md` regardless of technical build order. |
| **`Feature ID (F-gg.nn)`** | `F-gg.nn` (e.g., `F-01.02`) | Stable capability identifier pairing two-digit `Feature Group (gg)` and sequential two-digit feature number (`nn`) at `docs/features/f-gg.nn/feature.md`. |
| **`Use Case ID (UC-gg.nn.uu)`** | `UC-gg.nn.uu` (e.g., `UC-01.02.01`) | Sequential actor workflow identifier (`uu`) inheriting its parent `Feature ID` prefix (`gg.nn`) at `docs/features/f-gg.nn/uc-gg.nn.uu-short-slug.md`. |
| **`Concept ID (C-nn)`** | `C-nn` (e.g., `C-01`) | Sequential identifier (`01`–`99`) for an atomic domain model or cross-feature macro-flow at `docs/concepts/c-nn-short-slug.md`. |
| **`Concept Kind`** | `domain-model` \| `flow` | Required `kind:` frontmatter discriminator on every `concept.md` file classifying an atomic entity/relationship model (`domain-model`) versus a cross-feature stage progression (`flow`). Never named `*Type`. |
| **`Development Plan`** | `docs/plans/development-plan.md` (`paths.developmentPlan`) | Dependency-ordered phased technical delivery sequence linking steps to `UC-gg.nn.uu` use cases (or `F-gg.nn` fallback) with observable `- Verify:` checkpoints and `dev-delivery` handoffs (`docs/plans/dp-pp.ss-<slug>.md`). |
| **`Development Plan Step ID (DP-pp.ss)`** | `DP-pp.ss` (e.g., `DP-01.03`) | Immutable step identifier pairing two-digit delivery phase (`pp`) and step (`ss`) in `docs/plans/development-plan.md`. Never renumbered; document order defines execution sequence. |
| **`Merge-by-Heading Preservation`** | Section-level merge | Non-destructive update rule that modifies only targeted Markdown headings while preserving unmatched user sections, comments, links, and local notes. |
| **`Template-Only Detection`** | Byte-identical comparison | Rule classifying any planning document whose bytes match its configured template in `.nyssa-ai/plan-product/templates/` as unedited starter scaffolding safe to populate directly from a confirmed interview. |

---

## Banned Synonyms & Drift

| Banned / Retired Term | Use Instead | Reason |
| :--- | :--- | :--- |
| `targetRoot`, `<target-repo>`, `<project-root>` | `repo_root` (`repoRoot`) | Unified 5-root filesystem vocabulary across all NyssaAI plugins. |
| `bundle` (for host manifest outputs) | `harness-adapter` | Distinguishes host manifest projections from runtime source modules. |
| `docs/roadmap.md`, `R-pp.ss`, `R-NNN`, `/plan-roadmap`, `paths.roadmap` | `docs/plans/development-plan.md`, `DP-pp.ss`, `/plan-development`, `paths.developmentPlan` | Unifies planning artifacts under `docs/plans/` and pairs cleanly with `dev-delivery` `docs/plans/dp-pp.ss-<slug>.md` implementation plans. |
| `Concept Type`, `type:` (in `concept.md`), `*Type` | `Concept Kind`, `kind:` (`domain-model` \| `flow`) | Eliminates ambiguous `*Type` naming in domain record classifications. |
| `.plan-product/` | `.nyssa-ai/plan-product/` | Legacy Model v1 config directory; upgraded via `src/migration/migrate.mjs`. |
| `.nyssa-ai/plan-product/usage/` | `<runtime_root>/usage/` (`.nyssa-ai/plan-product/runtime/usage/`) | Mutable telemetry must never mix with committed configuration and templates. |
| *Surgical*, *Storage*, *Ingestion*, *Syndication* (in feature titles) | User-outcome action & safeguard titles (*Canonical* is permitted) | Keeps feature titles readable by non-technical stakeholders without developer plumbing jargon. |
