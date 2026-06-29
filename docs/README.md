# dev-tools documentation

Documentation for the **dev-tools plugin repository** — the ai-plan / code-map subsystem that
generates a code map, module graph, and per-module architecture context for AI agents.

**User-facing install and platform guides:** [README.md](../README.md) (Claude Code, Cursor,
Codex, OpenCode, Gemini).

## Plugin overview

| Doc | Purpose |
|-----|---------|
| [product.md](product.md) | What dev-tools is (PRD) |
| [roadmap.md](roadmap.md) | Maintenance and direction |
| [features.md](features.md) | Feature inventory (status table) |
| [tech-stack.md](tech-stack.md) | This repo's stack and conventions |
| [testing.md](testing.md) | The `test/` suite (ai-plan + code-map) |

## Design and implementation

| Directory | Purpose |
|-----------|---------|
| [agent-plan/context/](agent-plan/context/) | Generated ai-plan context for this repo (module map, code map, module files) |
| [agent-plan/plans/](agent-plan/plans/) | Implementation plans |
| [agent-plan/specs/](agent-plan/specs/) | Design specs |

## Harness adapters (repo root)

The plugin ships one feature across five agent runtimes; each adapter points at the same
`skills/`, `commands/`, and `scripts/`:

| Runtime | Adapter |
|---------|---------|
| Claude Code | `.claude-plugin/plugin.json`, `CLAUDE.md` |
| Cursor | `.cursor-plugin/plugin.json` |
| Codex | `.codex/`, `AGENTS.md` |
| OpenCode | `.opencode/`, `AGENTS.md` |
| Gemini | `gemini-extension.json`, `GEMINI.md` → `AGENTS.md` |

## Maintainer-only (repo root)

| Path | Purpose |
|------|---------|
| `test/` | ai-plan + code-map tests — not installed with the plugin |
| `scripts/bootstrap-templates/` | Files copied into consumer repos on `ai-plan --init` |

Root release docs: [CHANGELOG.md](../CHANGELOG.md), [RELEASE-NOTES.md](../RELEASE-NOTES.md).
