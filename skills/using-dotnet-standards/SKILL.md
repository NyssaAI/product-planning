---
name: using-dotnet-standards
description: Use when writing or reviewing .NET/C# code that should conform to standards — ASP.NET Core APIs, Blazor components, Blazor WASM, EF Core, Marten event store, or .NET testing.
---

# Using .NET Standards

## Step 1 — Discover

Read `manifest.json` at the plugin root. Filter to entries whose `file` path starts with `standards/dotnet/`. That is the authoritative list of .NET standards in this plugin.

## Step 2 — Select

Match the task against the `description` of each entry. Read the `.md` files relevant to what you are about to do. Multiple standards may apply (e.g., a new EF Core entity with unit tests pulls both `entity-framework.md` and `testing.md`).

For each selected standard, check its `specializes` array. Each listed key points at another manifest entry that this standard specializes. Read those `.md` files as well — they cover the general form of whatever the specific one refines.

## Step 3 — Apply

Treat standards as prescriptive, in order of specificity:

1. .NET-specific standard — highest precedence for topics it covers.
2. Standards listed in its `specializes` array — apply to topics the specific one does not address.
3. Other root standards (cross-cutting) — always apply.

**Worked example — testing:** `dotnet/testing` specializes `testing-principles`. When writing .NET tests, `dotnet/testing.md` takes precedence for .NET-specific rules (xUnit conventions, test-project layout). `testing-principles.md` still applies for framework-agnostic rules (test pyramid, unit vs integration conventions) unless `dotnet/testing.md` explicitly overrides them.

If your proposed code diverges from any standard, flag it and get user sign-off before proceeding.

## Cross-cutting

Standards in `standards/` without the `dotnet/` prefix apply to all code regardless of language. Consult `using-core-standards` for those.
