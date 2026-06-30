#!/usr/bin/env bash
# install.sh — installs code-indexer for Codex, Claude Code, Claude Desktop, Hermes, and OpenClaw
# Usage: bash install.sh
# Requires: git, node, npm

set -euo pipefail

PLUGIN_SOURCE="https://github.com/jamaynor/code-indexer.git"
JAMAYNOR_HOME="${JAMAYNOR_HOME:-$HOME/.jamaynor}"
PLUGIN_DIR="$JAMAYNOR_HOME/plugins/code-indexer"
SKILL_NAME="using-code-indexer"

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

info() { echo -e "${CYAN}${BOLD}[code-indexer]${RESET} $*"; }
ok()   { echo -e "  ${GREEN}✓${RESET} $*"; }
note() { echo -e "  ${YELLOW}!${RESET} $*"; }

# ---------------------------------------------------------------------------
# 1. Clone or update repo
# ---------------------------------------------------------------------------
info "Installing to $PLUGIN_DIR"
if [ -d "$PLUGIN_DIR/.git" ]; then
  info "Existing clone found — pulling latest..."
  git -C "$PLUGIN_DIR" pull --ff-only
else
  mkdir -p "$(dirname "$PLUGIN_DIR")"
  git clone "$PLUGIN_SOURCE" "$PLUGIN_DIR"
fi
ok "Repo ready at $PLUGIN_DIR"

# ---------------------------------------------------------------------------
# 2. Install bundled @ast-grep/cli dependency
# ---------------------------------------------------------------------------
info "Installing @ast-grep/cli (bundled dependency)..."
(cd "$PLUGIN_DIR" && npm install --omit=dev --no-audit --no-fund --prefer-offline)
ok "@ast-grep/cli installed"

# ---------------------------------------------------------------------------
# 3. Set env vars in shell profile
# ---------------------------------------------------------------------------
detect_profile() {
  # Prefer the shell's own RC file, fall back to .profile
  if [ -n "${ZSH_VERSION:-}" ]; then
    echo "$HOME/.zshrc"
  elif [ -n "${BASH_VERSION:-}" ]; then
    if [ -f "$HOME/.bash_profile" ]; then echo "$HOME/.bash_profile"; else echo "$HOME/.bashrc"; fi
  else
    for p in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile"; do
      [ -f "$p" ] && echo "$p" && return
    done
    echo "$HOME/.profile"
  fi
}

append_env() {
  local profile="$1" varname="$2" value="$3"
  if grep -q "export $varname=" "$profile" 2>/dev/null; then
    note "$varname already set in $(basename "$profile") — skipping"
  else
    printf '\n# code-indexer plugin\nexport %s="%s"\n' "$varname" "$value" >> "$profile"
    ok "Added $varname to $profile"
  fi
}

SHELL_PROFILE="$(detect_profile)"
info "Writing env vars to $SHELL_PROFILE"
append_env "$SHELL_PROFILE" "JAMAYNOR_HOME" "$JAMAYNOR_HOME"
append_env "$SHELL_PROFILE" "CODE_INDEXER_PLUGIN_ROOT" "$PLUGIN_DIR"

# Export for the remainder of this session
export JAMAYNOR_HOME
export CODE_INDEXER_PLUGIN_ROOT="$PLUGIN_DIR"

# ---------------------------------------------------------------------------
# 4. Codex — personal marketplace
# ---------------------------------------------------------------------------
CODEX_NEEDS_MANUAL=0
CODEX_MARKETPLACE_DIR="$HOME/.agents/plugins"
CODEX_MARKETPLACE="$CODEX_MARKETPLACE_DIR/marketplace.json"

info "Configuring Codex personal marketplace..."
mkdir -p "$CODEX_MARKETPLACE_DIR"

if [ -f "$CODEX_MARKETPLACE" ]; then
  if grep -q '"code-indexer"' "$CODEX_MARKETPLACE"; then
    note "code-indexer entry already in marketplace.json — skipping"
  else
    CODEX_NEEDS_MANUAL=1
  fi
