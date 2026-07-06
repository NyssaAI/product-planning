# plan-product - Project Notes

Same content as `CLAUDE.md` (Claude Code reads `CLAUDE.md`; Codex/Gemini read this file).

This is the plan-product plugin source. It owns product, feature, use-case, and code-map planning skills plus the generator scripts under `scripts/`.

## Capabilities

- `plan-product` - create or update `docs/product.md`, `docs/features.md`, and `docs/tech-stack.md`.
- `plan-feature` - create or update `docs/features/f-nxx/feature.md`.
- `plan-use-case` - create or update use-case files beside a feature guide.
- `map-code` - refresh symbol, endpoint, module, and module-doc context.
- `map-architecture` - generate the system architecture handoff.
- `find-code-patterns` - generate structural pattern reports.
- `using-code-map` - load generated code-map context with progressive disclosure.

## Dependencies

The plugin ships one bundled runtime dependency: `@ast-grep/cli` for code-map generation. Avoid adding more third-party dependencies unless a new runtime adapter truly needs them.

## Required Structure

Committed plan-product paths stay relative to the repo root. Installation-specific locations belong in environment variables or ignored local config, not in `.plan-product/config.json`.

```text
<repo>/
|-- STRATEGY.md             Optional upstream strategy context.
|-- CONCEPTS.md             Optional shared vocabulary.
|-- AGENTS.md               Agent instructions and repo conventions.
|
|-- docs/
|   |-- product.md          Product purpose, audience, problem, solution.
|   |-- features.md         Feature inventory, status, phases, links.
|   |-- tech-stack.md       Stack, services, tools, runtime assumptions.
|   |-- features/           Feature guides and use cases.
|   |-- code-map/           Generated code-map artifacts.
|   |-- plans/              Compound Engineering implementation plans.
|   `-- solutions/          Compound Engineering captured learnings.
|
|-- .plan-product/
|   |-- config.json         plan-product path map; repo-relative.
|   |-- schema.json         Config schema.
|   `-- templates/          Starter plan-product artifacts.
|-- scripts/                Plugin generators and support code.
|-- skills/                 Codex skill entrypoints.
|-- commands/               Command-capable runtime docs.
`-- test/                   Tests.
```

## Generated Context

The code-map implementation still uses stable internal script folders under `scripts/code-map/` and `scripts/module-map/`. The exposed skills and command docs use plan-product names.

<!-- plan-product:module-map:start -->
## Module map (auto-updated — do not edit)

Start at `docs/code-map/index.md` to pick the module set.

| Module | What it does | Owns | Module file |
|--------|--------------|------|-------------|
| module-map | Module-graph generator: module discovery, enrichment, rendering, doctor, and bootstrap. | Feature code and services under `scripts/module-map/` | `docs/code-map/modules/module-map.md` |
| code-map | ast-grep-based symbol and endpoint indexer that feeds the module graph. | Feature code and services under `scripts/code-map/` | `docs/code-map/modules/code-map.md` |
| lib | Shared utilities for both generators: plugin-root resolution, ast-grep resolution, skip-dirs, scan parsing. | Feature code and services under `scripts/lib/` | `docs/code-map/modules/lib.md` |
<!-- plan-product:module-map generated 2026-07-06T12:33:31.650Z -->
<!-- plan-product:module-map:end -->
