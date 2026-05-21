# Product

dev-tools is a plugin that provides a complete software development workflow for coding agents, bundled jamaynor development standards, and ai-plan code/module graph tooling.

## Problem

Coding agents produce better results when they follow structured workflows (design, isolated branch, plan with module graph context, implement, pull request) instead of ad-hoc code generation on main. dev-tools encodes these workflows as composable skills with verb-named entry points (`design-spec`, `write-plan`, `execute-plan`, `fix-bug`, `add-backlog`). Feature work uses a worktree and feature branch before any implementation plan is written; **write-plan** consumes one `docs/ai-plan/scopes/<module>.md` when the repo has code (via automatic **using-ai-plan** during design-spec); completed work is integrated via a required pull request unless the user explicitly overrides in project instructions.
