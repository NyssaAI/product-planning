# Product

dev-tools is a plugin that provides a complete software development workflow for coding agents, bundled jamaynor development standards, and ai-plan code/module graph tooling.

## Problem

Coding agents produce better results when they follow structured workflows (design, isolated branch, plan with module graph context, implement, pull request) instead of ad-hoc code generation on main. dev-tools encodes these workflows as composable skills that activate automatically based on context. Feature work uses a worktree and feature branch before any implementation plan is written; **writing-plans** consumes one `docs/ai-plan/scopes/<module>.md` from the bundled ai-plan generators when the repo has code; completed work is integrated via a required pull request unless the user explicitly overrides in project instructions.
