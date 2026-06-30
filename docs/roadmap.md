# Roadmap

code-indexer is maintained by jamaynor as a multi-platform **code-indexer** code/module-graph generator
(skill + `/ci` command + generators), supported across Claude Code, Cursor, Codex,
and Gemini.

## Recent direction

- Added `/ci arch` for optional system-level architecture handoffs generated from `module-map.json`
  with a preserved agent-authored overview region.
- Added `/ci patterns` for optional structural pattern coverage reports generated from bundled and
  repo-configured JSON ast-grep catalogs.
- Slimmed the plugin to the code-indexer / code-map subsystem - removed the broader workflow skills,
  the bundled standards, and the hooks (v7.0.0).

## Conventions

- Generated context: `docs/code-index/`
- Tests directory: `test/` (code-indexer + code-map; not shipped to end users)
- Plugin docs: `docs/product.md`, `docs/roadmap.md`, `docs/features.md`, `docs/tech-stack.md`

## Maintenance

Keep the generators repository-agnostic and the four harness adapters in sync.
