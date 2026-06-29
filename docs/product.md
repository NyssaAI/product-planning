# Product

dev-tools is **ai-plan** — a repository-agnostic code/module-graph generator for coding agents. It
scans a repo and produces scoped planning context under `docs/agent-plan/context/`: a code map
(symbol + endpoint index), a module map (dependency graph), and a per-module architecture file for
each detected module.

## Problem

Coding agents plan better when they load the minimum relevant context instead of the whole
codebase. ai-plan auto-detects modules, code roots, and endpoint surfaces from three product docs
(`docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md`) and emits progressive-disclosure
context: L0 task → L1 in-scope module file → L2 product docs → L3 code map. The
`using-ai-plan` skill is the canonical guide and the `/ai-plan` command runs generation. It ships
across Claude Code, Cursor, Codex, OpenCode, and Gemini.
