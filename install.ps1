#Requires -Version 5.1
<#
.SYNOPSIS
  Installs code-indexer for Codex, Claude Code, Claude Desktop, Hermes, and OpenClaw.
.DESCRIPTION
  Clones (or updates) the code-indexer repo to $JAMAYNOR_HOME\plugins\code-indexer, runs
  npm install, sets env vars in the PowerShell profile, configures the Codex personal
  marketplace, copies the skill to OpenClaw and Hermes skill dirs, and installs the Gemini
  extension if the CLI is present.
.EXAMPLE
  # Run from an elevated or normal PowerShell session:
  .\install.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
$PluginSource  = 'https://github.com/jamaynor/code-indexer.git'
$JamaynorHome  = if ($env:JAMAYNOR_HOME) { $env:JAMAYNOR_HOME } else { Join-Path $env:USERPROFILE '.jamaynor' }
$PluginDir     = Join-Path $JamaynorHome 'plugins\code-indexer'
$SkillName     = 'using-code-indexer'

function Write-Info { param([string]$Msg) Write-Host "[code-indexer] $Msg" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Msg) Write-Host "  v $Msg" -ForegroundColor Green }
function Write-Note { param([string]$Msg) Write-Host "  ! $Msg" -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
# 1. Clone or update repo
# ---------------------------------------------------------------------------
Write-Info "Installing to $PluginDir"
if (Test-Path (Join-Path $PluginDir '.git')) {
  Write-Info 'Existing clone found — pulling latest...'
  git -C $PluginDir pull --ff-only
} else {
  New-Item -ItemType Directory -Force -Path (Split-Path $PluginDir) | Out-Null
  git clone $PluginSource $PluginDir
}
Write-Ok "Repo ready at $PluginDir"

# ---------------------------------------------------------------------------
# 2. Install bundled @ast-grep/cli dependency
# ---------------------------------------------------------------------------
Write-Info 'Installing @ast-grep/cli (bundled dependency)...'
Push-Location $PluginDir
npm install --omit=dev --no-audit --no-fund --prefer-offline
Pop-Location
Write-Ok '@ast-grep/cli installed'

# ---------------------------------------------------------------------------
# 3. Env vars — PowerShell profile + persistent User environment
# ---------------------------------------------------------------------------
$env:JAMAYNOR_HOME            = $JamaynorHome
$env:CODE_INDEXER_PLUGIN_ROOT = $PluginDir

# Persist to User environment (survives reboots; no admin required)
[System.Environment]::SetEnvironmentVariable('JAMAYNOR_HOME',            $JamaynorHome, 'User')
[System.Environment]::SetEnvironmentVariable('CODE_INDEXER_PLUGIN_ROOT', $PluginDir,    'User')
Write-Ok 'Env vars persisted in User environment'

function Add-EnvToProfile {
  param([string]$ProfilePath, [string]$VarName, [string]$Value)
  if (-not (Test-Path $ProfilePath)) {
    New-Item -ItemType File -Force -Path $ProfilePath | Out-Null
  }
  $content = Get-Content $ProfilePath -Raw -ErrorAction SilentlyContinue
  if ($content -and $content -match [regex]::Escape($VarName)) {
    Write-Note "$VarName already in $(Split-Path $ProfilePath -Leaf) — skipping"
  } else {
    Add-Content -Path $ProfilePath -Value "`n# code-indexer plugin"
    Add-Content -Path $ProfilePath -Value "`$env:$VarName = `"$Value`""
    Write-Ok "Added $VarName to $ProfilePath"
  }
}

$PsProfile = $PROFILE
Write-Info "Writing env vars to $PsProfile"
Add-EnvToProfile $PsProfile 'JAMAYNOR_HOME'            $JamaynorHome
Add-EnvToProfile $PsProfile 'CODE_INDEXER_PLUGIN_ROOT' $PluginDir

# ---------------------------------------------------------------------------
# 4. Codex — personal marketplace
# ---------------------------------------------------------------------------
Write-Info 'Configuring Codex personal marketplace...'
$CodexMarketplaceDir = Join-Path $env:USERPROFILE '.agents\plugins'
$CodexMarketplace    = Join-Path $CodexMarketplaceDir 'marketplace.json'
New-Item -ItemType Directory -Force -Path $CodexMarketplaceDir | Out-Null

$CodexNeedsManual = $false
if (Test-Path $CodexMarketplace) {
  $existing = Get-Content $CodexMarketplace -Raw -ErrorAction SilentlyContinue
  if ($existing -and $existing -match '"code-indexer"') {
    Write-Note 'code-indexer entry already in marketplace.json — skipping'
  } else {
    $CodexNeedsManual = $true
  }
} else {
  # JSON backslashes need escaping inside the JSON value
  $PluginDirJson = $PluginDir.Replace('\', '\\')
  $marketplaceContent = @"
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
        "path": "$PluginDirJson"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Coding"
    }
  ]
}
"@
  Set-Content -Path $CodexMarketplace -Value $marketplaceContent -Encoding utf8
  Write-Ok "Created $CodexMarketplace"
}

# ---------------------------------------------------------------------------
# 5. OpenClaw
# ---------------------------------------------------------------------------
$OpenClawDir       = Join-Path $env:USERPROFILE '.openclaw'
$OpenClawSkillsDir = Join-Path $OpenClawDir 'skills'
if (Test-Path $OpenClawDir) {
  Write-Info 'OpenClaw detected — installing skill...'
  New-Item -ItemType Directory -Force -Path $OpenClawSkillsDir | Out-Null
  $skillDst = Join-Path $OpenClawSkillsDir $SkillName
  if (Test-Path $skillDst) { Remove-Item $skillDst -Recurse -Force }
  Copy-Item (Join-Path $PluginDir "skills\$SkillName") $skillDst -Recurse
  Write-Ok "Skill copied to $skillDst"

  $OpenClawConfig = Join-Path $OpenClawDir 'openclaw.json'
  if (Test-Path $OpenClawConfig) {
    $cfg = Get-Content $OpenClawConfig -Raw -ErrorAction SilentlyContinue
    if ($cfg -and ($cfg -match 'using-code-indexer' -or $cfg -match [regex]::Escape($OpenClawSkillsDir))) {
      Write-Note 'openclaw.json already references this skill'
    } else {
      Write-Note "Manual step: add `"$OpenClawSkillsDir`" to skills.external_dirs in $OpenClawConfig"
    }
  }
} else {
  Write-Note 'OpenClaw not found (~\.openclaw missing) — skipping'
}

