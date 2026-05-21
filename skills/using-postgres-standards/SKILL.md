---
name: using-postgres-standards
description: Use when writing or reviewing PostgreSQL — functions, staging tables, schemas, audit/metrics, logging, or SQL formatting.
---

# Using PostgreSQL Standards

Follow **`../_shared/standards-discovery.md`** (Steps 1–3), including technology-specific precedence.

## Manifest filter

Entries whose `file` path starts with `standards/postgres/`.

## Examples

A new resolve function in a staging pipeline pulls `resolve-function.md`, `staging-table.md`, and `sql-formatting.md`.

**Worked example — logging:** `postgres/logging-and-commenting` specializes both `logging` and `code-commenting`. Postgres-specific rules (`RAISE NOTICE`, `COMMENT ON FUNCTION`) override generic logging/commenting for SQL. Anything not addressed in the specific standard still applies from the core standards.

## Cross-cutting

Standards in `standards/` without the `postgres/` prefix apply to all code regardless of language. Consult `using-core-standards` for those.
