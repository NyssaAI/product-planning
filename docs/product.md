# Product

dev-tools is a plugin that provides a complete software development workflow for coding agents, bundled jamaynor development standards, and ai-plan code/module graph tooling.

## Problem

Coding agents produce better results when they follow structured workflows (design, isolated branch, plan with module graph context, implement, pull request) instead of ad-hoc code generation on main. dev-tools encodes these workflows as five user-facing entry points (`plan-product`, `add-backlog`, `design-spec`, `execute-plan`, `fix-bug`). Feature work uses a worktree and feature branch before any implementation plan is written; **design-spec** invokes internal **write-plan**, which consumes one `docs/ai-plan/scopes/<module>.md` when the repo has code (via automatic **using-ai-plan**); completed work is integrated via a required pull request unless the user explicitly overrides in project instructions.
