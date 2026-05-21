# dev-tools for OpenCode

Complete guide for using dev-tools with [OpenCode.ai](https://opencode.ai).

## Installation

Add dev-tools to the `plugin` array in your `opencode.json` (global or project-level):

```json
{
  "plugin": ["dev-tools@git+https://github.com/jamaynor/dev-tools.git"]
}
```

Restart OpenCode. The plugin auto-installs via Bun and registers all skills automatically.

Verify by asking: "Tell me about your dev-tools skills"

### Migrating from the old symlink-based install

If you previously installed dev-tools using `git clone` and symlinks, remove the old setup:

```bash
# Remove old symlinks
rm -f ~/.config/opencode/plugins/dev-tools.js
rm -rf ~/.config/opencode/skills/dev-tools

# Optionally remove the cloned repo
rm -rf ~/.config/opencode/dev-tools

# Remove skills.paths from opencode.json if you added one for dev-tools
```

Then follow the installation steps above.

## Usage

### Finding Skills

Use OpenCode's native `skill` tool to list all available skills:

```
use skill tool to list skills
```

### Loading a Skill

```
use skill tool to load dev-tools/brainstorming
```

### Personal Skills

Create your own skills in `~/.config/opencode/skills/`:

```bash
mkdir -p ~/.config/opencode/skills/my-skill
```

Create `~/.config/opencode/skills/my-skill/SKILL.md`:

```markdown
---
name: my-skill
description: Use when [condition] - [what it does]
---

# My Skill

[Your skill content here]
```

### Project Skills

Create project-specific skills in `.opencode/skills/` within your project.

**Skill Priority:** Project skills > Personal skills > dev-tools skills

## Updating

dev-tools updates automatically when you restart OpenCode. The plugin is re-installed from the git repository on each launch.

To pin a specific version, use a branch or tag:

```json
{
  "plugin": ["dev-tools@git+https://github.com/jamaynor/dev-tools.git#v5.0.8"]
}
```

## How It Works

The plugin does two things:

1. **Injects bootstrap context** via the `experimental.chat.system.transform` hook, adding dev-tools awareness to every conversation.
2. **Registers the skills directory** via the `config` hook, so OpenCode discovers all dev-tools skills without symlinks or manual config.

### Tool Mapping

Skills written for Claude Code are automatically adapted for OpenCode:

- `TodoWrite` → `todowrite`
- `Task` with subagents → OpenCode's `@mention` system
- `Skill` tool → OpenCode's native `skill` tool
- File operations → Native OpenCode tools

## Troubleshooting

### Plugin not loading

1. Check OpenCode logs: `opencode run --print-logs "hello" 2>&1 | grep -i dev-tools`
2. Verify the plugin line in your `opencode.json` is correct
3. Make sure you're running a recent version of OpenCode

### Skills not found

1. Use OpenCode's `skill` tool to list available skills
2. Check that the plugin is loading (see above)
3. Each skill needs a `SKILL.md` file with valid YAML frontmatter

### Bootstrap not appearing

1. Check OpenCode version supports `experimental.chat.system.transform` hook
2. Restart OpenCode after config changes

## Getting Help

- Report issues: https://github.com/jamaynor/dev-tools/issues
- Main documentation: https://github.com/jamaynor/dev-tools
- OpenCode docs: https://opencode.ai/docs/
