---
name: plan-product
description: Use when starting a new project or when docs/product.md, docs/features.md, docs/roadmap.md, or docs/tech-stack.md are missing or outdated.
---

# Plan Product

Establish foundational product documentation through an interactive conversation. Creates a full product requirements document (`docs/product.md`), initial roadmap, tech stack reference, and the `docs/` subtree scaffolding required by `standards/project-structure.md` (bundled in dev-tools).

**Always use AskUserQuestion** when asking the user anything. One question at a time — don't overwhelm. Related questions inside one sub-section MAY be bundled into a single compound prompt when the user is moving fast.

**Expected duration:** 10-15 minutes for a full PRD conversation. Users can answer "TBD" or "skip" to any question to move faster; skipped sections are written as `[To be defined]` placeholders.

## Checklist

You MUST complete these steps in order:

1. **Check for existing product docs**
2. **Gather PRD content** (for product.md)
3. **Define features** (for features.md) — derive the `F-001…` breakdown from the functional requirements, then AI-refine each definition with the user
4. **Gather roadmap** (for roadmap.md) — sequence the features into phases
5. **Establish tech stack** (for tech-stack.md)
6. **Scaffold docs subtree** (bugs/, backlog/)
7. **Generate files**
8. **Confirm completion**
9. **Ai-plan note** — when the repo will contain source code, tell your human partner that **using-ai-plan** runs automatically during **design-spec** and **write-plan** once code exists (regenerates `docs/agent-plan/context/` when stale). Manual `/ai-plan` or `npm run ai-plan` is only needed after structural module changes — not at project bootstrap.

## Step 1: Check for Existing Product Docs

Check if `docs/` contains any of these files:
- `product.md`
- `features.md`
- `roadmap.md`
- `tech-stack.md`

Also check directory scaffolding:
- `docs/agent-plan/bugs/`
- `docs/agent-plan/backlog/`

**If any files exist**, use AskUserQuestion:

> I found existing product documentation:
> - product.md: [exists/missing]
> - features.md: [exists/missing]
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

## Step 3: Define Features (for features.md)

`docs/features.md` is the feature-level breakdown of the application — one step more specific than the PRD's functional requirements, one step less specific than a use case. It is the unit the roadmap sequences (Step 4) and the capability set that use cases reference (each use case lists the features it requires in its `features:` frontmatter).

1. **Seed from the functional requirements.** Take the FRs from Step 2e and the MVP scope from Step 2d and draft a feature list. Usually one feature per FR — but merge tightly-coupled FRs into a single feature, and split a broad FR into several. Number them sequentially, zero-padded: `F-001`, `F-002`, …
2. **Confirm the inventory.** Present the draft list (ids + short names) with AskUserQuestion. Let the user rename, merge, split, add, or drop features. Finalize numbers in order once confirmed; a removed number is retired, never reused.
3. **AI-refine each definition.** For every confirmed feature, draft a 1–3 sentence definition from the product context — what the feature is, who it serves, where its boundary lies. Show the drafts to the user and fold in their edits. This is the "AI-refined, human-confirmed" half. Keep definitions feature-level, not implementation detail.
4. **All features start unchecked.** At planning time nothing is built, so every inventory entry is `- [ ]`. A box becomes `- [x]` only when the feature is delivered.

The file has two parts — a checkbox **Inventory** for scanning and a **Definitions** section below. See the template in Step 7.

## Step 4: Gather Roadmap (for roadmap.md)

The roadmap sequences the features from Step 3 into delivery phases — feature ids are the shared key, so the two files stay in sync. Ask these questions one at a time:

1. **Which features make up the MVP (Phase 1)?** — default to the features covering the MVP scope from Step 2d; the user confirms or adjusts, referencing ids (`F-001`, `F-003`, …).
2. **How are the remaining features grouped into later phases?** — phases 2, 3, … with brief names; assign the non-MVP features to phases. Can be "none yet" / "TBD".
3. **What's the rough order and dependencies?** — which phase blocks which, hard dependencies, parallel tracks.

Every feature should land in some phase (or be explicitly deferred). Reference features by id, not restated prose.

## Step 5: Establish Tech Stack (for tech-stack.md)

dev-tools bundles jamaynor development standards (`standards/` + `manifest.json`). Rather than duplicating guidance, `tech-stack.md` should enumerate technologies in use and reference the matching **dev-tools:using-*-standards** skills.

**Invoke** `dev-tools:using-core-standards` while drafting tech-stack so project-structure and cross-cutting rules are in context.

Grouping skills available in this plugin:
- `dev-tools:using-core-standards` (always)
- `dev-tools:using-dotnet-standards`
- `dev-tools:using-nextjs-standards`
- `dev-tools:using-postgres-standards`
- `dev-tools:using-python-standards`

### 5a. Ask what technologies the project uses

Use AskUserQuestion:

> What technologies does this project use? (select all that apply)
>
> - .NET (ASP.NET Core, Blazor, EF Core, Marten)
> - Next.js / React
> - PostgreSQL
> - Python
> - Other (not covered by bundled standards)

