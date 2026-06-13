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

## Workflow entry points

Canonical user-facing skills (verb name = folder name under `skills/`):

| Verb | Folder | Purpose |
|------|--------|---------|
| `plan-product` | `plan-product` | New project: product, roadmap, tech-stack |
| `add-backlog` | `add-backlog` | Add backlog item with detail file |
| `add-bug` | `add-bug` | Add bug report with detail file |
| `design-spec` | `design-spec` | Spec before code |
| `execute-plan` | `execute-plan` | Implement written plan → PR |
| `fix-bug` | `fix-bug` | Bug orchestrator: simple direct fix or complex design path |

**Feature chain:** `design-spec` → `write-plan` (internal) → `execute-plan` (verify → run → open PR; review feedback → `receiving-code-review` → update PR; after approval → regression-check → merge → cleanup)

**Backlog chain:** `add-backlog` → (when work begins) `design-spec` → `write-plan` (internal) → `execute-plan` when ready

**Bug-report chain:** `add-bug` → (when ready to fix) `fix-bug`

**Greenfield chain:** `plan-product` → `design-spec` → `write-plan` (internal) → `execute-plan` when ready

**Bug chain:** `fix-bug` only. Simple one-file bugs can go log → analyze → direct TDD fix → complete. Complex bugs route log → analyze → `design-spec` → `write-plan` (internal) → `execute-plan`.

**Internal sub-skills** (`user-invocable: false`): `write-plan`, `execute-plan-run`, `execute-plan-run-inline`, `execute-plan-finish`, `merge-pr`, `fix-bug-log`, `systematic-debugging`, `fix-bug-resolve`, `fix-bug-complete`.

**Automatic (not buttons):** `using-dev-tools` (session router), `using-ai-plan` during design-spec / write-plan when code exists.

Do not invoke internal sub-skills directly — use the orchestrator entry points above.

User-facing install overview: [README.md](../README.md#workflow-entry-points).

## Repo layout

The canonical directory tree is **`standards/project-structure.md`**. All workflow artifacts (`docs/specs/`, `docs/plans/`, `docs/ai-plan/`, `docs/backlog/`, `docs/bugs/`) are defined there.

## Modifying standards

Edit files under `standards/` and update `manifest.json`. Keep standards concise and prescriptive.
