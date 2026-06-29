# dev-tools — Project Notes

Same content as **CLAUDE.md** (Claude Code reads CLAUDE.md; Codex/OpenCode/Gemini read this file).

This is the **dev-tools plugin** source — the ai-plan / code-map generators (under `scripts/`), the `using-ai-plan` skill, the `/ai-plan` command, and the per-harness adapters. A private repo.

## Dependencies

dev-tools ships one bundled plugin dependency: **`@ast-grep/cli`** for ai-plan/code-map (auto-installs into the plugin root on first use). Avoid adding further third-party dependencies unless adding support for a new harness (e.g., a new IDE or CLI tool); other external tools or services belong in their own plugin.

## Plugin repo layout

This repository is the **dev-tools plugin** (ai-plan/code-map generators under `scripts/`, the `using-ai-plan` skill, the `/ai-plan` command, and harness adapters) — not a consumer application repo, but it carries `docs/product.md`, `docs/roadmap.md`, and `docs/tech-stack.md` because it dogfoods its own ai-plan generation. Do not scaffold consumer-repo `src/` trees or backlog folders here.

## Bundled content

**ai-plan** (the code/module-graph generator) is the plugin's product. Optional `@ast-grep/cli` in the plugin root supports its code-map generation.

<!-- ai-plan:module-map:start -->
## Module map (auto-updated — do not edit)

Start at `docs/agent-plan/context/index.md` to pick the module set.

| Module | What it does | Owns | Module file |
|--------|--------------|------|-------------|
| ai-plan | Code/module-graph generator: module discovery, enrichment, rendering, doctor, and bootstrap. | Feature code and services under `scripts/ai-plan/` | `docs/agent-plan/context/modules/ai-plan.md` |
| code-map | ast-grep-based symbol and endpoint indexer that feeds the module graph. | Feature code and services under `scripts/code-map/` | `docs/agent-plan/context/modules/code-map.md` |
| lib | Shared utilities for both generators: plugin-root resolution, ast-grep resolution, skip-dirs, scan parsing. | Feature code and services under `scripts/lib/` | `docs/agent-plan/context/modules/lib.md` |
<!-- ai-plan:module-map generated 2026-06-29T14:09:31.280Z -->
<!-- ai-plan:module-map:end -->
