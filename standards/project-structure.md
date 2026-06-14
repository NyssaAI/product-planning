# Project Structure

All development repos created should follow this standard

```
/                                                   - repo root
├── docs/                                           - main documentation folder
│   │
│   │  --- Human-authored product docs (docs/ root is human-only) ---
│   ├── product.md                                  - PRD: what the product is
│   ├── roadmap.md                                  - priorities and phases
│   ├── tech-stack.md                               - technologies and applicable standards
│   ├── features.md                                 - feature inventory (status table)
│   ├── design/                                     - UI wireframes and mockups (no enforced schema)
│   ├── use-cases/                                  - structured use-case detail
│   │   └── f{n}-u{n}.md
│   │
│   │  --- Everything the plugin touches ---
│   └── agent-plan/
│       ├── context/                                - generated — do not hand-edit, freely overwritten
│       │   ├── index.md                            - how to inject module files during planning
│       │   ├── code-map.json                       - symbol index (lookup after plan names files)
│       │   ├── module-map.json                     - machine-readable dependency graph
│       │   └── modules/
│       │       └── <module-id>.md                  - module architecture (boundaries, deps, routes, tests)
│       ├── specs/                                  - workflow: approved design docs
│       │   └── YYYY-MM-DD-<topic>-design.md
│       ├── plans/                                  - workflow: implementation plans
│       │   └── YYYY-MM-DD-<feature-name>.md
│       ├── backlog/                                - workflow: queued work items
│       │   └── {YYYY.MM.DD-HHMMSS-slug}/
│       │       └── {timestamp}-{slug}-detail.md
│       └── bugs/                                   - workflow: bug reports and resolutions
│           └── {YYYY.MM.DD-HHMMSS-slug}/
│               ├── {timestamp}-{slug}-detail.md
│               └── {timestamp}-{slug}-resolution.md
├── src/                                            - source code (feature-folder structure)
├── test/                                           - test code (mirrors src/ structure)
│   └── acceptance-tests/                           - shell tests the execise the binary from the commandline and collect errors and logs
│       └── {timestamp}-{slug}/
│           ├──  {test-script}
│           ├──  {test results}
│           └──  logs/
└── CLAUDE.md                                       - repo-specific instructions
```

**Rule:** `docs/` root is human-only product docs. `docs/agent-plan/` is everything the plugin touches. `docs/agent-plan/context/` is machine-generated and freely overwritten.

## Timestamp format

See [timestamp-format.md](timestamp-format.md).

## Required files

Every repo must have at minimum:

- `docs/product.md` — The product requirements document for this software
- `docs/roadmap.md` — the plan to build it
- `docs/tech-stack.md` — technologies used
- `CLAUDE.md` — repo-specific agent instructions

## Human-authored artifact types

### docs/features.md

Human-maintained feature inventory. Linked from use-case frontmatter.

```markdown
# Features

| #  | Feature            | Status  | Summary                                              |
|----|--------------------|---------|------------------------------------------------------|
| F1 | Actor Registration | active  | Provisional registration workflow with accept/reject |
| F2 | Host Registry      | planned | SSH tunnel registration and management               |
```

Status values: `planned` | `active` | `complete` | `deferred`

### docs/use-cases/f{n}-u{n}.md

One file per use case. A third input type for `design-spec` alongside ad-hoc ideas and backlog items.

```markdown
---
product: <Product Name>
feature: F1
feature-name: Actor Registration
use-case: F1-U1
use-case-name: Register a new actor
status: active
---

# F1-U1: Register a new actor

Brief prose describing what the actor is trying to do and why it matters.

## Process

(tree-style process outline)

## Success criteria

- [ ] Criterion 1
- [ ] Criterion 2
```

### docs/design/

Reserved folder for UI wireframes, mockups, and layout specs. No enforced schema. Created during migration; teams populate it freely.

## Progressive specificity chain

Each level adds specificity to the previous. This chain is the canonical input path into `design-spec`:

```
docs/product.md               PRD — what the product is
       ↓
docs/features.md              Feature inventory — one step more detailed than PRD
       ↓
docs/use-cases/f{n}-u{n}.md   Use-case detail — one step more detailed than feature
       ↓
docs/agent-plan/specs/       Design spec — technical design for one use case (design-spec output)
       ↓
docs/agent-plan/plans/       Implementation plan (write-plan output)
```

### Two axes of documentation (do not conflate)

| Axis | Location | Answers |
|------|----------|---------|
| **Work item** | `agent-plan/specs/`, `agent-plan/plans/`, `agent-plan/backlog/`, `agent-plan/bugs/` | What are we building *in this task*? Design and steps for one feature or fix. |
| **Code module** | `docs/agent-plan/context/modules/<module-id>.md` | What does this *part of the codebase* own? Boundaries, dependencies, routes, test roots — derived from the repo. |

