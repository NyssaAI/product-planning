# Development standards (bundled)

jamaynor development standards ship **inside the dev-tools plugin** — no separate `dev-standards` plugin required.

Documentation index: [README.md](README.md)

## Index

- **`manifest.json`** (plugin root) — machine-readable list of all standards
- **`standards/`** — prescriptive Markdown rules

## Grouping skills

| Skill | When |
|-------|------|
| `dev-tools:using-core-standards` | Project structure, errors, logging, testing, DDD, bugs/backlog |
| `dev-tools:using-dotnet-standards` | .NET / C# / Blazor / EF / Marten |
| `dev-tools:using-nextjs-standards` | Next.js / React |
| `dev-tools:using-postgres-standards` | PostgreSQL |
| `dev-tools:using-python-standards` | Python |

Workflow skills invoke these automatically (design-spec, write-plan). Agents may also invoke them directly when reviewing or implementing.

## Repo layout

The canonical directory tree is **`standards/project-structure.md`**. All workflow artifacts (`docs/specs/`, `docs/plans/`, `docs/ai-plan/`, `docs/backlog/`, `docs/bugs/`) are defined there.

## Modifying standards

Edit files under `standards/` and update `manifest.json`. Keep standards concise and prescriptive.
