# plan-product

## Purpose

Turn product conversations into clear, durable planning documents that keep everyone aligned on what is being built and why.

## Audience

Product owners, founders, and teams collaborating with an assistant to clarify a product, align on shared domain terms, organize its capabilities, and sequence how it gets delivered.

## Problem

Product decisions scattered across conversations quickly lose scope boundaries, user needs, domain terminology, dependencies, and proof of completion. Mixing build-order assumptions into feature organization also breaks down as a product grows, and regenerating documents from generic formats risks erasing decisions a team has already made.

## Solution

Guided interviews capture the overall Product Vision, seed and maintain a shared Ubiquitous Language glossary, organize related capabilities into functional Feature Groups, map step-by-step user workflows as use cases, and sequence delivery into a phased Development Plan with verifiable checkpoints. Existing notes and custom document layouts are always preserved, and older planning sets can be upgraded cleanly as conventions evolve.

## Boundaries

The product covers product definition, Ubiquitous Language curation, capability scoping, user workflow mapping, and development plan sequencing. Detailed engineering slice design and code execution belong to `dev-delivery`.

## Success

Stakeholders can read the product and feature documents without needing technical background, related capabilities stay grouped together as the catalog scales, overlapping or duplicate workflows are caught before work begins, and every development plan step has an observable way to verify completion.

## Core Concepts & Macro-Flows

- [C-01: Canonical Planning Taxonomy & Hierarchy](concepts/c-01-canonical-planning-taxonomy.md) — five-tier model (`Product Vision`, `C-nn`, `F-gg.nn`, `UC-gg.nn.uu`, `DP-pp.ss`) separating functional capability grouping from technical delivery order.
- [C-02: End-to-End Product Planning Lifecycle](concepts/c-02-product-planning-lifecycle.md) — five-stage macro-flow from workspace setup and product discovery through feature boundary hardening, use-case mapping, and development plan sequencing.
- [C-03: Path Authority & Non-Destructive Preservation](concepts/c-03-path-authority-and-preservation.md) — `user_home` -> `repo_root` path resolution, template-only detection, and merge-by-heading preservation of user-authored notes.

## Ubiquitous Language

See the [Ubiquitous Language glossary](GLOSSARY.md).

## Features & Delivery

See the [feature inventory](features.md) and [development plan](plans/development-plan.md).

## Tech Stack

See [technology context](tech-stack.md).