### 5b. For each selected tech with a matching standards category

Reference the matching `dev-tools:using-*-standards` skill in `tech-stack.md`. Do NOT dump standards content — the skill reference is enough; skills auto-trigger during design and implementation.

### 5c. For any "Other" technologies

Use AskUserQuestion:

> What other technologies are in use? (hosting, key libraries, external APIs, build tools, observability stack, etc.)

## Step 6: Scaffold docs subtree

Per `standards/project-structure.md`, scaffold `docs/`:

- `product.md`, `features.md`, `roadmap.md`, `tech-stack.md` (created in Step 7)
- `agent-plan/bugs/`, `agent-plan/backlog/` — empty until fix-bug / add-backlog
- `agent-plan/specs/`, `agent-plan/plans/` — empty until design-spec / write-plan
- `agent-plan/context/modules/` — empty until ai-plan generate (after source code exists)

Create directories with `.gitkeep` where needed:

```
docs/agent-plan/bugs/.gitkeep
docs/agent-plan/backlog/.gitkeep
docs/agent-plan/specs/.gitkeep
docs/agent-plan/plans/.gitkeep
docs/agent-plan/context/modules/.gitkeep
```

## Step 7: Generate Files

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

### docs/features.md

The Inventory mirrors the confirmed feature list (Step 3); every entry starts unchecked. The Definitions section carries the AI-refined, user-confirmed definition for each id, in the same order.

```markdown
# Features

## Inventory

- [ ] F-001: [feature name]
- [ ] F-002: [feature name]
- …

## Definitions

### F-001: [feature name]

[1–3 sentence definition — what it is, who it serves, its boundary.]

### F-002: [feature name]

[definition]
```

### docs/roadmap.md

Each phase lists the feature ids it delivers (from Step 4). The MVP phase is the Step 4.1 feature set.

```markdown
# Roadmap

## Phase 1: MVP

Features: F-001, F-002, … [the MVP set from Step 4.1]

[One-line framing of the MVP from product.md scope]

## Phase 2: [name from Step 4.2]

Features: [ids assigned to this phase]

## Phase 3: [name from Step 4.2]

Features: [ids assigned to this phase]

## Dependencies and order

[From Step 4.3 — which phase blocks which, parallel tracks]
```

Include only phases the user specified. Every `F-` id in `features.md` should appear in some phase or be noted as deferred. If no post-MVP phases provided, write "No post-MVP roadmap yet. Update after MVP is scoped and validated."

### docs/tech-stack.md

```markdown
# Tech Stack

## Technologies in use

| Technology | Purpose |
|------------|---------|
| [tech]     | [role]  |

## Applicable standards (dev-tools)

(For each tech category selected in Step 5a, include the matching line. Omit unselected categories. Always include cross-cutting.)

- **.NET:** `dev-tools:using-dotnet-standards`
- **Next.js:** `dev-tools:using-nextjs-standards`
- **PostgreSQL:** `dev-tools:using-postgres-standards`
- **Python:** `dev-tools:using-python-standards`
- **Cross-cutting:** `dev-tools:using-core-standards` (project structure, errors, logging, testing, security, DDD, workflow artifacts)

## Other technologies

[From Step 5c — hosting, libraries, external APIs, build tools, etc.]
```

## Step 8: Confirm Completion

After creating all files and directories, tell the user:

> Product documentation created per `standards/project-structure.md`:
>
> - `docs/product.md` (PRD)
> - `docs/features.md` (feature breakdown, `F-001…`)
> - `docs/roadmap.md` (phases sequencing the features)
> - `docs/tech-stack.md`
> - `docs/agent-plan/bugs/`, `docs/agent-plan/backlog/`, `docs/agent-plan/specs/`, `docs/agent-plan/plans/`, `docs/agent-plan/context/modules/` (scaffolded)
>
> After source code exists, **design-spec** and **write-plan** invoke **using-ai-plan** automatically when the index is stale. Run `/ai-plan` or `npm run ai-plan` manually only after module structure changes.
>
> Review these files to ensure they capture your product vision. When you're ready to build, invoke **design-spec** for the first feature (or **add-backlog** first if the work belongs on the backlog).

## Tips

- **Thin is better than none.** A PRD with half the sections answered is still useful; one with every section answered "TBD" isn't.
- **Non-goals and out-of-scope items are the most valuable sections.** They prevent scope drift and force explicit decision-making.
- **Functional requirements stay feature-level**, not implementation. "Support SSO" is a good FR; "integrate with Okta via SAML 2.0" is implementation detail that belongs in a design doc, not a PRD.
- **Load-bearing assumptions should be surfaced early.** Every "if X changes, the whole plan changes" assumption deserves a line in the Assumptions section.
- These files feed into **design-spec** and **write-plan** for downstream context. A good PRD meaningfully reduces the clarifying-question burden at every subsequent skill invocation.
- Standards are bundled — invoke `dev-tools:using-core-standards` when unsure which conventions apply.