Planning a roadmap item: **spec** (intent) + **one module file** (architecture for the module you will touch) → **plan** (tasks). Do not substitute a module file for a spec or vice versa.

### Workflow artifacts (dev-tools)

| Path | Created by | Timestamp format |
|------|------------|------------------|
| `docs/agent-plan/specs/…-design.md` | design-spec | `YYYY-MM-DD` |
| `docs/agent-plan/plans/….md` | write-plan (via design-spec) | `YYYY-MM-DD` |
| `docs/agent-plan/context/modules/*.md` | ai-plan generate | regenerated when modules change |
| `docs/agent-plan/backlog/…/` | add-backlog | `YYYY.MM.DD-HHMMSS` |
| `docs/agent-plan/bugs/…/` | fix-bug-log (via fix-bug) | `YYYY.MM.DD-HHMMSS` |

For product/roadmap context during planning, read `docs/product.md`, `docs/roadmap.md`, and `docs/tech-stack.md` directly — do not maintain duplicate excerpts under `agent-plan/context/`.

Regenerate ai-plan after module structure changes (`npm run ai-plan` or plugin scripts). Module files with `preserveModule` in config are not overwritten.

---

## Source Code (`src/`)

**Entry point at top**: `main.py`, `index.ts`, `main.go`, `Program.cs`

**Organize by feature, not by layer:**

```
src/orders/       # Feature folder
  ├── models.py   # Feature-private types
  ├── services/
  └── handlers/
```

Not:

```
src/models/       # Every model in one layer folder
  ├── order.py
  ├── user.py
src/services/     # Every service in one layer folder
  ├── order_service.py
  ├── user_service.py
```

**Within each feature:**
- `models.py` (or `models/`) — Feature-private data models and entities
- `services/` — Business logic
- `handlers/` — API/command handlers
- `repository.py` — Data access (optional)
- `__init__.py` — Public interface

---

## Shared Domain Models (`src/models/`)

When a domain type is consumed by 2+ features, it belongs in `src/models/` — not duplicated across feature folders, and not arbitrarily owned by one feature.

### Promotion Rule

A type **stays feature-local** when only that feature imports it. A type **moves to `src/models/`** when a second feature needs it. This is the only trigger for promotion.

### What belongs in `src/models/`

- Type definitions (interfaces, classes, enums, type aliases)
- Value-type constants tied to model semantics (e.g., `VALID_TRANSITIONS`, `DEFAULT_STATUS`)
- Domain entity specs and their associated types

### What does NOT belong in `src/models/`

- Service logic, I/O, side effects
- Repository implementations
- Feature-specific DTOs or view models
- Utility functions (those go in `shared/`)

### Organization

Files in `src/models/` are organized by **domain concept**, not by feature:

```
src/models/
  ├── core.py       # Core domain entities (User, Tenant, etc.)
  ├── session.py    # Session lifecycle types
  ├── output.py     # Output/result shape types
  └── config.py     # Configuration value types
```

### Dependency Rule

```
src/shared/    ← low-level utilities, no domain knowledge
     ↑
src/models/    ← domain types only, may import from shared/
     ↑
src/features/  ← business logic, may import from models/ and shared/
```

- `models/` MAY import from `shared/` (utility types, base classes)
- `models/` MUST NOT import from any feature
- Features MAY import from `models/`
- Features MUST NOT reach into another feature's private models

---

## Tests (`test/`)

Mirror `src/` structure:

```
test/
├── unit/orders/test_order_service.py
├── integration/test_order_creation.py
└── e2e/test_checkout_flow.py
```

---

## Imports

Use absolute imports from `src/`:

```python
# Good
from orders.services import OrderService

# Bad
from ..services import OrderService
```

Configure your language to treat `src/` as root:

**Python** (`pyproject.toml`):
```toml
[tool.pytest.ini_options]
pythonpath = "src"
```

**TypeScript** (`tsconfig.json`):
```json
{"compilerOptions": {"baseUrl": "src"}}
```

---

## Root Level (Minimal)

Only commit at the root:
- `README.md`
- `CLAUDE.md`
- `package.json` / `requirements.txt` / `go.mod`
- `.gitignore`
- `.env.example` (no secrets)
- Config: `pyproject.toml`, `tsconfig.json`, etc.

**Never commit:**
- `.env`
- Compiled code (`dist/`, `build/`, `__pycache__/`)
- Dependencies (`node_modules/`, `venv/`, `vendor/`)
- IDE folders (`.vscode/`, `.idea/`)
