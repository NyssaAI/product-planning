---
name: plan-product
description: Use when starting a new project or when docs/mission.md, docs/roadmap.md, or docs/tech-stack.md are missing. Establishes foundational product documentation through interactive conversation.
---

# Plan Product

Establish foundational product documentation through an interactive conversation. Creates mission, roadmap, and tech stack files in `docs/`.

**Always use AskUserQuestion** when asking the user anything. One question at a time — don't overwhelm.

## Checklist

You MUST complete these steps in order:

1. **Check for existing product docs**
2. **Gather product vision** (for mission.md)
3. **Gather roadmap** (for roadmap.md)
4. **Establish tech stack** (for tech-stack.md)
5. **Generate files**
6. **Confirm completion**

## Step 1: Check for Existing Product Docs

Check if `docs/` contains any of these files:
- `mission.md`
- `roadmap.md`
- `tech-stack.md`

**If any files exist**, use AskUserQuestion:

> I found existing product documentation:
> - mission.md: [exists/missing]
> - roadmap.md: [exists/missing]
> - tech-stack.md: [exists/missing]
>
> Options:
> 1. Start fresh (replace all)
> 2. Update specific files
> 3. Cancel

If option 2, ask which files to update and only gather info for those.
If option 3, stop.

**If no files exist**, proceed to Step 2.

## Step 2: Gather Product Vision (for mission.md)

Ask these questions one at a time using AskUserQuestion:

1. **What problem does this product solve?** — the core problem or pain point
2. **Who is this product for?** — target users or audience
3. **What makes your solution unique?** — the key differentiator or approach

## Step 3: Gather Roadmap (for roadmap.md)

Ask these questions one at a time using AskUserQuestion:

1. **What are the must-have features for launch (MVP)?** — core features for the first usable version
2. **What features are planned for after launch?** — future phases, or "none yet"

## Step 4: Establish Tech Stack (for tech-stack.md)

First, check if a tech-stack standard exists at `D:/Workspace/Repos/jamaynor/dev-standards/manifest.json`. Read the manifest and look for any tech stack information relevant to the detected project type.

**If relevant standards exist**, use AskUserQuestion:

> I found tech stack guidance in your dev-standards:
>
> [Summarize key technologies from relevant standards]
>
> Does this project use the same tech stack, or does it differ?
> 1. Same as standard (use as-is)
> 2. Different (I'll specify)

If option 1, use the standard's content.
If option 2, ask them to specify (see below).

**If no relevant standards exist** (or they chose option 2), use AskUserQuestion:

> What technologies does this project use?
>
> - Frontend: (e.g., React, Vue, Blazor, or N/A)
> - Backend: (e.g., ASP.NET, Node, Django, or N/A)
> - Database: (e.g., PostgreSQL, MongoDB, or N/A)
> - Other: (hosting, APIs, tools, etc.)

## Step 5: Generate Files

Create `docs/` if it doesn't exist. Generate each file:

### docs/mission.md

```markdown
# Mission

## Problem

[What problem this product solves — from Step 2]

## Target Users

[Who this product is for — from Step 2]

## Solution

[What makes the solution unique — from Step 2]
```

### docs/roadmap.md

```markdown
# Roadmap

## Phase 1: MVP

[Must-have features for launch — from Step 3]

## Phase 2: Post-Launch

[Planned future features — from Step 3, or "To be determined"]
```

### docs/tech-stack.md

```markdown
# Tech Stack

| Technology | Purpose |
|------------|---------|
| [tech]     | [role]  |
```

Organize into a table. If the user provided categories (frontend, backend, database, other), use rows per technology with the category implied by the purpose column.

## Step 6: Confirm Completion

After creating all files, tell the user:

> Product documentation created:
>
> - docs/mission.md
> - docs/roadmap.md
> - docs/tech-stack.md
>
> Review these files to ensure they capture your product vision. You can edit them directly or invoke this skill again to update.

## Tips

- Brief answers are fine — docs can be expanded later
- If they want to skip a section, create the file with "To be defined"
- These files feed into brainstorming and writing-plans skills for downstream context
