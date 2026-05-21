# dev-tools

dev-tools is a complete software development workflow for your coding agents: **process skills** (brainstorm → plan → TDD → PR), **jamaynor development standards** (bundled — no separate dev-standards plugin), and **ai-plan** code/module graph generators.

## How it works

It starts from the moment you fire up your coding agent. As soon as it sees that you're building something, it *doesn't* just jump into trying to write code. Instead, it steps back and asks you what you're really trying to do. 

Once it's teased a spec out of the conversation, it shows it to you in chunks short enough to actually read and digest. 

After you've signed off on the design, your agent puts together an implementation plan that's clear enough for an enthusiastic junior engineer with poor taste, no judgement, no project context, and an aversion to testing to follow. It emphasizes true red/green TDD, YAGNI (You Aren't Gonna Need It), and DRY. 

Next up, once you say "go", it launches a *subagent-driven-development* process, having agents work through each engineering task, inspecting and reviewing their work, and continuing forward. It's not uncommon for Claude to be able to work autonomously for a couple hours at a time without deviating from the plan you put together.

There's a bunch more to it, but that's the core of the system. And because the skills trigger automatically, you don't need to do anything special. Your coding agent just has dev-tools skills.


## Installation

**Note:** Installation differs by platform. Claude Code or Cursor have built-in plugin marketplaces. Codex and OpenCode require manual setup.

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

**Optional — subagent skills:** `dispatching-parallel-agents` and `subagent-driven-development` need Codex multi-agent:

```toml
[features]
multi_agent = true
```

**Verify:** `ls -la ~/.agents/skills/dev-tools` (symlink/junction to your skills directory).

**Update:** `cd ~/.codex/dev-tools && git pull` (instant via symlink).

**Uninstall:** `rm ~/.agents/skills/dev-tools` (Windows: `Remove-Item "$env:USERPROFILE\.agents\skills\dev-tools"`). Optionally remove `~/.codex/dev-tools`.

**Migrating from an old bootstrap install:** Pull latest, create the symlink (step 2), remove any `dev-tools-codex bootstrap` block from `~/.codex/AGENTS.md`, restart Codex.

**Troubleshooting:** If skills don't appear — check symlink, confirm `~/.codex/dev-tools/skills` exists, restart Codex. On Windows, run PowerShell as admin if junction creation fails.

Tell Codex to read this section:

```text
Fetch and follow the Codex installation section from https://raw.githubusercontent.com/jamaynor/dev-tools/refs/heads/main/README.md
```

### OpenCode

Add dev-tools to the `plugin` array in `opencode.json` (global or project-level):

```json
{
  "plugin": ["dev-tools@git+https://github.com/jamaynor/dev-tools.git"]
}
```

Restart OpenCode. The plugin auto-installs and registers all skills.

**Verify:** Ask "Tell me about your dev-tools skills".

**Usage:** OpenCode's native `skill` tool — `use skill tool to list skills`, `use skill tool to load dev-tools/brainstorming`.

**Personal skills:** `~/.config/opencode/skills/<name>/SKILL.md`. **Project skills:** `.opencode/skills/` in your repo. Priority: project > personal > dev-tools.

**Update:** Restarts re-install from git. Pin a version:

```json
{
  "plugin": ["dev-tools@git+https://github.com/jamaynor/dev-tools.git#v5.0.8"]
}
```

**Migrating from symlink install:** Remove old symlinks (`~/.config/opencode/plugins/dev-tools.js`, `~/.config/opencode/skills/dev-tools`), optional clone under `~/.config/opencode/dev-tools`, and any `skills.paths` entry for dev-tools in `opencode.json`. Then use the plugin line above.

**Tool mapping** (skills use Claude Code names; OpenCode adapts automatically):

| Claude Code | OpenCode |
|-------------|----------|
| `TodoWrite` | `todowrite` |
| `Task` (subagents) | `@mention` |
| `Skill` | native `skill` tool |

**Troubleshooting:** `opencode run --print-logs "hello" 2>&1 | grep -i dev-tools` — confirm plugin loads and `opencode.json` is correct. If bootstrap is missing, confirm your OpenCode version supports plugin hooks and restart after config changes.

Tell OpenCode to read this section:

```text
Fetch and follow the OpenCode installation section from https://raw.githubusercontent.com/jamaynor/dev-tools/refs/heads/main/README.md
```

### Gemini CLI

```bash
gemini extensions install https://github.com/jamaynor/dev-tools
```

To update:

```bash
gemini extensions update dev-tools
```

### Verify Installation

Start a new session in your chosen platform and ask for something that should trigger a skill (for example, "help me plan this feature" or "let's debug this issue"). The agent should automatically invoke the relevant dev-tools skill.

### Platform notes

**Ralph loop (Claude Code only):** `/ralph-loop`, `/cancel-ralph`, and the `bugfix` sub-skill depend on Claude Code's **Stop** hook (`hooks/hooks.json`). Cursor registers only the session-start hook (`hooks/hooks-cursor.json`), so Ralph state files (`.claude/ralph-loop.local.md`) are not auto-continued on stop in Cursor. Use Claude Code for full Ralph loop behavior, or run fix iterations manually in Cursor.

## The Basic Workflow

1. **brainstorming** - Activates before writing code. Refines rough ideas through questions, explores alternatives, presents design in sections for validation. Saves design document.

2. **using-git-worktrees** - **Hard gate** after spec approval, before any plan. Creates feature branch + isolated worktree (never `main`/`master`), runs setup, verifies clean test baseline.

3. **writing-plans** - Runs only inside that worktree. Uses **ai-plan** module graph (`docs/ai-plan/scopes/<module>.md`) when present. Bite-sized tasks with exact paths; plan header records branch, worktree, planning scope, and PR target.

**AI Plan:** Invoke **using-ai-plan** (canonical skill). Bundled generators: `scripts/code-map/`, `scripts/ai-plan/`. Run `/ai-plan` in Claude Code or `npm run ai-plan` in the project repo after init. Maintainer details: `scripts/ai-plan/README.md`.

4. **subagent-driven-development** or **executing-plans** - Activates with plan. Dispatches fresh subagent per task with two-stage review (spec compliance, then code quality), or executes in batches with human checkpoints.

5. **test-driven-development** - Activates during implementation. Enforces RED-GREEN-REFACTOR: write failing test, watch it fail, write minimal code, watch it pass, commit. Deletes code written before tests.

6. **requesting-code-review** - Activates between tasks. Reviews against plan, reports issues by severity. Critical issues block progress.

7. **finishing-a-development-branch** - Activates when tasks complete. Verifies tests, pushes the feature branch, and **opens a pull request** with `gh pr create` (required unless project docs explicitly override).

**The agent checks for relevant skills before any task.** Mandatory workflows, not suggestions.

## What's Inside

### Skills Library

**Testing**
- **test-driven-development** - RED-GREEN-REFACTOR cycle (includes testing anti-patterns reference)

**Debugging**
- **systematic-debugging** - 4-phase root cause process (includes root-cause-tracing, defense-in-depth, condition-based-waiting techniques)
- **verification-before-completion** - Ensure it's actually fixed

**Artifact-producing workflows**
- **plan-product** - Establish product, roadmap, and tech-stack docs for a new project
- **bugfix-lifecycle** - Canonical bug entrypoint (discovery → root-cause → fix → resolution). Invokes internal sub-skills `bug-workflow` and `bugfix`; do not call those directly.
- **backlog-workflow** - Add a planned work item to `docs/backlog/` with a detail file

**Collaboration** 
- **brainstorming** - Socratic design refinement
- **writing-plans** - Detailed implementation plans (ai-plan scope when available)
- **using-ai-plan** - Code map + module graph for planning (`docs/ai-plan/`)
- **executing-plans** - Batch execution with checkpoints
- **dispatching-parallel-agents** - Concurrent subagent workflows
- **requesting-code-review** - Pre-review checklist
- **receiving-code-review** - Responding to feedback
- **using-git-worktrees** - Parallel development branches
- **finishing-a-development-branch** - Push branch and open PR (required integration path)
- **subagent-driven-development** - Fast iteration with two-stage review (spec compliance, then code quality)

**Standards** (bundled — `standards/` + `manifest.json`)
- **using-core-standards** - Project structure, errors, logging, testing, DDD, workflow artifacts
- **using-dotnet-standards** / **using-nextjs-standards** / **using-postgres-standards** / **using-python-standards** - Stack-specific rules

**Meta**
- **writing-skills** - Create new skills following best practices (includes testing methodology)
- **using-dev-tools** - Introduction to the skills system

## Repo layout (your projects)

Consumer repos follow **`standards/project-structure.md`** (in the plugin). Required docs: `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md`. Workflow adds `docs/specs/`, `docs/plans/`, `docs/ai-plan/`, `docs/backlog/`, `docs/bugs/`. See [docs/standards.md](docs/standards.md).

**This plugin repo** uses the same doc layout: [docs/product.md](docs/product.md), [docs/roadmap.md](docs/roadmap.md), [docs/tech-stack.md](docs/tech-stack.md). Maintainer index: [docs/README.md](docs/README.md). Skill evals live in `test/` (not shipped to end users).

## Philosophy

- **Test-Driven Development** - Write tests first, always
- **Systematic over ad-hoc** - Process over guessing
- **Complexity reduction** - Simplicity as primary goal
- **Evidence over claims** - Verify before declaring success

## Contributing

Skills live directly in this repository. To contribute:

1. Fork the repository
2. Create a branch for your skill
3. Follow the `writing-skills` skill for creating and testing new skills
4. Submit a PR

See `skills/writing-skills/SKILL.md` for the complete guide.

Run skill evals before skill PRs: `test/run-eval-suite.sh` (requires Claude Code CLI). See [docs/testing.md](docs/testing.md).

## Updating

Skills update automatically when you update the plugin:

```bash
/plugin update dev-tools
```

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
