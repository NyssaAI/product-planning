# Tech Stack

## Core Services

- Configuration: `.plan-product/config.json` is the repo-relative path contract; committed config must not contain machine-specific absolute paths.
- Secrets: plan-product should not store credentials, API keys, or local install secrets in committed files.
- Logging: Prefer explicit command output and validation summaries; avoid writing local absolute paths into generated artifacts.
- Observability and health: plan-product should expose clear validation/audit results for missing files, stale paths, malformed config, generated context health, and local usage/effectiveness signals.
- Error handling: Missing or incomplete product artifacts should produce actionable messages, not silent fallbacks.
- Security and access: plan-product owns local repo artifacts only; it does not manage external auth, authorization, or secret storage.
- Persistence and recovery: Markdown and JSON files are the source of truth and should be recoverable through normal git history.
- Background work: No background services are required for the first version.
- Integrations: plan-product can read upstream strategy and concept files when present, but `.plan-product/config.json` should only contain plan-product-owned paths.
- Testing and quality: Validate JSON config/schema, path conventions, feature-link resolution, generated code-map output, and skill metadata.
- Deployment and release: Ship as a lightweight plugin skill/script workflow with no external service dependency.

## Runtime

| Technology | Purpose |
|------------|---------|
| Node.js | plan-product code-map, module-map, bootstrap, and validation scripts. |
| npm | Package metadata, dependency installation, and test execution. |
| @ast-grep/cli | Bundled plugin dependency that powers structural code-map scans; it is not installed into consumer repos. |
| Markdown | Product docs, feature guides, use cases, skill definitions, and generated module/context files. |
| JSON | plan-product config, schema, generated code-map artifacts, module graph artifacts, and local usage event logs. |
| Bash / PowerShell | Cross-platform install and helper scripts. |

## Supported Agent Runtimes

| Runtime | plan-product surface |
|---------|-------------------------|
| Codex | Native plugin skills under `skills/`. |
| Claude Code | Plugin and command-capable runtime docs. |
| Cursor | Plugin manifest, rules, and command-capable runtime docs. |
| Gemini | Extension metadata and shared docs. |

## Data Formats

- Markdown for human-readable product artifacts.
- JSON for machine-readable config, schema, code maps, module maps, and usage events.
- Repo-relative paths for committed config.

## Tooling

- `npm test` for the JavaScript test suite.
- `rg` for path and artifact audits.
- `.plan-product/config.json` for plan-product path resolution.
- `.jamaynor/plan-product/config.json` is the optional generator settings file for roots, module overrides, and scan behavior.
- `.plan-product/usage/events.jsonl` for local usage capture; `docs/code-map/effectiveness.md` for generated effectiveness summaries.

## Constraints

Committed plan-product paths must remain portable. Absolute machine paths, installed plugin cache paths, and user-specific workspace roots do not belong in committed plan-product config.
