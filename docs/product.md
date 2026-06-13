# Product

dev-tools is a plugin that provides a complete software development workflow for coding agents, bundled jamaynor development standards, and ai-plan code/module graph tooling.

## Problem

Coding agents produce better results when they follow structured workflows (design, isolated branch, plan with module graph context, implement, pull request) instead of ad-hoc code generation on main. dev-tools encodes these workflows as six user-facing entry points (`plan-product`, `add-backlog`, `add-bug`, `design-spec`, `execute-plan`, `fix-bug`). Feature work uses a worktree and feature branch before any implementation plan is written; **fix-bug** is the bug-only orchestrator and may use a direct TDD path only for simple one-file bugs, while complex bugs route through **design-spec** and **execute-plan**. **design-spec** invokes internal **write-plan**, which consumes one `docs/ai-plan/scopes/<module>.md` when the repo has code (via automatic **using-ai-plan**); **execute-plan** opens the required pull request, routes review feedback through **receiving-code-review** before applying requested changes, and later owns post-review closeout, including regression checks, merge, and cleanup, unless the user explicitly overrides in project instructions.
