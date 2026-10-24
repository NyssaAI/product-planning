# plan-product

## Purpose

Turn product conversations into clear, durable planning documents that keep everyone aligned on what is being built and why.

## Audience

Product owners, founders, and teams collaborating with an assistant to clarify a product, organize its capabilities, and sequence how it gets delivered.

## Problem

Product decisions scattered across conversations quickly lose scope boundaries, user needs, dependencies, and proof of completion. Mixing build-order assumptions into feature organization also breaks down as a product grows, and regenerating documents from generic formats risks erasing decisions a team has already made.

## Solution

Guided interviews capture the overall product vision, organize related capabilities into functional groups, map step-by-step user workflows as use cases, and sequence delivery into phased steps with verifiable checkpoints. Existing notes and custom document layouts are always preserved, and older planning sets can be upgraded cleanly as conventions evolve.

## Boundaries

The product covers product definition, capability scoping, user workflow mapping, and delivery sequencing. Detailed engineering design and code execution belong to the team's development workflow.

## Success

Stakeholders can read the product and feature documents without needing technical background, related capabilities stay grouped together as the catalog scales, overlapping or duplicate workflows are caught before work begins, and every delivery step has an observable way to verify completion.

## Core Concepts & Macro-Flows

- [C-01: Canonical Planning Taxonomy & Hierarchy](concepts/c-01-canonical-planning-taxonomy.md) — five-tier model (`Product`, `C-nn`, `F-gg.nn`, `UC-gg.nn.uu`, `R-pp.ss`) separating functional capability grouping from technical delivery order.
- [C-02: End-to-End Product Planning Lifecycle](concepts/c-02-product-planning-lifecycle.md) — five-stage macro-flow from workspace setup and product discovery through feature boundary hardening, use-case mapping, and roadmap sequencing.
- [C-03: Path Authority & Non-Destructive Preservation](concepts/c-03-path-authority-and-preservation.md) — repo-relative path resolution, template-only detection, and merge-by-heading preservation of user-authored notes.

## Features

See the [feature inventory](features.md) and [feature guides](features/README.md).

## Tech Stack

See [technology context](tech-stack.md).
