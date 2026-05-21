# Roadmap

dev-tools is maintained by jamaynor as a multi-platform agent workflow plugin (skills, standards, ai-plan, hooks).

## Recent direction

- Consolidated standards and ai-plan into a single plugin (v5.0.8)
- Single entrypoint for bug workflow (`fix-bug`)
- Single entrypoint for plan execution (`execute-plan`)
- Verb-named workflow skills (`design-spec`, `add-backlog`, `write-plan`, `execute-plan`, `fix-bug`)
- Worktree hard gate and required PR at branch finish

## Conventions

- Spec output: `docs/specs/`
- Plan output: `docs/plans/`
- Tests directory: `test/` (maintainer evals; not shipped to end users)
- Plugin docs: `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md`

## Maintenance

Selective merges from upstream skill ecosystems when useful — keeping jamaynor path conventions and bundled standards intact.