else
  cat > "$CODEX_MARKETPLACE" <<MARKETPLACE_JSON
{
  "name": "personal",
  "interface": {
    "displayName": "Personal"
  },
  "plugins": [
    {
      "name": "code-indexer",
      "source": {
        "source": "local",
        "path": "$PLUGIN_DIR"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Coding"
    }
  ]
}
MARKETPLACE_JSON
  ok "Created $CODEX_MARKETPLACE"
fi

# ---------------------------------------------------------------------------
# 5. OpenClaw
# ---------------------------------------------------------------------------
OPENCLAW_DIR="$HOME/.openclaw"
OPENCLAW_SKILLS_DIR="$OPENCLAW_DIR/skills"
if [ -d "$OPENCLAW_DIR" ]; then
  info "OpenClaw detected — installing skill..."
  mkdir -p "$OPENCLAW_SKILLS_DIR"
  rm -rf "${OPENCLAW_SKILLS_DIR:?}/$SKILL_NAME"
  cp -r "$PLUGIN_DIR/skills/$SKILL_NAME" "$OPENCLAW_SKILLS_DIR/$SKILL_NAME"
  ok "Skill copied to $OPENCLAW_SKILLS_DIR/$SKILL_NAME"

  OPENCLAW_CONFIG="$OPENCLAW_DIR/openclaw.json"
  if [ -f "$OPENCLAW_CONFIG" ]; then
    if grep -q "using-code-indexer\|$OPENCLAW_SKILLS_DIR" "$OPENCLAW_CONFIG"; then
      note "openclaw.json already references this skill"
    else
      note "Manual step: add \"$OPENCLAW_SKILLS_DIR\" to skills.external_dirs in $OPENCLAW_CONFIG"
    fi
  fi
else
  note "OpenClaw not found (~/.openclaw missing) — skipping"
fi

# ---------------------------------------------------------------------------
# 6. Hermes (NousResearch)
# ---------------------------------------------------------------------------
HERMES_DIR="$HOME/.hermes"
HERMES_SKILLS_DIR="$HERMES_DIR/skills"
if [ -d "$HERMES_DIR" ]; then
  info "Hermes detected — installing skill..."
  mkdir -p "$HERMES_SKILLS_DIR"
  rm -rf "${HERMES_SKILLS_DIR:?}/$SKILL_NAME"
  cp -r "$PLUGIN_DIR/skills/$SKILL_NAME" "$HERMES_SKILLS_DIR/$SKILL_NAME"
  ok "Skill copied to $HERMES_SKILLS_DIR/$SKILL_NAME"

  HERMES_CONFIG="$HERMES_DIR/config.yaml"
  if [ -f "$HERMES_CONFIG" ]; then
    if grep -q "using-code-indexer\|$HERMES_SKILLS_DIR" "$HERMES_CONFIG"; then
      note "Hermes config already references this skill"
    else
      note "Manual step: add the following to $HERMES_CONFIG under skills.external_dirs:"
      note "  - $HERMES_SKILLS_DIR"
    fi
  fi
else
  note "Hermes not found (~/.hermes missing) — skipping"
fi

# ---------------------------------------------------------------------------
# 7. Gemini CLI
# ---------------------------------------------------------------------------
if command -v gemini &>/dev/null; then
  info "Gemini CLI detected — installing extension..."
  if gemini extensions list 2>/dev/null | grep -q "code-indexer"; then
    note "Extension already installed. To update: gemini extensions update code-indexer"
  else
    gemini extensions install https://github.com/jamaynor/code-indexer
    ok "Gemini extension installed"
  fi
else
  note "Gemini CLI not found — skipping (to install later: gemini extensions install https://github.com/jamaynor/code-indexer)"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  code-indexer installation complete!${RESET}"
echo -e "${BOLD}════════════════════════════════════════════════════${RESET}"
echo ""
echo "  Plugin root: $PLUGIN_DIR"
echo ""
echo -e "${BOLD}Claude Code${RESET} (in-app steps — cannot be automated):"
echo "    /plugin marketplace add https://github.com/jamaynor/plugin-marketplace.git"
echo "    /plugin install code-indexer@jamaynor"
echo ""
echo -e "${BOLD}Claude Desktop${RESET}:"
echo "  Env vars written to $SHELL_PROFILE."
echo "  Restart Claude Desktop after reloading your shell."
echo "  Reference the plugin in project CLAUDE.md files via:"
echo "    node \"\$CODE_INDEXER_PLUGIN_ROOT/scripts/module-map/generate.mjs\""
echo ""
if [ "$CODEX_NEEDS_MANUAL" -eq 1 ]; then
  echo -e "${YELLOW}${BOLD}Codex${RESET}${YELLOW} — marketplace.json already exists; manual merge required:${RESET}"
  echo "  Add the following entry under \"plugins\" in $CODEX_MARKETPLACE:"
  cat <<SNIPPET
    {
      "name": "code-indexer",
      "source": { "source": "local", "path": "$PLUGIN_DIR" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Coding"
    }
SNIPPET
  echo "  Then restart Codex and run: codex plugin add code-indexer@personal"
else
  echo -e "${BOLD}Codex${RESET}:"
  echo "  Restart Codex, then run: codex plugin add code-indexer@personal"
fi
echo ""
echo "  Reload shell now:  source $SHELL_PROFILE"
echo ""
