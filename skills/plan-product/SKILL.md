---
name: plan-product
description: Establish or refresh plan-product foundational docs through a lightweight interactive interview using the configured docs and template paths. Use when the user wants to define a product, seed or update plan-product core docs such as docs/product.md, docs/features.md, docs/tech-stack.md, or initialize plan-product docs without creating full feature or use-case specs.
---

# Plan Product

Establish lightweight plan-product documentation through an interactive conversation. Use `.plan-product/config.json` as the path authority and the template files named in that config as the output shape authority.

Do not duplicate product, feature, use-case, or tech-stack formats in this skill. Read the current configured templates immediately before writing so refinements to `.plan-product/templates/*` are picked up automatically.

## Operating Rules

- Read `.plan-product/config.json` first. If it is missing, bootstrap the repo by running `node "${PLUGIN_ROOT}/scripts/module-map/generate-module-map.mjs" --init` from the target project root — this writes a schema-valid `.plan-product/config.json` and copies the bundled templates into place — then re-read the config. Resolve `${PLUGIN_ROOT}` from `PLAN_PRODUCT_PLUGIN_ROOT`, `PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or the installed plugin directory containing this skill. Only if `--init` cannot be run, hand-write a minimal config with the required plan-product path keys from `.plan-product/schema.json`, then re-read it.
- Resolve every output path from config before interviewing. Do not hardcode `docs/product.md`, `docs/features.md`, `docs/tech-stack.md`, or `docs/features/f-nxx/feature.md` except as examples in user-facing text.
- Verify the configured templates exist before writing:
  - Product doc: `paths.productTemplate`
  - Feature inventory: `paths.featuresTemplate`
  - Tech stack: `paths.techStackTemplate`
  - Feature guide stubs: `paths.featureTemplate`
- If a required template is missing, run `node "${PLUGIN_ROOT}/scripts/module-map/generate-module-map.mjs" --init` to copy the bundled templates into `.plan-product/templates/`, then re-check. Only if that cannot restore the template should you stop before writing and report the missing configured path. Do not silently invent a replacement template.
- Ask one blocking question at a time. In Codex, present numbered choices in chat and wait for the user answer. If a runtime provides an AskUserQuestion tool, use that tool.
- Run a standard-depth product discovery interview by default. Keep it lighter than `plan-feature` or `plan-use-case`, but gather enough context to make the first-pass docs useful for future planning work.
- If the user says "skip", "unknown", or gives a very brief answer, write `To be defined.` only into empty target sections. Never replace existing non-empty content with `To be defined.`.
- Preserve existing user-authored content unless the user chooses to replace that file. For updates, merge by section heading and preserve unmatched sections, comments, links, and local notes.
- A core doc whose content is identical to its configured template is not user-authored: `--init` copies the product, feature-inventory, and tech-stack templates into place. Treat such a file as `template only` in step 1, and write it from the interview without asking to replace it and without preserving the template's instructional sentences as content.
- Put detailed feature guides under the configured feature root and path pattern. Create only lightweight feature guide stubs in this skill; use `plan-feature` to deepen a feature.
- Do not create use-case files during this skill unless the user explicitly asks. If they do, use the configured use-case path pattern and current `paths.useCaseTemplate`.
- Keep tech-stack capture light touch. Record high-level stack context and unknowns only; do not establish language-specific engineering standards or implementation policy in this workflow.

## Config Resolution

Use these config fields when present:

| Purpose | Config field |
| --- | --- |
| Product definition | `paths.product` |
| Feature inventory | `paths.features` or `structure.features.inventory` |
| Tech stack | `paths.techStack` |
| Feature guide root | `structure.features.root` or `paths.featureDocs` |
| Feature guide path | `structure.features.featurePathPattern` |
| Product template | `paths.productTemplate` |
| Feature inventory template | `paths.featuresTemplate` |
| Tech stack template | `paths.techStackTemplate` |
| Feature guide template | `paths.featureTemplate` |

If a config field is missing, fill only the missing field with the plan-product default for that field, preserving any extra existing config keys. Do not overwrite or normalize unrelated config entries.

## Interview Quality Bar

Collect enough information for the docs to answer these questions:

- What product is this, in one or two plain-language sentences?
- Who uses it, what job are they trying to do, and what pain or workflow gap exists today?
- What solution shape is proposed, and what makes it preferable to the current workaround or obvious alternatives?
- What is explicitly out of scope so future agents do not expand ownership by accident?
- What outcomes, signals, or metrics would show the product is working?
- What feature groups support those outcomes, which features belong in the first usable version, and what can wait?
- What high-level tech-stack context and unknowns should future planning work know?

Ask one interview cluster at a time. A cluster may include a short prompt plus 3-5 bullets that clarify what a good answer can include. Accept partial answers, but ask one targeted follow-up when an answer is too generic to guide future planning.

Before writing, synthesize a short product capsule:

```text
Product capsule:
- Product:
- Primary users:
- Core problem:
- Solution shape:
- First usable version:
- Boundaries:
- Success signals:

Does this look right before I write the plan-product docs?
1. Yes, write it
2. Mostly, but I will correct details
3. Stop
```

If the user chooses option 2, collect corrections and update the capsule once before writing. If the user chooses option 3, stop without writing.

## Workflow

### 1. Check Existing plan-product Docs

After resolving paths, check the configured product, feature inventory, and tech-stack files. Compare each existing file against its configured template; a byte-identical copy is `template only`.

If any file exists with real content, ask using the actual configured paths:

```text
I found existing plan-product documentation:
- <productPath>: [exists/template only/missing]
- <featuresPath>: [exists/template only/missing]
- <techStackPath>: [exists/template only/missing]

