# plan-product

Version **0.12.8**. Guided product planning in Markdown: define the product, seed and maintain Ubiquitous Language (`docs/GLOSSARY.md`), codify domain concepts and macro-flows, describe features, capture actor use cases, and sequence dependency-ordered development plans (`docs/plans/development-plan.md`) that hand off cleanly to `dev-delivery`.

## Capabilities

The plugin operates as an **Encapsulated Facade**: the `plan-product` skill serves as the single conversational entrypoint, delegating to focused internal workflows, accompanied by six direct slash commands:

| Command / Workflow | Purpose | Runbook |
| :--- | :--- | :--- |
| `plan-product` | Define or refresh product purpose, Ubiquitous Language (`docs/GLOSSARY.md`), feature inventory, and high-level technology context. | `workflows/product.md` |
| `plan-concept` | Define an atomic domain concept or cross-feature macro-flow (`C-nn`, `kind: domain-model` \| `flow`), reconciling Ubiquitous Language (`docs/GLOSSARY.md`). | `workflows/concept.md` |
| `plan-feature` | Define one capability (`F-gg.nn`), its boundaries, inputs, outputs, acceptance checks, and dependencies. | `workflows/feature.md` |
| `plan-use-case` | Capture an actor workflow (`UC-gg.nn.uu`), entry route, process tree, alternatives, failures, and acceptance checks. | `workflows/use-case.md` |
| `plan-development` | Sequence product deliverables in `docs/plans/development-plan.md` with stable `DP-pp.ss` IDs, conditional CodeGraph `Anchors:` (`docs/code-map/codegraph.db`), observable `- Verify:` checkpoints, and `dev-delivery` handoff. | `workflows/development-plan.md` |
| `plan-maintain` | Upgrade legacy product planning documents from Model v1 or `docs/roadmap.md` to Model v2, or reconcile document integrity. | `workflows/maintain.md` |

The workflows interview for missing information, preserve existing content, use configured paths (`user_home` -> `repo_root`) and current templates, align with Ubiquitous Language (`docs/GLOSSARY.md`), and check for conflicting or duplicate ownership. Development plans describe delivery outcomes and architectural briefing notes; technical slice planning (`docs/plans/dp-pp.ss-<slug>.md`), adversarial plan review (`plan-adversary`), and clean-context code execution belong to `dev-delivery` (with automatic `uc-*.md`, `feature.md`, and `docs/features.md` completion roll-up as `DP-pp.ss` steps finish).

## Canonical Numbering & Terminology Contract (v2)

| Numbering Pattern | Canonical Name | Segment Definitions | Path / Location |
| :--- | :--- | :--- | :--- |
| **`C-nn`**<br>*(e.g. `C-01`)* | **Concept ID** | • **`nn` = Concept Number** (`01`–`99`): Sequential atomic domain model or cross-feature macro-flow (`kind: domain-model` \| `flow`). | `docs/concepts/c-nn-short-slug.md` |
| **`F-gg.nn`**<br>*(e.g. `F-01.02`)* | **Feature ID** | • **`gg` = Feature Group** (`00`–`99`): Cohesive functional area / domain clustering related features (`00` = Foundation).<br>• **`nn` = Feature Number** (`01`–`99`): Sequential feature within that Feature Group. | `docs/features/f-gg.nn/feature.md` |
| **`UC-gg.nn.uu`**<br>*(e.g. `UC-01.02.01`)* | **Use Case ID** | • **`gg` = Feature Group** (`00`–`99`): Inherited from parent Feature.<br>• **`nn` = Feature Number** (`01`–`99`): Inherited from parent Feature.<br>• **`uu` = Use Case Number** (`01`–`99`): Sequential actor workflow within `F-gg.nn`. | `docs/features/f-gg.nn/uc-gg.nn.uu-short-slug.md` |
| **`DP-pp.ss`**<br>*(e.g. `DP-01.03`)* | **Development Plan Step ID** | • **`pp` = Phase** (`00`–`99` or `01`–`99`): Technical delivery stage in build order.<br>• **`ss` = Step** (`01`–`99`): Ordered unit of delivery work within Phase `pp` that completes/verifies target `UC-gg.nn.uu`s (or `F-gg.nn` fallback). | `docs/plans/development-plan.md` |

## Installation

