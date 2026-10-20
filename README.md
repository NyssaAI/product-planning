# plan-product

Version **0.1.0**. Guided product planning in Markdown: define the product, describe features, capture use cases, and sequence delivery outcomes.

## Capabilities

The plugin operates as an **Encapsulated Facade**: the `plan-product` skill serves as the single conversational entrypoint, delegating to focused internal workflows, accompanied by four direct slash commands:

| Command / Workflow | Purpose | Runbook |
| :--- | :--- | :--- |
| `plan-product` | Define or refresh product purpose, audience, feature inventory, and high-level technology context. | `workflows/product.md` |
| `plan-feature` | Define one capability, its boundaries, inputs, outputs, acceptance checks, and dependencies. | `workflows/feature.md` |
| `plan-use-case` | Capture an actor workflow, entry route, process tree, alternatives, failures, and acceptance checks. | `workflows/use-case.md` |
| `plan-roadmap` | Sequence product deliverables with stable IDs, dependencies, and observable acceptance checkpoints. | `workflows/roadmap.md` |

The workflows interview for missing information, preserve existing content, use configured paths and current templates, and check for conflicting or duplicate ownership. Roadmaps describe delivery outcomes; engineering execution belongs to the user's development workflow.

## Installation

The plugin is listed in the [jamaynor marketplace](https://github.com/jamaynor/plugin-marketplace). Install `plan-product` from that marketplace in your host. The release is pinned there by tag and commit.

In Claude Code:

```text
/plugin marketplace add jamaynor/plugin-marketplace
/plugin install plan-product@jamaynor
```

Claude Code uses `.claude-plugin/plugin.json` and the command entrypoints in `commands/`. Cursor uses `.cursor-plugin/plugin.json`, `commands/`, and `skills/`. Gemini uses `gemini-extension.json` and `GEMINI.md`.

### Codex usage

Install the native plugin from the marketplace and invoke the facade skill:

- `plan-product:plan-product`

Codex uses `.codex-plugin/plugin.json` and `skills/`. Direct command aliases are host-specific; use the installed skill entrypoint or specify desired workflows directly.

## Project setup

From the target repository root, run the bundled initializer with Node.js 22 or later:

```text
node <installed-plugin-root>/scripts/init.mjs
```

Resolve the installed plugin root from `PLAN_PRODUCT_PLUGIN_ROOT`, `PLUGIN_ROOT`, `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or the installed skill directory. This location is runtime context; do not put installation-specific absolute paths in committed configuration. There are no third-party runtime dependencies and no package installation step is needed for initialization.

The initializer creates missing configuration, schema, six templates, and the three core document starters. Re-running it fills missing configuration fields and restores missing templates at their configured locations. Existing documents, schemas, and templates are preserved. A custom template seeds a missing core document. Invalid configuration, path escapes, and output collisions fail before writing assets.

```text
<repo>/
|-- .plan-product/
|   |-- config.json
|   |-- schema.json
|   `-- templates/
|       |-- product.md
|       |-- features.md
|       |-- tech-stack.md
|       |-- feature.md
|       |-- use-case.md
|       `-- roadmap.md
`-- docs/
    |-- product.md
    |-- features.md
    |-- tech-stack.md
    |-- roadmap.md                  Created by plan-roadmap.
    `-- features/                  Created as features are defined.
        `-- f-101/
            |-- feature.md
            `-- uc-001-example.md  Created by plan-use-case.
```

All paths are relative to the target repository root. `.plan-product/config.json` owns document locations, template locations, feature naming, and roadmap naming. Customize those paths before planning. Existing documents remain in their current locations; changing a path does not move them automatically.

Optional `STRATEGY.md` and `CONCEPTS.md` provide upstream direction and vocabulary. The initializer does not create or edit repository agent instructions.

## Development and evaluation

From a source checkout:

```text
npm test
npm run assemble
npm run eval:prepare
npm pack --dry-run
```

Tests exercise fresh setup, custom paths and templates, preservation, safe failure, package contents, and the planning facade. The [evaluation suite](evals/scenarios/product-planning) retains planning rubrics and adds document-producing tasks for each workflow.

## License

[Commercial license](LICENSE).