Would you like to:
1. Start fresh and replace the selected core files
2. Update specific core files
3. Cancel

Choose 1, 2, or 3.
```

If option 2, ask which configured files to update and only gather information for those files. If option 3, stop. When every existing file is `template only`, skip this question and proceed as a fresh run.

### 2. Gather Product Definition

For the configured product file, read `paths.productTemplate` immediately before writing.

If `STRATEGY.md` exists, summarize relevant product direction before asking. If `CONCEPTS.md` exists, reuse its terms instead of inventing new vocabulary.

Ask one interview cluster at a time:

```text
What is this product?

Include the product name if known, the category it belongs to, and the one-sentence job it should help someone do.
```

```text
Who is it for?

List the primary users, secondary users, and any operators, maintainers, or agents that need to work with it.
```

```text
What problem or workflow gap does it solve?

Describe what is painful today, what users do instead, what fails or takes too long, and why this is worth solving now.
```

```text
What is the product's solution shape?

Describe the smallest useful version, the main workflow, the important artifacts or screens, and any alternatives you already rejected.
```

```text
What should this product explicitly not own?

List adjacent responsibilities, non-goals, unsupported user types, data it should not manage, or workflows that belong elsewhere.
```

```text
What outcomes would show this product is working?

Name observable signals such as faster workflows, fewer manual steps, cleaner handoffs, adoption, quality checks, revenue impact, reduced support, or better implementation decisions.
```

Generate or update the product file from the current configured product template. Map answers to the closest matching template headings, preserve the template's links to the configured feature inventory and tech-stack paths, and leave empty unknown sections as `To be defined.`.

When updating an existing product file, preserve non-empty sections that the user did not ask to replace.

### 3. Gather Feature Inventory

For the configured feature inventory, read `paths.featuresTemplate` immediately before writing.

If `STRATEGY.md` exists, use its tracks, metrics, or priorities to suggest feature groups. Ask the user to confirm before writing the feature inventory.

Ask one interview cluster at a time:

```text
What foundation or setup capabilities must exist before the first usable version?

Include configuration, import/migration, identity/access, data model, install/bootstrap, admin setup, or integration prerequisites. Say "none" if there are none.
```

```text
What features make the first usable version actually useful?

For each feature, include the user outcome, the main artifact or interaction, and why it belongs in the first release.
```

```text
What features should be tracked after the first usable version?

Separate likely next-phase work from speculative future work, and mention any features that are intentionally deferred. Say "none yet" if there are none.
```

```text
What dependencies or sequencing constraints matter between these feature groups?

Call out features that must happen before others, external prerequisites, risky unknowns, or work that can happen independently.
```

Assign stable feature IDs by feature group:

- Foundation/setup: `F-0xx`
- First usable version: `F-1xx`
- Future or additional groups: `F-2xx`

Before assigning IDs, scan the configured feature inventory and existing feature folders. Choose the next unused ID in the correct phase band and never renumber existing features.

Generate or update the configured feature inventory from the current configured features template. Remove placeholder/example feature entries from the template output, fill feature groups, checklist rows, progress totals, and inventory links from the interview answers, and preserve existing user-authored inventory entries unless the user chose to replace the file.

For each newly listed feature, create a lightweight feature guide stub only when the configured feature file does not already exist:

- Read `paths.featureTemplate` immediately before writing.
- Fill feature ID, phase, status, title, and summary when known.
- Leave deeper sections such as scope, acceptance, dependencies, and detailed outputs as `To be defined.` unless the user already provided that information.
- Do not invent use cases or detailed acceptance checks in this skill.
- Do not create `f-nxx-final.md` files.

Use `plan-feature` after this workflow to deepen any individual feature guide.

### 4. Gather Tech Stack

For the configured tech-stack file, read `paths.techStackTemplate` immediately before writing.

If an existing tech-stack file is present and the user has not chosen "start fresh", summarize it and ask:

```text
I found existing tech stack information.

[Brief summary]

Does this product use this stack?
1. Yes, use it as-is
2. Mostly, but I will add changes
3. No, I will specify the stack

Choose 1, 2, or 3.
```

If the user needs to specify the stack, ask one light-touch interview cluster:

```text
What tech-stack context should be documented, if any?

Include known languages, runtimes, frameworks, storage, hosting, package managers, key tools, and important unknowns. If this is too early to decide, say "not decided yet".
```

Generate or update the configured tech-stack file from the current configured tech-stack template. Fill the template with the stack answer or confirmed existing stack summary, preserve existing non-empty sections that the user did not ask to replace, and avoid adding implementation standards that were not already in the template or user answer.

### 5. Confirm Completion

After writing files, report the actual configured paths created or updated:

```text
plan-product documentation created or updated:

- .plan-product/config.json, if created or repaired
- <productPath>, if created or updated
- <featuresPath>, if created or updated
- <techStackPath>, if created or updated
- STRATEGY.md, if used
- CONCEPTS.md, if used
- <featurePath>, for each feature stub created

Use plan-feature to deepen any individual feature and plan-use-case to add concrete use cases.
```

If the configured roadmap file from `paths.roadmap` exists and the feature inventory changed, remind the user to run `plan-roadmap` so slice coverage stays in sync. Do not edit the roadmap in this skill.

## Notes

- Keep feature names user-facing and short.
- Prefer stable feature IDs over renumbering after the first write.
- If a feature list is ambiguous, create a clean first pass and mark uncertain details as `To be defined.`.
- If the user wants strategy or glossary work, create or update `STRATEGY.md` and `CONCEPTS.md` after the core three files, not before.
