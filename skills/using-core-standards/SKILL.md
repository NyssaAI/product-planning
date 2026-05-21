---
name: using-core-standards
description: Use when setting up project structure, designing error handling, configuring logging, writing tests, designing domain models, or handling workflow artifacts (bugs, backlog, acceptance tests) that should conform to language-agnostic standards.
---

# Using Core Standards

Follow **`../_shared/standards-discovery.md`** (Steps 1–3).

## Manifest filter

Entries whose `file` path has no subdirectory between `standards/` and the filename (matches `^standards/[^/]+\.md$`). That is the authoritative list of language-agnostic standards in this plugin.

## Examples

Building a new feature often pulls in `project-structure`, `error-handling`, `testing-principles`, and `logging` simultaneously.

## Interaction with technology-specific standards

Technology-specific skills (`using-dotnet-standards`, `using-nextjs-standards`, `using-postgres-standards`, `using-python-standards`) cover standards under `standards/<tech>/`. When a technology-specific standard declares `specializes: [...]` pointing at a core standard, the technology-specific version takes precedence for the topics it covers; the core standard still applies for topics the specific one does not address.
