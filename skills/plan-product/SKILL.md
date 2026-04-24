---
name: plan-product
description: Use when starting a new project or when docs/product.md, docs/roadmap.md, or docs/tech-stack.md are missing. Establishes foundational product documentation (full PRD + roadmap + tech stack) through interactive conversation, conforming to the dev-standards project-structure layout.
---

# Plan Product

Establish foundational product documentation through an interactive conversation. Creates a full product requirements document (`docs/product.md`), initial roadmap, tech stack reference, and the `bugs/` + `backlog/` subtree scaffolding required by the dev-standards layout.

**Always use AskUserQuestion** when asking the user anything. One question at a time — don't overwhelm. Related questions inside one sub-section MAY be bundled into a single compound prompt when the user is moving fast.

**Expected duration:** 10-15 minutes for a full PRD conversation. Users can answer "TBD" or "skip" to any question to move faster; skipped sections are written as `[To be defined]` placeholders.

## Checklist

You MUST complete these steps in order:

1. **Check for existing product docs**
2. **Gather PRD content** (for product.md)
3. **Gather roadmap** (for roadmap.md)
4. **Establish tech stack** (for tech-stack.md)
5. **Scaffold docs subtree** (bugs/, backlog/)
6. **Generate files**
7. **Confirm completion**

## Step 1: Check for Existing Product Docs

Check if `docs/` contains any of these files:
- `product.md`
- `roadmap.md`
- `tech-stack.md`

Also check directory scaffolding:
- `docs/bugs/`
- `docs/backlog/`

**If any files exist**, use AskUserQuestion:

> I found existing product documentation:
> - product.md: [exists/missing]
> - roadmap.md: [exists/missing]
> - tech-stack.md: [exists/missing]
> - bugs/ scaffolding: [present/missing]
> - backlog/ scaffolding: [present/missing]
>
> Options:
> 1. Start fresh (replace all)
> 2. Update specific files
> 3. Cancel

If option 2, ask which files to update and only gather the info needed for those.
If option 3, stop.

**If no files exist**, proceed to Step 2.

## Step 2: Gather PRD Content (for product.md)

A PRD captures what the product is, who it's for, what success means, and what's in/out of scope. Ask these questions via AskUserQuestion. Any question may be answered "TBD" or "skip".

### 2a. Problem

1. **What problem does this product solve?** — the core pain point or need.
2. **Why solve it now?** — the triggering context or urgency (market window, regulatory deadline, internal priority, external pressure).
3. **What's the cost of not solving it?** — what happens if this product doesn't exist.

### 2b. Users

4. **Who is the primary user?** — the main persona (role, context, skill level, day-to-day workflow).
5. **Who are secondary stakeholders?** — others affected by the product (reviewers, admins, downstream systems, customers of the primary user).

### 2c. Goals and success

6. **What does success look like?** — how you'll know the product is working. Prefer quantitative metrics (throughput, latency, adoption rate, error rate, time-to-X) but qualitative outcomes are fine when that's all you have.
7. **What are the explicit non-goals?** — things this product will deliberately NOT try to do. Non-goals are as important as goals for preventing scope drift.

### 2d. Scope

8. **What's the MVP scope?** — the minimum capabilities for the first usable release. Users can answer with a short list or a one-paragraph description.
9. **What's explicitly out-of-scope for MVP?** — things that might make sense later but are deliberately excluded now.

### 2e. Functional requirements

10. **What core capabilities must the product have?** — feature-level list, not implementation details. Ask for 3–10 top-level capabilities and number them so they can be referenced later (`FR-1`, `FR-2`, …). Example: "ingest CSV files from S3", not "use boto3.get_object".

### 2f. Non-functional requirements

11. **What performance, reliability, security, or compliance constraints apply?** — specific targets if known: P95 latency, uptime SLO, data residency, regulatory requirements (HIPAA, SOC2, GDPR, PCI-DSS), authentication/authorization requirements, audit-trail needs. "None beyond defaults" is a valid answer.

### 2g. Constraints and assumptions

12. **What constraints apply?** — tech ("must run on Azure", "must use existing Postgres"), business ("must integrate with Salesforce"), timeline ("must ship by Q3"), team ("2 engineers, 6 weeks"), budget.
13. **What assumptions are load-bearing?** — things you're assuming true that, if wrong, would invalidate the plan. Examples: "user base will stay under 1000 for year one", "the upstream API will remain stable", "legal sign-off by end of month".

### 2h. Open questions

14. **What's still undecided or needs research?** — known unknowns, areas you'll discover more about as you build. Better to surface these now than hit them as surprises later.

## Step 3: Gather Roadmap (for roadmap.md)

Ask these questions one at a time:

1. **What milestones follow MVP?** — phases 2, 3, 4… with brief names and scope descriptions. Can be "none yet" / "TBD".
2. **What's the rough order?** — which milestone blocks which, any hard dependencies, any parallel tracks.

## Step 4: Establish Tech Stack (for tech-stack.md)

The `dev-standards` plugin (if installed) defines canonical standards for common stacks (.NET, Next.js, Postgres, Python). Rather than duplicating guidance, `tech-stack.md` should enumerate the technologies in use and reference the matching dev-standards categories.

### 4a. Detect dev-standards availability

Check whether the `dev-standards` plugin is installed. Signals: the `using-core-standards` skill appears in the available-skills list, or the agent can invoke `Skill(dev-standards:using-core-standards)` without error. If available, you have these grouping skills to reference:
- `using-core-standards` (language-agnostic)
- `using-dotnet-standards`
- `using-nextjs-standards`
- `using-postgres-standards`
- `using-python-standards`

