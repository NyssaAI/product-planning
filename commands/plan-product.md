---
description: Interview the user and create or update plan-product's core product docs (product, features, tech-stack).
argument-hint: "[what to define or update]"
---

# plan-product - define product docs

Load the `plan-product` skill and follow its workflow. The skill owns the interview flow, the product-capsule confirmation, feature-ID banding, and the merge-by-heading preservation rules; this command file is only the entry point.

Interview the user and create or update plan-product's core product docs.
Use `.plan-product/config.json` for paths and verify the configured templates
exist before writing so template refinements are picked up automatically.

## Writes

- `.plan-product/config.json`
- the configured product doc path, usually `docs/product.md`
- the configured feature inventory path, usually `docs/features.md`
- the configured tech-stack path, usually `docs/tech-stack.md`
- configured feature guide stubs from `structure.features.featurePathPattern`

Use the current templates named in `.plan-product/config.json`; do not
duplicate template content in the command or skill.
