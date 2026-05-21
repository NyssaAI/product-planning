# Project Structure

All development repos created should follow this standard

```
/                                                   - repo root
├── docs/                                           - main documentation folder
│   │
│   │  --- Authoritative (human-maintained) ---
│   ├── product.md                                  - PRD: what the product is
│   ├── roadmap.md                                  - priorities and phases
│   ├── tech-stack.md                               - technologies and applicable standards
│   ├── specs/                                      - feature-level design (one approved design per file)
│   │   └── YYYY-MM-DD-<topic>-design.md
│   ├── plans/                                      - feature-level implementation plan
│   │   └── YYYY-MM-DD-<feature-name>.md
│   ├── backlog/                                    - queued work items
│   │   └── {YYYY.MM.DD-HHMMSS-slug}/
│   │       └── {timestamp}-{slug}-detail.md
│   ├── bugs/                                       - bug reports and resolutions
│   │   └── {YYYY.MM.DD-HHMMSS-slug}/
│   │       ├── {timestamp}-{slug}-detail.md
│   │       └── {timestamp}-{slug}-resolution.md
│   │
│   │  --- Generated module architecture (ai-plan) ---
│   │  Scopes are the valuable artifact: one self-contained picture per code module.
│   │  Other ai-plan files are indexes or optional excerpts — not a second copy of specs/plans.
│   └── ai-plan/
│       ├── scopes/
│       │   └── <module-id>.md                      - module architecture (boundaries, deps, routes, tests)
│       ├── MODULE_MAP.json                         - machine-readable dependency graph
│       ├── CODE_MAP.json                           - symbol index (lookup after plan names files)
│       └── INDEX.md                                - how to inject scopes during planning
├── src/                                            - source code (feature-folder structure)
├── test/                                           - test code (mirrors src/ structure)
│   └── acceptance-tests/                           - shell tests the execise the binary from the commandline and collect errors and logs
│       └── {timestamp}-{slug}/
│           ├──  {test-script}
│           ├──  {test results}
│           └──  logs/
└── CLAUDE.md                                       - repo-specific instructions
```

## Timestamp format

See [timestamp-format.md](timestamp-format.md).

## Required files

Every repo must have at minimum:

- `docs/product.md` — The product requirements document for this software
- `docs/roadmap.md` — the plan to build it
- `docs/tech-stack.md` — technologies used
- `CLAUDE.md` — repo-specific agent instructions

### Two axes of documentation (do not conflate)

| Axis | Location | Answers |
|------|----------|---------|
| **Work item** | `specs/`, `plans/`, `backlog/`, `bugs/` | What are we building *in this task*? Design and steps for one feature or fix. |
| **Code module** | `docs/ai-plan/scopes/<module-id>.md` | What does this *part of the codebase* own? Boundaries, dependencies, routes, test roots — derived from the repo. |

Planning a roadmap item: **spec** (intent) + **one scope** (architecture for the module you will touch) → **plan** (tasks). Do not substitute a scope for a spec or vice versa.

### Workflow artifacts (dev-tools)

| Path | Created by | Timestamp format |
|------|------------|------------------|
| `docs/specs/…-design.md` | brainstorming | `YYYY-MM-DD` |
| `docs/plans/….md` | writing-plans | `YYYY-MM-DD` |
| `docs/ai-plan/scopes/*.md` | ai-plan generate | regenerated when modules change |
| `docs/backlog/…/` | backlog-workflow | `YYYY.MM.DD-HHMMSS` |
| `docs/bugs/…/` | bug-workflow | `YYYY.MM.DD-HHMMSS` |

For product/roadmap context during planning, read `docs/product.md`, `docs/roadmap.md`, and `docs/tech-stack.md` directly — do not maintain duplicate excerpts under `ai-plan/`.

Regenerate ai-plan after module structure changes (`npm run ai-plan` or plugin scripts). Scopes with `preserveScope` in config are not overwritten.

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
