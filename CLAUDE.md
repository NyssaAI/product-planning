# dev-tools — Project Notes

Same content as **AGENTS.md** (Codex/OpenCode/Gemini read AGENTS.md; Claude Code reads this file).

This is the **dev-tools plugin** source (skills, standards, hooks, scripts) — a private repo.

## Dependencies

dev-tools ships one bundled plugin dependency: **`@ast-grep/cli`** for ai-plan/code-map (auto-installs into the plugin root on first use). Avoid adding further third-party dependencies unless adding support for a new harness (e.g., a new IDE or CLI tool); other external tools or services belong in their own plugin.

## Skill changes shape agent behavior

Skills are not prose — they are code that shapes agent behavior. If you modify skill content:

- Use `dev-tools:writing-skills` to develop and test changes
- Run adversarial pressure testing across multiple sessions before relying on the result
- Carefully-tuned content (Red Flags tables, rationalization lists, "human partner" terminology) is deliberate — change it only with evidence the change is an improvement

## Plugin repo layout

This repository is the **dev-tools plugin** (skills, standards, hooks, scripts) — not a consumer application repo, but it follows the same `docs/product.md`, `docs/roadmap.md`, and `docs/tech-stack.md` layout as `standards/project-structure.md`. Do not apply consumer-repo `plan-product` scaffolding (e.g. `src/` trees, backlog folders) blindly to this repo.

## Bundled first-party content

jamaynor **standards** and **ai-plan** ship inside dev-tools by design. This is first-party bundled content, not third-party plugin sprawl. Optional `@ast-grep/cli` in the plugin root supports ai-plan code-map generation.

<!-- ai-plan:module-map:start -->
## Module map (auto-updated — do not edit)

| Module | What it does | Owns | Module file |
|--------|--------------|------|-------------|
| hooks | `hooks` — 1 file under `hooks/`. | Code under `hooks/` | `docs/agent-plan/context/modules/hooks.md` |
| opencode | `.opencode` — 1 file under `.opencode/`. | DevToolsPlugin | `docs/agent-plan/context/modules/opencode.md` |
| scripts | `scripts` — 1 file under `scripts/`. | Code under `scripts/` | `docs/agent-plan/context/modules/scripts.md` |
| scripts-ai-plan | `ai-plan` — 35 files under `scripts/ai-plan/`. | ADAPTERS; API_ROUTE_CANDIDATES; CODE_ROOT_CANDIDATES | `docs/agent-plan/context/modules/scripts-ai-plan.md` |
| scripts-code-map | `code-map` — 7 files under `scripts/code-map/`. | DEFAULT_SCAN_ROOTS; SOURCE_EXTENSIONS; SUPPORTED_LANGUAGES | `docs/agent-plan/context/modules/scripts-code-map.md` |
| scripts-lib | `lib` — 2 files under `scripts/lib/`. | findPluginRoot; resolveAstGrepBinary | `docs/agent-plan/context/modules/scripts-lib.md` |
| skills | `skills` — 4 files under `skills/`. | waitForEvent; waitForEventCount; waitForEventMatch | `docs/agent-plan/context/modules/skills.md` |
| test | `test` — 26 files under `test/`. | Code under `test/` | `docs/agent-plan/context/modules/test.md` |
<!-- ai-plan:module-map:end -->
