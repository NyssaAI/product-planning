---
name: using-python-standards
description: Use when writing or reviewing Python code — project structure, bulk loads, data transformation, or logging patterns.
---

# Using Python Standards

## Step 1 — Discover

Read `manifest.json` at the plugin root. Filter to entries whose `file` path starts with `standards/python/`. That is the authoritative list of Python standards in this plugin.

## Step 2 — Select

Match the task against the `description` of each entry. Read the `.md` files relevant to what you are about to do. Multiple standards may apply (e.g., a new bulk-import module pulls both `bulk-load.md` and `data-transformation.md`).

For each selected standard, check its `specializes` array. Each listed key points at another manifest entry that this standard specializes. Read those `.md` files as well — they cover the general form of whatever the specific one refines.

## Step 3 — Apply

Treat standards as prescriptive, in order of specificity:

1. Python-specific standard — highest precedence for topics it covers.
2. Standards listed in its `specializes` array — apply to topics the specific one does not address.
3. Other root standards (cross-cutting) — always apply.

**Worked example — project structure:** `python/project-structure` specializes `project-structure`. When setting up a new Python project, the Python-specific layout rules (entry-point scripts at repo root, `src/` layout for implementation code, `requirements.txt` for dependencies, required per-file frontmatter documenting structure/purpose/IO) take precedence. The root `project-structure.md` still applies for language-agnostic rules (feature-folder organization, shared-models promotion rule) unless the Python-specific standard overrides them.

If your proposed code diverges from any standard, flag it and get user sign-off before proceeding.

## Cross-cutting

Standards in `standards/` without the `python/` prefix apply to all code regardless of language. Consult `using-core-standards` for those.
