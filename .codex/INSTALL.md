# Installing dev-tools for Codex

Enable dev-tools skills in Codex via native skill discovery. Just clone and symlink.

## Prerequisites

- Git

## Installation

1. **Clone the dev-tools repository:**
   ```bash
   git clone https://github.com/jamaynor/dev-tools.git ~/.codex/dev-tools
   ```

2. **Create the skills symlink:**
   ```bash
   mkdir -p ~/.agents/skills
   ln -s ~/.codex/dev-tools/skills ~/.agents/skills/dev-tools
   ```

   **Windows (PowerShell):**
   ```powershell
   New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.agents\skills"
   cmd /c mklink /J "$env:USERPROFILE\.agents\skills\dev-tools" "$env:USERPROFILE\.codex\dev-tools\skills"
   ```

3. **Restart Codex** (quit and relaunch the CLI) to discover the skills.

## Migrating from old bootstrap

If you installed dev-tools before native skill discovery, you need to:

1. **Update the repo:**
   ```bash
   cd ~/.codex/dev-tools && git pull
   ```

2. **Create the skills symlink** (step 2 above) — this is the new discovery mechanism.

3. **Remove the old bootstrap block** from `~/.codex/AGENTS.md` — any block referencing `dev-tools-codex bootstrap` is no longer needed.

4. **Restart Codex.**

## Verify

```bash
ls -la ~/.agents/skills/dev-tools
```

You should see a symlink (or junction on Windows) pointing to your dev-tools skills directory.

## Updating

```bash
cd ~/.codex/dev-tools && git pull
```

Skills update instantly through the symlink.

## Uninstalling

```bash
rm ~/.agents/skills/dev-tools
```

Optionally delete the clone: `rm -rf ~/.codex/dev-tools`.
