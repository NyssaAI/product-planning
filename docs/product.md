# plan-product

## Purpose

plan-product keeps product intent, feature definitions, stack assumptions, and product-oriented code context in a compact repo-local structure that agents can read before planning or implementation work.

## Audience

The primary users are repository owners and coding agents that need a stable product planning layer without hunting through scattered docs.

## Problem

Product docs often drift across tool-specific folders, generated context, and planning notes. That makes it hard for agents to know which files are canonical and which paths should adapt across installations.

## Solution

plan-product defines a small `docs/`-first documentation contract and a repo-relative path map in `.plan-product/config.json`.

Canonical product docs live in:

- `docs/product.md`
- `docs/features.md`
- `docs/tech-stack.md`

Feature detail files and product-oriented code-map artifacts live under `docs/features/` and `docs/code-map/`.

## Code-Map Foundation

plan-product includes the existing code-map and module-map generators as implementation-planning support. Those generators scan a repository and produce scoped planning context: a symbol and endpoint index, a module graph, and per-module architecture files.

Agents should use the generated code-map context only after selecting the relevant product feature or use case.

## Boundaries

plan-product owns product planning artifacts and product-oriented code mapping. It does not own external plugin installation roots, machine-specific absolute paths, secret storage, or another tool's local runtime cache.

## Features

The feature inventory, build order, carried-forward code-map capabilities, and detailed feature guide links are maintained in `docs/features.md` and `docs/features/`.

## Tech Stack

Runtime, framework, storage, tooling, and environment assumptions are maintained in `docs/tech-stack.md`.

## Success

- Canonical product files are under `docs/`.
- plan-product paths are repo-relative and portable.
- Feature details are easy to find from `docs/features.md`.
- Existing code-map capabilities remain visible while the plan-product workflow is simplified.
- Code context can be regenerated without hardcoded local paths.
