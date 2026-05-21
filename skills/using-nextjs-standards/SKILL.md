---
name: using-nextjs-standards
description: Use when writing or reviewing Next.js/React frontend code — app router, components, styling, animation, accessibility, SEO, or content management.
---

# Using Next.js Standards

## Step 1 — Discover

Read `manifest.json` at the plugin root. Filter to entries whose `file` path starts with `standards/nextjs/`. That is the authoritative list of Next.js standards in this plugin.

## Step 2 — Select

Match the task against the `description` of each entry. Read the `.md` files relevant to what you are about to do. Multiple standards may apply (e.g., a new marketing page pulls in `app-router.md`, `component-architecture.md`, `styling.md`, and `seo.md`).

For each selected standard, check its `specializes` array. Each listed key points at another manifest entry that this standard specializes. Read those `.md` files as well — they cover the general form of whatever the specific one refines.

## Step 3 — Apply

Treat standards as prescriptive, in order of specificity:

1. Next.js-specific standard — highest precedence for topics it covers.
2. Standards listed in its `specializes` array — apply to topics the specific one does not address.
3. Other root standards (cross-cutting) — always apply.

If your proposed code diverges from any standard, flag it and get user sign-off before proceeding.

## Cross-cutting

Standards in `standards/` without the `nextjs/` prefix apply to all code regardless of language. Consult `using-core-standards` for those.