### 4b. Ask what technologies the project uses

Use AskUserQuestion:

> What technologies does this project use? (select all that apply)
>
> - .NET (ASP.NET Core, Blazor, EF Core, Marten)
> - Next.js / React
> - PostgreSQL
> - Python
> - Other (not covered by dev-standards)

### 4c. For each selected tech with a matching dev-standards category

Reference the matching category in `tech-stack.md`. Do NOT dump the standards' content — the reference is enough; the `using-<category>-standards` skill auto-triggers when the agent does work in that area.

### 4d. For any "Other" technologies

Use AskUserQuestion:

> What other technologies are in use? (hosting, key libraries, external APIs, build tools, observability stack, etc.)

If `dev-standards` is NOT installed, skip 4a/4c and instead ask the user directly what conventions or patterns to follow for each technology.

## Step 5: Scaffold docs subtree

Per the dev-standards project-structure, `docs/` contains:
- `product.md`
- `roadmap.md`
- `tech-stack.md`
- `bugs/` — populated per-bug via the bug-workflow skill, each entry under `bugs/{timestamp}-{slug}/`
- `backlog/` — populated per-item via the backlog-workflow skill, each entry under `backlog/{timestamp}-{slug}/`

Create the empty directories with `.gitkeep` files so they survive git commits:

```
docs/bugs/.gitkeep
docs/backlog/.gitkeep
```

## Step 6: Generate Files

Create `docs/` if it doesn't exist. Generate each file with the content gathered. Any section the user deferred should appear as `[To be defined]`.

### docs/product.md

```markdown
# Product Requirements Document

## Problem

**What:** [Step 2a.1]

**Why now:** [Step 2a.2]

**Cost of inaction:** [Step 2a.3]

## Users

**Primary:** [Step 2b.4]

**Secondary stakeholders:** [Step 2b.5]

## Goals and success

**Success definition:** [Step 2c.6]

**Non-goals:** [Step 2c.7]

## Scope

**MVP (in-scope):** [Step 2d.8]

**Out of scope for MVP:** [Step 2d.9]

## Functional requirements

[Step 2e.10 — numbered list]

- **FR-1:** [capability]
- **FR-2:** [capability]
- …

## Non-functional requirements

[Step 2f.11 — or "None beyond defaults"]

## Constraints

[Step 2g.12]

## Assumptions

[Step 2g.13]

## Open questions

[Step 2h.14]
```

### docs/roadmap.md

```markdown
# Roadmap

## Phase 1: MVP

[MVP scope from product.md]

## Phase 2: [name from Step 3.1]

[Scope from Step 3.1]

## Phase 3: [name from Step 3.1]

[Scope from Step 3.1]

## Dependencies and order

[From Step 3.2]
```

Include only phases the user specified. If no post-MVP phases provided, write "No post-MVP roadmap yet. Update after MVP is scoped and validated."

### docs/tech-stack.md

```markdown
# Tech Stack

## Technologies in use

| Technology | Purpose |
|------------|---------|
| [tech]     | [role]  |

## Applicable dev-standards

(For each tech category selected in Step 4b, include the matching line. Omit lines for categories not selected. Always include the cross-cutting line.)

- **.NET:** see `dev-standards` plugin → `using-dotnet-standards` skill for ASP.NET Core, Blazor, EF Core, Marten, and .NET testing conventions.
- **Next.js:** see `dev-standards` plugin → `using-nextjs-standards` skill for App Router, components, styling, animation, accessibility, SEO, and content-management conventions.
- **PostgreSQL:** see `dev-standards` plugin → `using-postgres-standards` skill for function, staging-table, schema, audit/metrics, logging, and SQL-formatting patterns.
- **Python:** see `dev-standards` plugin → `using-python-standards` skill for project structure, bulk-load, data-transformation, and logging patterns.
- **Cross-cutting:** `using-core-standards` always applies (project structure, error handling, logging, testing, security, DDD, code commenting, workflow artifacts).

## Other technologies

[From Step 4d — hosting, libraries, external APIs, build tools, etc.]

(If `dev-standards` is not installed, replace the "Applicable dev-standards" section with a plain list of conventions to follow for each technology, captured directly from the user.)
```

## Step 7: Confirm Completion

After creating all files and directories, tell the user:

> Product documentation created, conforming to dev-standards project-structure:
>
> - `docs/product.md` (PRD)
> - `docs/roadmap.md`
> - `docs/tech-stack.md`
> - `docs/bugs/` (empty — populated per-bug via the `bug-workflow` skill)
> - `docs/backlog/` (empty — populated per-item via the `backlog-workflow` skill)
>
> Review these files to ensure they capture your product vision. You can edit them directly or invoke this skill again to update specific files.

## Tips

- **Thin is better than none.** A PRD with half the sections answered is still useful; one with every section answered "TBD" isn't.
- **Non-goals and out-of-scope items are the most valuable sections.** They prevent scope drift and force explicit decision-making.
- **Functional requirements stay feature-level**, not implementation. "Support SSO" is a good FR; "integrate with Okta via SAML 2.0" is implementation detail that belongs in a design doc, not a PRD.
- **Load-bearing assumptions should be surfaced early.** Every "if X changes, the whole plan changes" assumption deserves a line in the Assumptions section.
- These files feed into the `brainstorming` and `writing-plans` skills for downstream context. A good PRD meaningfully reduces the clarifying-question burden at every subsequent skill invocation.
- If `dev-standards` is not installed, Step 4 falls back to asking the user what conventions to follow directly. The rest of the skill works the same way.
