# code-indexer documentation

Documentation for the **code-indexer plugin repository** — the code-indexer / code-map subsystem that
generates a code map, module graph, and per-module architecture context for AI agents.

**User-facing install and platform guides:** [README.md](../README.md) (Claude Code, Cursor,
Codex, Gemini).

## Plugin overview

| Doc | Purpose |
|-----|---------|
| [product.md](product.md) | What code-indexer is (PRD) |
| [roadmap.md](roadmap.md) | Maintenance and direction |
| [features.md](features.md) | Feature inventory (status table) |
| [tech-stack.md](tech-stack.md) | This repo's stack and conventions |

## Generated context (this repo dogfoods code-indexer)

| Path | Purpose |
|------|---------|
| [code-index/index.md](code-index/index.md) | Progressive-disclosure guide to the module set |
| [code-index/modules/](code-index/modules/) | Per-module architecture files |
| [code-index/module-map.json](code-index/module-map.json) | Module dependency graph |
| [code-index/code-map.json](code-index/code-map.json) | Symbol + endpoint index |

## Harness adapters (repo root)

The plugin ships one feature across four agent runtimes; each adapter points at the same
`skills/`, `commands/`, and `scripts/`:

| Runtime | Adapter |
|---------|---------|
| Claude Code | `.claude-plugin/plugin.json`, `CLAUDE.md` |
| Cursor | `.cursor-plugin/plugin.json` |
| Codex | `.codex/`, `AGENTS.md` |
| Gemini | `gemini-extension.json`, `GEMINI.md` → `AGENTS.md` |

## Maintainer-only (repo root)

| Path | Purpose |
|------|---------|
| `test/` | code-indexer + code-map tests — not installed with the plugin |
| `scripts/bootstrap-templates/` | Files copied into consumer repos on `code-indexer --init` |

Root release docs: [CHANGELOG.md](../CHANGELOG.md), [RELEASE-NOTES.md](../RELEASE-NOTES.md).
