---
name: using-postgres-standards
description: Use when writing or reviewing PostgreSQL — functions, staging tables, schemas, audit/metrics, logging, or SQL formatting.
---

# Using PostgreSQL Standards

## Step 1 — Discover

Read `manifest.json` at the plugin root. Filter to entries whose `file` path starts with `standards/postgres/`. That is the authoritative list of PostgreSQL standards in this plugin.

## Step 2 — Select

Match the task against the `description` of each entry. Read the `.md` files relevant to what you are about to do. Multiple standards may apply (e.g., a new resolve function in a staging pipeline pulls `resolve-function.md`, `staging-table.md`, and `sql-formatting.md`).

For each selected standard, check its `specializes` array. Each listed key points at another manifest entry that this standard specializes. Read those `.md` files as well — they cover the general form of whatever the specific one refines.

## Step 3 — Apply

Treat standards as prescriptive, in order of specificity:

1. PostgreSQL-specific standard — highest precedence for topics it covers.
2. Standards listed in its `specializes` array — apply to topics the specific one does not address.
3. Other root standards (cross-cutting) — always apply.

**Worked example — logging:** `postgres/logging-and-commenting` specializes both `logging` and `code-commenting`. When writing a Postgres function, the postgres-specific rules (how `RAISE NOTICE` should be used, `COMMENT ON FUNCTION` conventions) override the generic logging/commenting rules for SQL. Anything not addressed in the specific standard (e.g., generic log levels, self-documenting-code principles for identifiers) still applies.

If your proposed code diverges from any standard, flag it and get user sign-off before proceeding.

## Cross-cutting

Standards in `standards/` without the `postgres/` prefix apply to all code regardless of language. Consult `using-core-standards` for those.
