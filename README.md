# dev-tools

dev-tools is **ai-plan** — a repository-agnostic code/module-graph generator for coding agents.
It scans your repo and produces scoped planning context: a **code map** (symbol + endpoint
index), a **module map** (dependency graph), and a **per-module architecture file** for each
module. Agents load the minimum context they need to plan a change, instead of the whole codebase.

It runs across five agent runtimes — Claude Code, Cursor, Codex, OpenCode, and Gemini.

## What it generates

Outputs land under `docs/agent-plan/context/` in your repository:

| Output | Purpose |
|--------|---------|
| `modules/<id>.md` | **Primary artifact** — one module's architecture (boundaries, `dependsOn`/`usedBy`, routes, test roots, sample symbols) |
| `module-map.json` | Module dependency graph for task ordering |
| `code-map.json` | Symbol index + endpoint index (HTTP routes, MCP tools/resources/prompts) |
| `index.md` | Progressive-disclosure guide to the module set |

The only required inputs are three product docs: `docs/product.md`, `docs/roadmap.md`,
`docs/tech-stack.md`. Everything else (modules, code roots, endpoint surfaces) is auto-detected.

## How agents use it

Progressive disclosure — load context in levels, never all at once:

- **L0** the task description
- **L1** the in-scope `modules/<id>.md` file(s) for the area being changed
- **L2** the product docs, when product context is needed
- **L3** `code-map.json`, only after the plan names specific symbols

The **`dev-tools:using-ai-plan`** skill is the canonical guide to this workflow and staleness rules.

## Installation

**Note:** Installation differs by platform. Claude Code and Cursor have built-in plugin
marketplaces. Codex and OpenCode require manual setup.

### Claude Code (via Plugin Marketplace)

In Claude Code, register the marketplace first:

```bash
/plugin marketplace add https://github.com/jamaynor/plugin-marketplace.git
```

Then install the plugin from this marketplace (the marketplace is named `jamaynor`):

```bash
/plugin install dev-tools@jamaynor
```

### Cursor (via Plugin Marketplace)

In Cursor Agent chat, install from marketplace:

```text
/add-plugin dev-tools
```

or search for "dev-tools" in the plugin marketplace.

### Codex

Codex discovers skills from `~/.agents/skills/` at startup. dev-tools is exposed via one symlink:

```text
~/.agents/skills/dev-tools/ → ~/.codex/dev-tools/skills/
```

**Prerequisites:** Git

1. Clone the repo:

```bash
git clone https://github.com/jamaynor/dev-tools.git ~/.codex/dev-tools
```

2. Create the skills symlink:

```bash
mkdir -p ~/.agents/skills
ln -s ~/.codex/dev-tools/skills ~/.agents/skills/dev-tools
```

**Windows (PowerShell):**

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.agents\skills"
cmd /c mklink /J "$env:USERPROFILE\.agents\skills\dev-tools" "$env:USERPROFILE\.codex\dev-tools\skills"
```

3. Restart Codex (skills are discovered at startup).

**Verify:** `ls -la ~/.agents/skills/dev-tools` (symlink/junction to your skills directory).

**Update:** `cd ~/.codex/dev-tools && git pull` (instant via symlink).

**Uninstall:** `rm ~/.agents/skills/dev-tools` (Windows: `Remove-Item "$env:USERPROFILE\.agents\skills\dev-tools"`). Optionally remove `~/.codex/dev-tools`.

**Troubleshooting:** If skills don't appear — check symlink, confirm `~/.codex/dev-tools/skills` exists, restart Codex. On Windows, run PowerShell as admin if junction creation fails.

### OpenCode

Add dev-tools to the `plugin` array in `opencode.json` (global or project-level):

```json
{
  "plugin": ["dev-tools@git+https://github.com/jamaynor/dev-tools.git"]
}
```

Restart OpenCode. The plugin auto-installs and registers the skill.

**Verify:** `use skill tool to load dev-tools/using-ai-plan`.

**Personal skills:** `~/.config/opencode/skills/<name>/SKILL.md`. **Project skills:** `.opencode/skills/` in your repo. Priority: project > personal > dev-tools.

**Update:** Restarts re-install from git. Pin a version:

```json
{
  "plugin": ["dev-tools@git+https://github.com/jamaynor/dev-tools.git#v6.4.0"]
}
```

**Troubleshooting:** `opencode run --print-logs "hello" 2>&1 | grep -i dev-tools` — confirm the plugin loads and `opencode.json` is correct.

### Gemini CLI

```bash
gemini extensions install https://github.com/jamaynor/dev-tools
```

To update:

```bash
gemini extensions update dev-tools
```

### Verify Installation

In a repo that has `docs/product.md`, `docs/roadmap.md`, and `docs/tech-stack.md`, run `/ai-plan`
(or ask your agent to "generate the ai-plan context"). It should produce
`docs/agent-plan/context/` with `index.md`, `module-map.json`, `code-map.json`, and `modules/`.

## Usage

Bootstrap once in a project repo, then regenerate after module structure changes
(`<PLUGIN_ROOT>` = `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or the installed plugin directory):

```bash
# One-time bootstrap (scaffolds docs, configs, and project scripts)
node "<PLUGIN_ROOT>/scripts/ai-plan/generate.mjs" --init --write-scripts

# Regenerate the code map + module graph
node "<PLUGIN_ROOT>/scripts/code-map/generate-code-map.mjs"
node "<PLUGIN_ROOT>/scripts/ai-plan/generate.mjs"

# Check runtime readiness
node "<PLUGIN_ROOT>/scripts/ai-plan/generate.mjs" --doctor
```

After `--init --write-scripts`, the project gets `npm run ai-plan` for one-command regeneration.
**@ast-grep/cli** is bundled with the plugin and auto-installs into the plugin root on first
`code-map` run — do not add it to your project repo. Maintainer details:
[`scripts/ai-plan/README.md`](scripts/ai-plan/README.md).

## Repo layout (your projects)

Required docs: `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` (optionally
`docs/features.md`). Generated context lands under `docs/agent-plan/context/`.

**This plugin repo** dogfoods ai-plan with the same layout: [docs/product.md](docs/product.md),
[docs/roadmap.md](docs/roadmap.md), [docs/tech-stack.md](docs/tech-stack.md). Maintainer index:
[docs/README.md](docs/README.md). Tests live in `test/` (not shipped to end users).

## Contributing

1. Fork the repository
2. Create a branch for your change
3. Run the test suite (see [docs/testing.md](docs/testing.md))
4. Submit a PR

## License

Jamaynor Commercial License v1.0 — see [LICENSE](LICENSE) for details.

You may use the Software for your own purposes at no charge for Personal Use,
or for other use when no Commercial License trigger applies. You may not
redistribute the Software or grant others the right to use it.

A separate Commercial License is required if either:

- the Project's Associated Revenue exceeds USD $1,000,000 in the preceding
  twelve months; or
- a Business with Business Revenue exceeding USD $10,000,000 in the preceding
  twelve months uses the Software for software development, internal or
  external.