# ---------------------------------------------------------------------------
# 6. Hermes (NousResearch)
# ---------------------------------------------------------------------------
$HermesDir       = Join-Path $env:USERPROFILE '.hermes'
$HermesSkillsDir = Join-Path $HermesDir 'skills'
if (Test-Path $HermesDir) {
  Write-Info 'Hermes detected — installing skill...'
  New-Item -ItemType Directory -Force -Path $HermesSkillsDir | Out-Null
  $skillDst = Join-Path $HermesSkillsDir $SkillName
  if (Test-Path $skillDst) { Remove-Item $skillDst -Recurse -Force }
  Copy-Item (Join-Path $PluginDir "skills\$SkillName") $skillDst -Recurse
  Write-Ok "Skill copied to $skillDst"

  $HermesConfig = Join-Path $HermesDir 'config.yaml'
  if (Test-Path $HermesConfig) {
    $cfg = Get-Content $HermesConfig -Raw -ErrorAction SilentlyContinue
    if ($cfg -and ($cfg -match 'using-code-indexer' -or $cfg -match [regex]::Escape($HermesSkillsDir))) {
      Write-Note 'Hermes config already references this skill'
    } else {
      Write-Note "Manual step: add the following to $HermesConfig under skills.external_dirs:"
      Write-Note "  - $HermesSkillsDir"
    }
  }
} else {
  Write-Note 'Hermes not found (~\.hermes missing) — skipping'
}

# ---------------------------------------------------------------------------
# 7. Gemini CLI
# ---------------------------------------------------------------------------
$geminiCmd = Get-Command gemini -ErrorAction SilentlyContinue
if ($geminiCmd) {
  Write-Info 'Gemini CLI detected — installing extension...'
  $geminiList = & gemini extensions list 2>$null
  if ($geminiList -match 'code-indexer') {
    Write-Note 'Extension already installed. To update: gemini extensions update code-indexer'
  } else {
    & gemini extensions install https://github.com/jamaynor/code-indexer
    Write-Ok 'Gemini extension installed'
  }
} else {
  Write-Note 'Gemini CLI not found — skipping (to install later: gemini extensions install https://github.com/jamaynor/code-indexer)'
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host '════════════════════════════════════════════════════' -ForegroundColor White
Write-Host '  code-indexer installation complete!'               -ForegroundColor White
Write-Host '════════════════════════════════════════════════════' -ForegroundColor White
Write-Host ''
Write-Host "  Plugin root: $PluginDir"
Write-Host ''
Write-Host 'Claude Code (in-app steps — cannot be automated):' -ForegroundColor White
Write-Host '    /plugin marketplace add https://github.com/jamaynor/plugin-marketplace.git'
Write-Host '    /plugin install code-indexer@jamaynor'
Write-Host ''
Write-Host 'Claude Desktop:' -ForegroundColor White
Write-Host "  Env vars set in User environment and $PsProfile."
Write-Host '  Restart Claude Desktop after opening a new terminal.'
Write-Host '  Reference the plugin in project CLAUDE.md files via:'
Write-Host '    node "$env:CODE_INDEXER_PLUGIN_ROOT/scripts/module-map/generate.mjs"'
Write-Host ''
if ($CodexNeedsManual) {
  Write-Host 'Codex — marketplace.json already exists; manual merge required:' -ForegroundColor Yellow
  Write-Host "  Add the following entry under `"plugins`" in $CodexMarketplace :"
  $PluginDirJson = $PluginDir.Replace('\', '\\')
  Write-Host "    { `"name`": `"code-indexer`", `"source`": { `"source`": `"local`", `"path`": `"$PluginDirJson`" }, `"policy`": { `"installation`": `"AVAILABLE`", `"authentication`": `"ON_INSTALL`" }, `"category`": `"Coding`" }"
  Write-Host '  Then restart Codex and run: codex plugin add code-indexer@personal'
} else {
  Write-Host 'Codex:' -ForegroundColor White
  Write-Host '  Restart Codex, then run: codex plugin add code-indexer@personal'
}
Write-Host ''
Write-Host "  Reload profile now:  . `$PROFILE"
Write-Host ''
