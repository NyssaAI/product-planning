# dev-tools documentation

Documentation for the **dev-tools plugin repository**. Plugin overview docs follow `standards/project-structure.md` (`docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md`).

**User-facing install and platform guides:** [README.md](../README.md) (Claude Code, Cursor, Codex, OpenCode, Gemini).

## Plugin overview

| Doc | Purpose |
|-----|---------|
| [product.md](product.md) | What dev-tools is (PRD) |
| [roadmap.md](roadmap.md) | Maintenance and direction |
| [tech-stack.md](tech-stack.md) | This repo's stack and conventions |
| [standards.md](standards.md) | Bundled `standards/` layout for consumers |
| [testing.md](testing.md) | Skill eval and integration tests (`test/`) |

## Design and implementation

| Directory | Purpose |
|-----------|---------|
| [specs/](specs/) | Design specs (current) |
| [plans/](plans/) | Implementation plans (current) |

## Archive

| Directory | Purpose |
|-----------|---------|
| [archive/](archive/) | Superseded implementation plans |

## Maintainer-only (repo root)

| Path | Purpose |
|------|---------|
| `test/` | Skill triggering evals — not installed with the plugin |
| `scripts/bootstrap-templates/` | Files copied into consumer repos on `ai-plan --init` |
| [guides/windows/polyglot-hooks.md](guides/windows/polyglot-hooks.md) | Windows hook runner notes |

Root release docs: [CHANGELOG.md](../CHANGELOG.md), [RELEASE-NOTES.md](../RELEASE-NOTES.md).
