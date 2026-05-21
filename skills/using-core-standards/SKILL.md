---
name: using-core-standards
description: Use when setting up project structure, designing error handling, configuring logging, writing tests, designing domain models, or handling workflow artifacts (bugs, backlog, acceptance tests) that should conform to language-agnostic standards.
---

# Using Core Standards

## Step 1 — Discover

Read `manifest.json` at the plugin root. Filter to entries whose `file` path has no subdirectory between `standards/` and the filename (i.e., matches `^standards/[^/]+\.md$`). That is the authoritative list of language-agnostic standards in this plugin.

## Step 2 — Select

Match the task against the `description` of each entry. Read the `.md` files relevant to what you are about to do. Multiple standards may apply (e.g., building a new feature often pulls in `project-structure`, `error-handling`, `testing-principles`, and `logging` simultaneously).

## Step 3 — Apply

Treat each selected standard as prescriptive. If your proposed work diverges from a standard, flag it and get user sign-off before proceeding.

## Interaction with technology-specific standards

Technology-specific skills (`using-dotnet-standards`, `using-nextjs-standards`, `using-postgres-standards`, `using-python-standards`) cover standards under `standards/<tech>/`. When a technology-specific standard declares `specializes: [...]` pointing at a core standard, the technology-specific version takes precedence for the topics it covers; the core standard still applies for topics the specific one does not address.
