# Standards discovery (shared reference)

Used by all `using-*-standards` skills. Each skill defines its **manifest filter** and stack-specific examples in its own SKILL.md.

## Step 1 — Discover

Read `manifest.json` at the plugin root. Apply the manifest filter documented in the invoking skill.

## Step 2 — Select

Match the task against the `description` of each matching manifest entry. Read the `.md` files relevant to what you are about to do. Multiple standards may apply.

For technology-specific skills: check each selected standard's `specializes` array. Each key points at another manifest entry — read those `.md` files for the general form the specific standard refines.

## Step 3 — Apply

Treat each selected standard as prescriptive. If your proposed work diverges from a standard, flag it and get user sign-off before proceeding.

### Technology-specific precedence

When applying stack-specific standards (not `using-core-standards`):

1. Stack-specific standard — highest precedence for topics it covers
2. Standards in its `specializes` array — topics the specific one does not address
3. Cross-cutting root standards — consult `using-core-standards` for the rest
