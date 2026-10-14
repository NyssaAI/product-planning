# Tech Stack

## Stack Summary

Markdown skill bundles and templates, JSON configuration and runtime manifests, and a small Node.js initializer.

## Languages and Runtimes

Node.js 22 or later; ECMAScript modules. No third-party runtime dependencies.

## Frameworks and Services

Host manifests support Claude Code, Codex, Cursor, and Gemini. Hosted Tessl evaluation is optional development tooling.

## Storage and Artifacts

Planning documents live in the target repository. `.plan-product/config.json` stores repo-relative paths and naming conventions. Templates are copied locally so users can customize document shape.

## Tooling

- `npm test`: local regression and package-contract tests.
- `npm run eval:prepare`: validate evaluation scenarios.
- `npm pack --dry-run`: inspect the release package.

## Constraints and Unknowns

Preserve existing documents and templates. Validate configured destinations before initialization writes. Never commit installation-specific absolute paths.
