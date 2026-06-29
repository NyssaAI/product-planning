# Roadmap

dev-tools is maintained by jamaynor as a multi-platform **ai-plan** code/module-graph generator
(skill + `/ai-plan` command + generators), supported across Claude Code, Cursor, Codex, OpenCode,
and Gemini.

## Recent direction

- Slimmed the plugin to the ai-plan / code-map subsystem — removed the broader workflow skills,
  the bundled standards, and the hooks (v7.0.0)

## Conventions

- Generated context: `docs/agent-plan/context/`
- Tests directory: `test/` (ai-plan + code-map; not shipped to end users)
- Plugin docs: `docs/product.md`, `docs/roadmap.md`, `docs/features.md`, `docs/tech-stack.md`

## Maintenance

Keep the generators repository-agnostic and the five harness adapters in sync.
