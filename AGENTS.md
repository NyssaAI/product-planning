# code-indexer — Project Notes

Same content as **CLAUDE.md** (Claude Code reads CLAUDE.md; Codex/Gemini read this file).

This is the **code-indexer plugin** source — the code-indexer / code-map generators (under `scripts/`), the `using-code-indexer` skill, the `/code-indexer` command, and the per-harness adapters. A private repo.

## Dependencies

code-indexer ships one bundled plugin dependency: **`@ast-grep/cli`** for code-indexer/code-map (auto-installs into the plugin root on first use). Avoid adding further third-party dependencies unless adding support for a new harness (e.g., a new IDE or CLI tool); other external tools or services belong in their own plugin.

## Plugin repo layout

This repository is the **code-indexer plugin** (code-indexer/code-map generators under `scripts/`, the `using-code-indexer` skill, the `/code-indexer` command, and harness adapters) — not a consumer application repo, but it carries `docs/product.md`, `docs/roadmap.md`, and `docs/tech-stack.md` because it dogfoods its own code-indexer generation. Do not scaffold consumer-repo `src/` trees or backlog folders here.

## Bundled content

**code-indexer** (the code/module-graph generator) is the plugin's product. Optional `@ast-grep/cli` in the plugin root supports its code-map generation.

<!-- code-indexer:module-map:start -->
## Module map (auto-updated — do not edit)

Start at `docs/code-index/index.md` to pick the module set.

| Module | What it does | Owns | Module file |
|--------|--------------|------|-------------|
| code-indexer | Code/module-graph generator: module discovery, enrichment, rendering, doctor, and bootstrap. | Feature code and services under `scripts/module-map/` | `docs/code-index/modules/code-indexer.md` |
| code-map | ast-grep-based symbol and endpoint indexer that feeds the module graph. | Feature code and services under `scripts/code-map/` | `docs/code-index/modules/code-map.md` |
| lib | Shared utilities for both generators: plugin-root resolution, ast-grep resolution, skip-dirs, scan parsing. | Feature code and services under `scripts/lib/` | `docs/code-index/modules/lib.md` |
<!-- code-indexer:module-map generated 2026-06-29T14:09:31.280Z -->
<!-- code-indexer:module-map:end -->

<!-- code-index:module-map:start -->
## Module map (auto-updated — do not edit)

Start at `docs/code-index/index.md` to pick the module set.

| Module | What it does | Owns | Module file |
|--------|--------------|------|-------------|
| module-map | Module-graph generator: module discovery, enrichment, rendering, doctor, and bootstrap. | Feature code and services under `scripts/module-map/` | `docs/code-index/modules/module-map.md` |
| code-map | ast-grep-based symbol and endpoint indexer that feeds the module graph. | Feature code and services under `scripts/code-map/` | `docs/code-index/modules/code-map.md` |
| lib | Shared utilities for both generators: plugin-root resolution, ast-grep resolution, skip-dirs, scan parsing. | Feature code and services under `scripts/lib/` | `docs/code-index/modules/lib.md` |
<!-- code-index:module-map generated 2026-06-29T20:19:28.718Z -->
<!-- code-index:module-map:end -->
