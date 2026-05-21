# dev-tools

dev-tools is a complete software development workflow for your coding agents: **process skills** (brainstorm → plan → TDD → PR), **jamaynor development standards** (bundled — no separate dev-standards plugin), and **ai-plan** code/module graph generators.

## How it works

It starts from the moment you fire up your coding agent. As soon as it sees that you're building something, it *doesn't* just jump into trying to write code. Instead, it steps back and asks you what you're really trying to do. 

Once it's teased a spec out of the conversation, it shows it to you in chunks short enough to actually read and digest. 

After you've signed off on the design, your agent puts together an implementation plan that's clear enough for an enthusiastic junior engineer with poor taste, no judgement, no project context, and an aversion to testing to follow. It emphasizes true red/green TDD, YAGNI (You Aren't Gonna Need It), and DRY. 

Next up, once you say "go", it launches a *subagent-driven-development* process, having agents work through each engineering task, inspecting and reviewing their work, and continuing forward. It's not uncommon for Claude to be able to work autonomously for a couple hours at a time without deviating from the plan you put together.

There's a bunch more to it, but that's the core of the system. And because the skills trigger automatically, you don't need to do anything special. Your coding agent just has dev-tools skills.


## Credits

dev-tools is based on **superpowers 5.0.7 by Jesse Vincent** (https://github.com/obra/superpowers), rebranded and maintained by jamaynor.


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

Tell Codex:

```
Fetch and follow instructions from https://raw.githubusercontent.com/jamaynor/dev-tools/refs/heads/main/.codex/INSTALL.md
```

### OpenCode

Tell OpenCode:

```
Fetch and follow instructions from https://raw.githubusercontent.com/jamaynor/dev-tools/refs/heads/main/.opencode/INSTALL.md
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

## The Basic Workflow

1. **brainstorming** - Activates before writing code. Refines rough ideas through questions, explores alternatives, presents design in sections for validation. Saves design document.

2. **using-git-worktrees** - **Hard gate** after spec approval, before any plan. Creates feature branch + isolated worktree (never `main`/`master`), runs setup, verifies clean test baseline.

3. **writing-plans** - Runs only inside that worktree. Uses **ai-plan** module graph (`docs/ai-plan/scopes/<module>.md`) when present. Bite-sized tasks with exact paths; plan header records branch, worktree, planning scope, and PR target.

**AI Plan (code & module graph):** Bundled under `scripts/code-map/` and `scripts/ai-plan/`. `@ast-grep/cli` ships with the plugin (auto-installs into the plugin directory on first use). From a project repo with `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md`:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/ai-plan/generate.mjs" --init --write-scripts
npm run ai-plan   # after init copies scripts into the project
```

Or use the `/ai-plan` command in Claude Code. See **using-ai-plan** skill and `scripts/ai-plan/README.md`.

**Plugin maintainers / git clone:** run `npm install` once at the dev-tools plugin root so `node_modules/@ast-grep/cli` exists before publishing; end users get the same via auto-install on first `code-map` run if the marketplace copy omits `node_modules`.

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
- **bug-workflow** - Document a newly discovered bug (detail file, scoped discovery commit)
- **bugfix** - Fix a documented bug via iterative Ralph loop (read detail, write failing test, fix, verify)
- **bugfix-lifecycle** - Single canonical bug entrypoint (discovery -> root-cause -> fix -> resolution)
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
- **using-ai-plan** - Code map + module graph for planning

## Repo layout (your projects)

Consumer repos follow **`standards/project-structure.md`** (in the plugin). Required docs: `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md`. Workflow adds `docs/specs/`, `docs/plans/`, `docs/ai-plan/`, `docs/backlog/`, `docs/bugs/`. See `docs/standards.md` in this plugin.

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

## Updating

Skills update automatically when you update the plugin:

```bash
/plugin update dev-tools
```

## License

MIT License - see LICENSE file for details
