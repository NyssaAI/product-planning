# Workflow: Product Definition & Core Inventory

> [!IMPORTANT] Scope Directive
> This workflow establishes or refreshes foundational product planning documents (`docs/product.md`, `docs/features.md`, `docs/tech-stack.md`) through an interactive discovery interview. It owns product-level capsules, feature grouping, stable ID banding (`F-gg.nn`), and tech-stack context. It delegates individual feature elaboration to `workflows/feature.md` and workflow trees to `workflows/use-case.md`.

---

## Operating Rules

- Reuse information and approval already supplied by the user. Interview only for missing decisions; do not repeat a confirmation already given.
- Configured paths are repo-relative. Render Markdown links relative to the document containing the link, and verify each target exists before completion.
- Read `.plan-product/config.json` first. If missing, bootstrap by executing `node "${PLUGIN_ROOT}/scripts/init.mjs"` from the target project root, then re-read config. Resolve `${PLUGIN_ROOT}` from `PLAN_PRODUCT_PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, `PLUGIN_ROOT`, or the relative path to this installed plugin.
- Resolve every output path from config before interviewing. Do not hardcode `docs/product.md`, `docs/features.md`, or `docs/tech-stack.md` except as examples in user-facing text.
- Verify configured templates exist before writing:
  - Product doc: `paths.productTemplate`
  - Feature inventory: `paths.featuresTemplate`
  - Tech stack: `paths.techStackTemplate`
  - Feature guide stubs: `paths.featureTemplate`
- If a required template is missing, run `node "${PLUGIN_ROOT}/scripts/init.mjs"` (resolving `${PLUGIN_ROOT}` as above) to restore bundled templates at their configured paths.
- Ask one blocking question at a time. In Codex, present numbered choices in chat and wait for the user answer. If runtime provides an AskUserQuestion tool, use that tool.
- If the user says "skip", "unknown", or gives a very brief answer, write `To be defined.` only into empty target sections. Never replace existing non-empty content with `To be defined.`.
- Preserve existing user-authored content unless the user chooses to replace that file. For updates, merge by section heading and preserve unmatched sections, comments, links, and local notes.
- A core doc whose content is identical to its configured template is treated as `template only`; overwrite it from the interview without confirmation.
- Create only lightweight feature guide stubs in this workflow; use `workflows/feature.md` to deepen individual features.
- Do not create use-case files during this workflow unless the user explicitly requests it.
- Keep tech-stack capture light-touch. Record high-level stack context and unknowns; do not establish language-specific engineering standards.

---

## Config Resolution

| Purpose | Config field |
| :--- | :--- |
| Product definition | `paths.product` |
| Feature inventory | `paths.features` or `structure.features.inventory` |
| Tech stack | `paths.techStack` |
| Feature guide root | `structure.features.root` or `paths.featureDocs` |
| Feature guide path | `structure.features.featurePathPattern` |
| Product template | `paths.productTemplate` |
| Feature inventory template | `paths.featuresTemplate` |
| Tech stack template | `paths.techStackTemplate` |
| Feature guide template | `paths.featureTemplate` |

If a config field is missing, fill only the missing field with the default, preserving extra existing config keys.

---

## Procedure

### 1. Check Existing Docs
Check the configured product, feature inventory, and tech-stack files. Compare each against its configured template; a byte-identical copy is `template only`.

If any file exists with real content, prompt the user:
```text
I found existing plan-product documentation:
- <productPath>: [exists/template only/missing]
- <featuresPath>: [exists/template only/missing]
- <techStackPath>: [exists/template only/missing]

Would you like to:
1. Start fresh and replace the selected core files
2. Update specific core files
3. Cancel
```

When every existing file is `template only`, proceed as a fresh run without prompting.

### 2. Gather Product Definition
Read `paths.productTemplate` immediately before writing. If `STRATEGY.md` exists, summarize relevant direction. If `CONCEPTS.md` exists, reuse its terminology.

Interview clusters:
1. **Product Identity**: Name, category, and one-sentence core value proposition.
2. **Audience**: Primary users, secondary users, operators, or automated agents.
3. **Problem & Gap**: Current pain points, existing workarounds, failure points.
4. **Solution Shape**: Minimal useful version, primary workflow, rejected alternatives.
5. **Boundaries & Non-Goals**: Adjacent responsibilities explicitly excluded.
6. **Success Signals**: Measurable outcomes and quality signals.

Before writing, present the synthesized product capsule for confirmation:
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

### 3. Gather Feature Inventory
Read `paths.featuresTemplate` immediately before writing.

Interview clusters:
1. **Foundation / Setup Capabilities**: Prerequisite setup, schema, auth, or bootstrap work.
2. **First Usable Version Features**: Features providing immediate value in v1.
3. **Subsequent Features**: Next-phase and deferred capabilities.
4. **Dependencies**: Sequencing constraints between feature groups.

Assign stable feature IDs by group:
- Foundation / Setup: `F-00.01` .. `F-00.99` (`### Group 00: Foundation`)
- Functional Groups: `F-01.01` .. `F-99.99` (`### Group gg: <Group Name>`)

Write `paths.features` for the user:
- Use non-technical, use-case language describing what users can accomplish (never internal config keys or implementation jargon).
- In `## Feature Checklist Summary`, write only `- [ ] F-gg.nn: Feature Title` under each `### Group gg: <Group Name>` heading—do **not** put links or descriptions in the checklist summary.
- In `## Feature Inventory`, write the plain-language description and `[Feature Guide: <Title>](features/f-gg.nn/feature.md)` link under each `### Group gg: <Group Name>` heading.

For each newly added feature, write a lightweight feature guide stub if it does not already exist:
- Read `paths.featureTemplate` immediately before writing.
- Populate ID (`F-gg.nn`), Group (`gg`), Status, Title, and Summary.
- Leave deeper sections (`Scope`, `Acceptance`, `Dependencies`) as `To be defined.`.

### 4. Gather Tech Stack
Read `paths.techStackTemplate` immediately before writing.

If existing tech stack exists, summarize and confirm. If specifying:
- Capture runtime languages, frameworks, storage, hosting, and key tools.
- Capture critical architectural unknowns.

### 5. Exit Verification
Execute the verification checklist before completing.

---

## Verification Checklist

- [ ] All target paths resolved from `.plan-product/config.json`.
- [ ] Configured templates read immediately prior to write.
- [ ] Product capsule confirmed by user prior to writing.
- [ ] Feature IDs assigned according to Feature Groups (`F-gg.nn`) with no renumbering.
- [ ] Feature inventory written in non-technical, use-case language with no links in `## Feature Checklist Summary`.
- [ ] Feature inventory links in `## Feature Inventory` point to real or newly stubbed feature guide paths.
- [ ] Existing user-authored sections and notes preserved during updates.
- [ ] Reported all created or updated paths to user.
