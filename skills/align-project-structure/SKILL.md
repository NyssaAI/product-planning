---
name: align-project-structure
description: Use when verifying a repository conforms to the dev-tools project-structure standard, onboarding an existing repo to dev-tools, or when a legacy `docs/agent-files/` directory or missing `docs/agent-plan/` paths are detected.
---

# Align Project Structure

Brings a repo into conformance with `standards/project-structure.md`. **Hard-enforces the `docs/` section** — any deviation there is an error. **Warns** on everything else (advisory). **Auto-applies safe, non-destructive fixes**; for anything that rewrites human content or is ambiguous, it presents a plan and asks first.

## When to use

- Onboarding an existing repo to dev-tools, or "is this repo set up correctly?"
- A legacy `docs/agent-files/` directory exists, or `docs/agent-plan/...` paths are reported missing
- Before relying on plan-product / design-spec / execute-plan in an unfamiliar repo

## Step 1 — Load the standard

Invoke `dev-tools:using-core-standards` to load `standards/project-structure.md` — the source of truth for the layout below.

## Step 2 — Audit

**Enforced — the `docs/` section (every miss is an ERROR):**

- Required docs exist: `docs/product.md`, `docs/features.md`, `docs/roadmap.md`, `docs/tech-stack.md`
- `docs/features.md` is in current format (`## Inventory` checkboxes + `## Definitions`, `F-001` ids) — not the legacy table or `F1` ids
- agent-plan subtree exists: `docs/agent-plan/{specs,plans,backlog,bugs,context/modules}/`
- No legacy layout: `docs/agent-files/` is absent, and there are no pre-reorg roots (`docs/specs/`, `docs/plans/`, `docs/backlog/`, `docs/bugs/`, `docs/ai-plan/`)

**Warned — everything else (ADVISORY, never blocks):**

- `src/` feature-folder layout; `test/` mirroring `src/`; `test/acceptance-tests/`
- `CLAUDE.md` / `AGENTS.md` present; `docs/design/`, `docs/use-cases/`
- `ai-plan.config.json` + regeneration hook wired

Scan with Glob/Grep/ls. Classify each finding **ERROR** (docs/ deviation) or **WARNING** (advisory).

## Step 3 — Auto-apply safe fixes

Apply these without asking (all non-destructive), then report each. Use `npm run ai-plan -- <flag>` if scripts are wired, else `node "<PLUGIN_ROOT>/scripts/ai-plan/generate.mjs" <flag>` (`PLUGIN_ROOT` = `CLAUDE_PLUGIN_ROOT`):

- **Missing required docs or subtree dirs** → `generate.mjs --init` (writes template stubs only where missing; creates the agent-plan subtree).
- **Legacy `docs/agent-files/`** → `git mv docs/agent-files docs/agent-plan`, then replace `agent-files` → `agent-plan` in tracked references (`ai-plan.config.json` `outputDir`, `.claude/settings.json` regen hook, README/CLAUDE.md/AGENTS.md/CI). **Guard:** if `docs/agent-plan/` already exists with content, do NOT move — escalate to Step 4.
- **Pre-reorg roots** (`docs/specs/`, `docs/plans/`, `docs/backlog/`, `docs/bugs/`, `docs/ai-plan/`) → `generate.mjs --migrate` (idempotent; skips any target that already exists).

Re-verify after applying: `git grep -c agent-files` → no matches; the expected dirs/files are now present.

## Step 4 — Plan the rest (ask before applying)

These rewrite human-authored content or are ambiguous. Present a numbered plan and get your human partner's approval before doing any:

- **`features.md` in old format** → convert the table to `## Inventory` + `## Definitions` and renumber `F1` → `F-001` (needs human judgment on names/definitions).
- **Use-case files in old schema** (`F-001-U1`, singular `feature:`, `f{n}-u{n}.md`) → `U-001`, required `features:` list, `u-{nnn}-<slug>.md`.
- **Empty / stub required docs** → recommend `dev-tools:plan-product` to author a real PRD, roadmap, and feature breakdown (interactive).
- **Clobber risk** (a populated `docs/agent-plan/` alongside `docs/agent-files/`) → manual merge.

## Step 5 — Report

```
## Project structure audit

### docs/ (enforced)
✓ docs/product.md
✗ docs/features.md — legacy table format → planned (Step 4)
✓ docs/agent-plan/ subtree present

### Fixed automatically
- moved docs/agent-files → docs/agent-plan (+ 4 reference updates)
- ran --init: created docs/roadmap.md, docs/agent-plan/specs/

### Warnings (advisory)
- src/ not feature-foldered
- no CLAUDE.md

### Correction plan (needs approval)
1. Convert docs/features.md to F-001 checkbox format
2. …
```

## Common mistakes

- Treating advisory (non-`docs/`) items as blockers — they are warnings.
- Moving onto a populated `docs/agent-plan/` (clobber) instead of merging.
- Auto-converting `features.md` / use-case content without approval — it is human-authored.
- Forgetting config / regen-hook path references after the `agent-files` move, so regeneration writes to the old location.
