---
name: using-dotnet-standards
description: Use when writing or reviewing .NET/C# code that should conform to standards — ASP.NET Core APIs, Blazor components, Blazor WASM, EF Core, Marten event store, or .NET testing.
---

# Using .NET Standards

Follow **`../_shared/standards-discovery.md`** (Steps 1–3), including technology-specific precedence.

## Manifest filter

Entries whose `file` path starts with `standards/dotnet/`.

## Examples

A new EF Core entity with unit tests pulls both `entity-framework.md` and `testing.md`.

**Worked example — testing:** `dotnet/testing` specializes `testing-principles`. When writing .NET tests, `dotnet/testing.md` takes precedence for .NET-specific rules (xUnit conventions, test-project layout). `testing-principles.md` still applies for framework-agnostic rules unless `dotnet/testing.md` explicitly overrides them.

## Cross-cutting

Standards in `standards/` without the `dotnet/` prefix apply to all code regardless of language. Consult `using-core-standards` for those.
