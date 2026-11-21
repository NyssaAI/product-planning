---
description: Interview the user and create or update plan-product's core product docs (product, glossary, features, tech-stack).
argument-hint: "[what to define or update]"
---

> [!IMPORTANT] Scope Directive
> Entrypoint command for defining core product docs. Invokes the `plan-product` facade skill and executes its internal `references/workflow-product.md` runbook.

# plan-product - define product docs

Load the `plan-product` skill and execute its `references/workflow-product.md` runbook. The workflow owns the interview flow, product capsule confirmation, Ubiquitous Language seeding, feature-ID banding, and merge-by-heading preservation rules; this command file is only the entry point.

Interview the user and create or update plan-product's core product docs.
Resolve paths and starter templates via zero-footprint 3-layer precedence (`plugin_root` defaults -> `~/.nyssa-ai/plan-product/` -> optional `<repo_root>/.nyssa-ai/plan-product/` override, never writing `.nyssa-ai/plan-product/` into `repo_root` unless explicitly requested) and read each resolved template immediately before writing.

## Invocation Context

Target / focus: $ARGUMENTS

## Writes

- the configured product doc path, usually `docs/product.md`
- the configured Ubiquitous Language glossary path, usually `docs/GLOSSARY.md`
- the configured feature inventory path, usually `docs/features.md`
- the configured tech-stack path, usually `docs/tech-stack.md`
- configured feature guide stubs from `structure.features.featurePathPattern`
- `.nyssa-ai/plan-product/config.json` (only when explicitly requested for non-default paths)

Use the resolved templates (`plugin_root` defaults -> `user_home` -> optional `repo_root` override); do not
duplicate template content in the command or skill. Write `product.md` and `features.md` in plain, non-technical user-outcome and use-case language (with no links in `## Feature Checklist Summary`), and keep technology selections strictly in `tech-stack.md`. Enforce canonical feature naming across the inventory: Title Case, active verbs, and user safeguards/protections (banning plumbing jargon like "surgical", "storage", "ingestion", or "syndication" while permitting "canonical", and banning vague 1-2 word stubs).