The plugin is listed in the [NyssaAI marketplace](https://github.com/NyssaAI/plugin-marketplace). Install `plan-product` from that marketplace in your host. The release is pinned there by tag and commit.

In Claude Code:

```text
/plugin marketplace add NyssaAI/plugin-marketplace
/plugin install plan-product@nyssaai
```

Each host reads its projected `harness-adapter`: Claude Code uses `.claude-plugin/plugin.json` and `commands/`, Cursor uses `.cursor-plugin/plugin.json`, `commands/`, and `skills/`, Tessl uses `.tessl-plugin/plugin.json` and `./skills`, Gemini uses `gemini-extension.json` and `skills/`, Antigravity stages `.temp/dist/antigravity/` (with `commands/` projected as `plan-product-cmd-*` skills), and Hermes Agent stages `.temp/dist/hermes/` via `harness-adapters/hermes/plugin.py`.

### Codex usage

Install the native plugin from the marketplace and invoke the facade skill:

- `plan-product:plan-product`

Codex uses `.codex-plugin/plugin.json` and `skills/`. Direct command aliases are host-specific; use the installed skill entrypoint or specify desired workflows directly.

## Project setup

From `repo_root`, run the initializer with Node.js 22 or later:

```text
node <plugin_root>/src/init/init.mjs
```

Resolve `plugin_root` from `PLAN_PRODUCT_PLUGIN_ROOT`, `PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or the installed skill directory. Do not put installation-specific absolute paths in committed configuration. Configuration defaults resolve from `user_home` (`~/.nyssa-ai/plan-product/config.json`) and are overridden by `repo_root` (`<repo_root>/.nyssa-ai/plan-product/config.json`). `runtime_root` resolves via 4-step precedence (`--runtime-root` -> `NYSSA_RUNTIME_ROOT` -> `<persona_cwd>/.nyssa-ai/plan-product/runtime/` when `SOUL.md` and `IDENTITY.md` exist -> configured `runtimeRoot` or `.nyssa-ai/plan-product/runtime/`). Usage telemetry is opt-in (`"telemetry": { "enabled": false }` default), creating zero `usage/` directories or files unless `telemetry.enabled === true` (`<runtime_root>/usage/events.jsonl`).

The initializer creates missing configuration, schema, eight starter templates, and four core document starters (`docs/product.md`, `docs/GLOSSARY.md`, `docs/features.md`, `docs/tech-stack.md`). Re-running it fills missing configuration fields and restores missing templates at their configured locations while preserving existing user documents and custom templates.

```text
<repo_root>/
|-- .nyssa-ai/plan-product/
|   |-- config.json
|   |-- schema.json
|   |-- runtime/usage/              Gitignored mutable usage telemetry (runtime_root).
|   `-- templates/
|       |-- product.md
|       |-- glossary.md
|       |-- features.md
|       |-- tech-stack.md
|       |-- concept.md
|       |-- feature.md
|       |-- use-case.md
|       `-- development-plan.md
`-- docs/
    |-- GLOSSARY.md                 Ubiquitous Language glossary (seeded by init, shared with dev-standards).
    |-- product.md
    |-- features.md
    |-- tech-stack.md
    |-- code-map/codegraph.db       Optional tracked CodeGraph snapshot read by plan-development.
    |-- specs/                      Optional JSON specifications for business entities (DTOs) & interfaces.
    |-- learnings/                  Optional grounded project lessons read into development-plan Gotchas.
    |-- plans/
    |   |-- development-plan.md     Created by plan-development (DP-pp.ss steps).
    |   `-- dp-01.01-example.md     Durable implementation plans authored by dev-delivery.
    |-- concepts/                   Created by plan-concept.
    |   `-- c-01-example.md
    `-- features/                   Created as features are defined.
        `-- f-01.01/
            |-- feature.md
            `-- uc-01.01.01-example.md  Created by plan-use-case.
```

All committed paths are relative to `repo_root`. `.nyssa-ai/plan-product/config.json` owns document locations, template locations, feature naming, and development plan naming. Customize those paths before planning. Existing documents remain in their current locations; changing a path does not move them automatically.

## Development and evaluation

From a source checkout:

```text
npm run validate
npm run assemble
npm test
npm run eval:prepare
npm pack --dry-run
```

Tests in `test/unit/` and `test/use_case/` exercise path containment, `user_home` -> `repo_root` precedence, `runtime_root` routing, fresh setup, custom paths and templates, preservation, model migrations, package contents, and the planning facade. The [evaluation suite](evals/scenarios/product-planning) covers workflow routing and document-producing tasks across all six workflows.

## License

Licensed under the [Apache License 2.0](LICENSE). See [CHANGELOG.md](CHANGELOG.md) for release history.
