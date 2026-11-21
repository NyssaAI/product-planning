# Configuration, 5-Root Paths & Script Resolution

> [!IMPORTANT] Scope Directive
> Reference specification for `plan-product` configuration layering, template resolution, 5-root `runtime_root` routing, opt-in telemetry, and deterministic script execution (`init.mjs`, `migrate.mjs`, `validate-docs.mjs`). It does NOT define planning workflow procedures (owned by `SKILL.md` and `references/workflow-*.md`).

---

## 1. Zero-Footprint Configuration Precedence

`plan-product` operates as a zero-footprint external plugin: consuming repositories do **not** require `.nyssa-ai/plan-product/` configs, schemas, or copied templates.

Configuration resolves in strict 3-layer precedence:
1. **Bundled defaults (`plugin_root`)**: `skills/plan-product/assets/config.json` (Model v2 `docs/` layout, validated against `skills/plan-product/assets/schema.json`).
2. **User override (`user_home`)**: Optional `~/.nyssa-ai/plan-product/config.json`.
3. **Repo override (`repo_root`)**: Optional opt-in `<repo_root>/.nyssa-ai/plan-product/config.json` (only when a repository intentionally deviates from standard `docs/`).

- Scalar and array values replace lower layers; omitted keys inherit; `null` resets to bundled defaults.
- Monorepo bounded-context units (`apps/<app>/`, `tools/<tool>/`) target `<unit>/docs/` via `--unit <rel-path>`.
- All committed output paths must remain `repo_root`-relative.

---

## 2. Template Resolution & Bundled Assets

Templates resolve in precedence without copying files into `repo_root`:
1. Existing repo-configured template (only if explicitly configured and present under `repo_root`)
2. User template: `~/.nyssa-ai/plan-product/templates/<name>.md`
3. Bundled template: `<skill-dir>/assets/templates/<name>.md`

Bundled assets shipped inside the skill directory (`<skill-dir>`):
- Defaults & schema: `assets/config.json`, `assets/schema.json`
- Templates (`assets/templates/`): `product.md`, `glossary.md`, `features.md`, `tech-stack.md`, `concept.md`, `feature.md`, `use-case.md`, `development-plan.md`

---

## 3. 5-Root `runtime_root` Resolution & Opt-In Telemetry

All mutable state (`usage/`) lives strictly under `runtime_root`, resolved in 4-step precedence:
1. Explicit `--runtime-root` CLI flag
2. `NYSSA_RUNTIME_ROOT` environment variable (namespaced to `<NYSSA_RUNTIME_ROOT>/.nyssa-ai/plan-product/runtime/` when pointing at a persona workspace)
3. Active persona `cwd` containing both `SOUL.md` and `IDENTITY.md` -> `<persona_cwd>/.nyssa-ai/plan-product/runtime/`
4. Layered `config.json` `runtimeRoot` (`user_home` -> `repo_root`), else `<repo_root>/.nyssa-ai/plan-product/runtime/` when `<repo_root>/.nyssa-ai/plan-product/` exists, else `~/.nyssa-ai/plan-product/runtime/`

Usage telemetry is strictly opt-in (`"telemetry": { "enabled": false }` by default). Zero `usage/` directories or files are created unless `telemetry.enabled === true`, in which case events append to `<runtime_root>/usage/events.jsonl`.

---

## 4. Deterministic Scripts & `${PLUGIN_ROOT}` Precedence

The skill bundle ships zero-dependency Node.js (>=22) scripts under `<skill-dir>/scripts/` (where `<skill-dir>` is the directory containing `SKILL.md`, i.e., `${PLUGIN_ROOT}/skills/plan-product`):

| Purpose | Invocation (from `repo_root`) | Notes |
| :--- | :--- | :--- |
| Bootstrap starter `docs/` | `node "<skill-dir>/scripts/init/init.mjs" [--unit <apps/...\|tools/...>]` | Pass `--write-config` only if user explicitly requests repo-local config. |
| Migrate v1 / legacy `roadmap.md` to v2 | `node "<skill-dir>/scripts/migration/migrate.mjs"` | Mechanical file/link upgrade; prunes copied stock schemas/templates. |
| Validate consumer `docs/` contracts | `node "<skill-dir>/scripts/validation/validate-docs.mjs"` | Verifies `docs/` lockdown, `status:`, `## Open Questions & Blockers`, naming, and links. |

When resolving `${PLUGIN_ROOT}` (`plugin_root`) externally, check in order:
1. `PLAN_PRODUCT_PLUGIN_ROOT`
2. `CLAUDE_PLUGIN_ROOT`
3. `CURSOR_PLUGIN_ROOT`
4. `PLUGIN_ROOT`
5. `.tessl/plugins/nyssa-ai/plan-product`
6. `~/.tessl/plugins/nyssa-ai/plan-product`
7. Relative path to the installed plugin directory

*(Contributor plugin checkouts maintain canonical sources for these scripts under top-level `src/`, synchronized into `skills/plan-product/scripts/` by `scripts/assemble.mjs`.)*
