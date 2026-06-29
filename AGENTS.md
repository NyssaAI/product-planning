# dev-tools — Project Notes

Same content as **CLAUDE.md** (Claude Code reads CLAUDE.md; Codex/OpenCode/Gemini read this file).

This is the **dev-tools plugin** source — the ai-plan / code-map generators (under `scripts/`), the `using-ai-plan` skill, the `/ai-plan` command, and the per-harness adapters. A private repo.

## Dependencies

dev-tools ships one bundled plugin dependency: **`@ast-grep/cli`** for ai-plan/code-map (auto-installs into the plugin root on first use). Avoid adding further third-party dependencies unless adding support for a new harness (e.g., a new IDE or CLI tool); other external tools or services belong in their own plugin.

## Plugin repo layout

This repository is the **dev-tools plugin** (ai-plan/code-map generators under `scripts/`, the `using-ai-plan` skill, the `/ai-plan` command, and harness adapters) — not a consumer application repo, but it carries `docs/product.md`, `docs/roadmap.md`, and `docs/tech-stack.md` because it dogfoods its own ai-plan generation. Do not scaffold consumer-repo `src/` trees or backlog folders here.

## Bundled content

**ai-plan** (the code/module-graph generator) is the plugin's product. Optional `@ast-grep/cli` in the plugin root supports its code-map generation.

<!-- ai-plan:module-map:start -->
## Module map (auto-updated — do not edit)

Start at `docs/agent-plan/context/index.md` to pick the module set.

| Module | What it does | Owns | Module file |
|--------|--------------|------|-------------|
| hooks | `hooks` — 1 file under `hooks/`. | Code under `hooks/` | `docs/agent-plan/context/modules/hooks.md` |
| opencode | `.opencode` — 1 file under `.opencode/`. | DevToolsPlugin | `docs/agent-plan/context/modules/opencode.md` |
| scripts | `scripts` — 2 files under `scripts/`. | setupTestGate | `docs/agent-plan/context/modules/scripts.md` |
| scripts-ai-plan | `ai-plan` — 35 files under `scripts/ai-plan/`. | ADAPTERS; API_ROUTE_CANDIDATES; CODE_ROOT_CANDIDATES | `docs/agent-plan/context/modules/scripts-ai-plan.md` |
| scripts-code-map | `code-map` — 7 files under `scripts/code-map/`. | DEFAULT_SCAN_ROOTS; SOURCE_EXTENSIONS; SUPPORTED_LANGUAGES | `docs/agent-plan/context/modules/scripts-code-map.md` |
| scripts-lib | `lib` — 4 files under `scripts/lib/`. | BASE_SKIP_DIRS; findPluginRoot; parseScanJson | `docs/agent-plan/context/modules/scripts-lib.md` |
| scripts-test-gate | `test-gate` — 2 files under `scripts/test-gate/`. | detectPlaywright; detectTestCommands; resolveTestPlan | `docs/agent-plan/context/modules/scripts-test-gate.md` |
| skills | `skills` — 4 files under `skills/`. | waitForEvent; waitForEventCount; waitForEventMatch | `docs/agent-plan/context/modules/skills.md` |
| test | `test` — 29 files under `test/`. | Code under `test/` | `docs/agent-plan/context/modules/test.md` |
<!-- ai-plan:module-map generated 2026-06-17T23:19:44.300Z -->
<!-- ai-plan:module-map:end -->
