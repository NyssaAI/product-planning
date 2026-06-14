# dev-tools

dev-tools is a complete software development workflow for your coding agents: **process skills** (design-spec → write-plan → execute-plan → PR), **jamaynor development standards** (bundled — no separate dev-standards plugin), and **ai-plan** code/module graph generators.

## How it works

It starts from the moment you fire up your coding agent. As soon as it sees that you're building something, it *doesn't* just jump into trying to write code. Instead, it steps back and asks you what you're really trying to do. 

Once it's teased a spec out of the conversation, it shows it to you in chunks short enough to actually read and digest. 

After you've signed off on the design, your agent puts together an implementation plan that's clear enough for an enthusiastic junior engineer with poor taste, no judgement, no project context, and an aversion to testing to follow. It emphasizes true red/green TDD, YAGNI (You Aren't Gonna Need It), and DRY. 

Next up, once you say "go", it launches **execute-plan**, having agents work through each engineering task, inspecting and reviewing their work, and opening a PR when done. After the PR is reviewed and approved, **execute-plan** also owns the closeout: regression checks, merge, and cleanup. It's not uncommon for Claude to be able to work autonomously for a couple hours at a time without deviating from the plan you put together.

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

**Optional — multi-agent for plan execution:** Enable Codex multi-agent so **`execute-plan`** can use subagents for task dispatch (internal `execute-plan-run`; fallback is inline via `execute-plan-run-inline`). `dispatching-parallel-agents` also benefits from multi-agent:

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

**Usage:** OpenCode's native `skill` tool — `use skill tool to list skills`, `use skill tool to load dev-tools/design-spec`.

**Personal skills:** `~/.config/opencode/skills/<name>/SKILL.md`. **Project skills:** `.opencode/skills/` in your repo. Priority: project > personal > dev-tools.

**Update:** Restarts re-install from git. Pin a version:

```json
{
  "plugin": ["dev-tools@git+https://github.com/jamaynor/dev-tools.git#v5.1.0"]
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

Start a new session in your chosen platform and ask for something that should trigger a skill:

- **Greenfield project:** "starting a new project" / missing product docs → **`plan-product`**
- **Feature work:** "help me plan this feature" → **`design-spec`**
- **Backlog item:** "add this to the backlog" → **`add-backlog`**
- **Bug report only:** "document this bug for later, don't fix it" → **`add-bug`**
- **Implement plan:** "implement the plan" / path under `docs/agent-plan/plans/` → **`execute-plan`**
- **Bug work:** "I found a bug in login" → **`fix-bug`** (not `systematic-debugging` directly)

The agent should automatically invoke the relevant dev-tools skill.

### Platform notes

**Ralph loop (Claude Code only):** Ralph is **hook + script infrastructure**, not a workflow entry point. **`fix-bug-resolve`** (inside **`fix-bug`**) uses Ralph automatically on Claude Code via the **Stop** hook (`hooks/hooks.json`). Cursor registers only the session-start hook (`hooks/hooks-cursor.json`), so Ralph state at `.claude/ralph-loop.local.md` is not auto-continued on stop in Cursor — use Claude Code for full bug fix loops, or iterate manually in Cursor.

**Advanced (non-bug only):** `/ralph-loop` and `/cancel-ralph` exist for optional iterative non-bug tasks on Claude Code. **Do not use `/ralph-loop` for bugs** — use **`fix-bug`**, which logs and analyzes first, then either uses the simple direct route with Ralph inside resolve or routes complex bugs through design/plan execution.

## Workflow entry points

User-facing workflow starts (6 buttons):

| Verb name | Skill folder | Purpose |
|-----------|--------------|---------|
| `plan-product` | `plan-product` | New project: product, roadmap, tech-stack |
| `add-backlog` | `add-backlog` | Add backlog item with detail file |
| `add-bug` | `add-bug` | Add bug report with detail file |
| `design-spec` | `design-spec` | Spec before code |
| `execute-plan` | `execute-plan` | Implement written plan → PR |
| `fix-bug` | `fix-bug` | Bug orchestrator: simple direct fix or complex design path |

Automatic (not user buttons): `using-dev-tools` (session router), `using-ai-plan` during **design-spec** / **write-plan** when code exists.

Maintenance (user-invocable, not a core button): **`align-project-structure`** — audit/onboard a repo to the project-structure standard; enforces the `docs/` layout, auto-fixes safe deviations, plans the rest.

**Feature chain:** `design-spec` → `write-plan` (internal) → **`execute-plan`** (verify → run → open PR; review feedback → `receiving-code-review` → update PR; after approval → regression-check → merge → cleanup)

**Backlog chain:** **`add-backlog`** → (when work begins) **`design-spec`** → `write-plan` (internal) → **`execute-plan`** when ready

**Bug-report chain:** **`add-bug`** → (when ready to fix) **`fix-bug`**

**Greenfield chain:** **`plan-product`** → **`design-spec`** → `write-plan` (internal) → **`execute-plan`** when ready

**Bug chain:** **`fix-bug`** only. Simple one-file bugs can go log → analyze → direct TDD fix → complete. Complex bugs route log → analyze → **`design-spec`** → `write-plan` (internal) → **`execute-plan`**.

Internal sub-skills (`user-invocable: false`): `write-plan`, `execute-plan-run`, `execute-plan-run-inline`, `execute-plan-finish`, `merge-pr`, `fix-bug-log`, `systematic-debugging`, `fix-bug-resolve`, `fix-bug-complete`.

## The Basic Workflow

1. **design-spec** - Activates before writing code. Refines rough ideas through questions, explores alternatives, presents design in sections for validation. Saves design document.

2. **using-git-worktrees** - **Hard gate** inside **design-spec** after spec approval, before any plan (not a separate user entry point). Creates feature branch + isolated worktree (never `main`/`master`), runs setup, verifies clean test baseline.

3. **write-plan** - Invoked by design-spec inside that worktree. Uses **ai-plan** module graph (`docs/agent-plan/context/modules/<module>.md`) when present. Bite-sized tasks with exact paths; plan header records branch, worktree, planning scope, and PR target.

**AI Plan:** **using-ai-plan** runs automatically during design-spec and write-plan when the repo has code (regenerates when stale). Manual `/ai-plan` or `npm run ai-plan` after module structure changes. Bundled generators: `scripts/code-map/`, `scripts/ai-plan/`. Maintainer details: `scripts/ai-plan/README.md`.

4. **execute-plan** - Single entry for implementation, review feedback follow-up, and post-review closeout. **Verify** worktree → **run** tasks (`execute-plan-run` default, or `execute-plan-run-inline` fallback) → **finish** with tests, push, and PR (`execute-plan-finish`). If reviewers request changes, **execute-plan** invokes `receiving-code-review` before applying review feedback and pushing updates. After PR approval, **execute-plan** invokes internal `merge-pr` for regression checks, merge, and cleanup.

During run, agents use **test-driven-development** (RED-GREEN-REFACTOR) and **requesting-code-review** between tasks where applicable.

**The agent checks for relevant skills before any task.** Mandatory workflows, not suggestions.

## What's Inside

### Skills Library

**Testing**
- **test-driven-development** - RED-GREEN-REFACTOR cycle (includes testing anti-patterns reference)

**Debugging**
- **fix-bug** - Canonical entry for all bug work (see Artifact-producing workflows below)
- **systematic-debugging** - Internal root-cause method used by fix-bug Step 2.
- **verification-before-completion** - Ensure it's actually fixed

**Artifact-producing workflows**
- **plan-product** - Establish product, roadmap, and tech-stack docs for a new project
- **add-backlog** - Add a planned work item to `docs/agent-plan/backlog/` with a detail file
- **add-bug** - Add a bug report to `docs/agent-plan/bugs/` without analyzing or fixing it
- **fix-bug** - Canonical bug orchestrator. Simple one-file bugs can be fixed directly after analysis; complex bugs route through `design-spec` and `execute-plan`. Sub-skills: `fix-bug-log`, `fix-bug-resolve`, `fix-bug-complete`. Step 2 analyze uses `systematic-debugging`.

**Collaboration** 
- **design-spec** - Socratic design refinement (spec before code)
- **write-plan** - Detailed implementation plans (internal; invoked by design-spec)
- **using-ai-plan** - Code map + module graph (incl. endpoint surfaces: HTTP routes, MCP tools/resources/prompts) for planning (`docs/agent-plan/context/`)
- **execute-plan** - Canonical plan implementation entry (verify → run → finish + PR)
- **dispatching-parallel-agents** - Concurrent subagent workflows
- **requesting-code-review** - Pre-review checklist
- **receiving-code-review** - Responding to feedback
- **using-git-worktrees** - Parallel development branches

**Standards** (bundled — `standards/` + `manifest.json`)
- **using-core-standards** - Project structure, errors, logging, testing, DDD, workflow artifacts
- **using-dotnet-standards** / **using-nextjs-standards** / **using-postgres-standards** / **using-python-standards** - Stack-specific rules
- **align-project-structure** - Audit a repo against `standards/project-structure.md`: enforce the `docs/` layout, auto-apply safe fixes (incl. `docs/agent-files` → `docs/agent-plan`), plan the rest

**Meta**
- **writing-skills** - Create new skills following best practices (includes testing methodology)
- **using-dev-tools** - Introduction to the skills system

## Repo layout (your projects)

Consumer repos follow **`standards/project-structure.md`** (in the plugin). Required docs: `docs/product.md`, `docs/roadmap.md`, `docs/features.md`, `docs/tech-stack.md`. Workflow adds `docs/agent-plan/specs/`, `docs/agent-plan/plans/`, `docs/agent-plan/context/`, `docs/agent-plan/backlog/`, `docs/agent-plan/bugs/`. See [docs/standards.md](docs/standards.md).

**This plugin repo** uses the same doc layout: [docs/product.md](docs/product.md), [docs/roadmap.md](docs/roadmap.md), [docs/features.md](docs/features.md), [docs/tech-stack.md](docs/tech-stack.md). Maintainer index: [docs/README.md](docs/README.md). Skill evals live in `test/` (not shipped to end users).

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

Run skill evals before skill PRs: `test/run-all.sh` (requires Claude Code CLI for Claude suites). See [docs/testing.md](docs/testing.md).

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
