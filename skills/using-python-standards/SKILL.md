---
name: using-python-standards
description: Use when writing or reviewing Python code — project structure, bulk loads, data transformation, or logging patterns.
---

# Using Python Standards

Follow **`../_shared/standards-discovery.md`** (Steps 1–3), including technology-specific precedence.

## Manifest filter

Entries whose `file` path starts with `standards/python/`.

## Examples

A new bulk-import module pulls both `bulk-load.md` and `data-transformation.md`.

**Worked example — project structure:** `python/project-structure` specializes `project-structure`. Python-specific layout rules (`src/` layout, `requirements.txt`, per-file frontmatter) take precedence. Root `project-structure.md` still applies for language-agnostic rules unless the Python standard overrides them.

## Cross-cutting

Standards in `standards/` without the `python/` prefix apply to all code regardless of language. Consult `using-core-standards` for those.
