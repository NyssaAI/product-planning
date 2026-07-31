#!/usr/bin/env node
/**
 * Warn-only pre-push code-map regeneration.
 *
 * Claude Code mode (default): PreToolUse hook on Bash. Reads the hook JSON
 * from stdin and, when the command is a `git push`, regenerates the code map
 * and module graph synchronously, then reports uncommitted artifact changes
 * as a systemMessage. Always exits 0 — the push is never blocked, even when
 * regeneration fails.
 *
 * Git hook mode (--git-hook): same regeneration, invoked from the pre-push
 * hook written by install-git-hook.mjs. Warnings go to stderr, which git
 * relays to the user.
 *
 * Opt-out: "prePushRegenerate": false in plan-product.config.json.
 * Dry run (tests): PLAN_PRODUCT_HOOK_DRY_RUN=1 prints intent and exits.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGEN_SCRIPT = path.join(__dirname, 'regen-if-source-changed.mjs');
const DEFAULT_OUTPUT_DIR = 'docs/code-map';

/**
 * @param {string} repoRoot
 * @param {string} name
 * @returns {Record<string, unknown>}
 */
function readJsonIfPresent(repoRoot, name) {
  try {
    const file = path.join(repoRoot, name);
    if (existsSync(file)) {
      return JSON.parse(readFileSync(file, 'utf8'));
    }
  } catch {
    // Malformed config — treat as absent.
  }
  return {};
}

/**
 * @param {string} command
 * @returns {boolean} whether any shell segment invokes `git ... push`
 */
function isGitPush(command) {
  return command
    .split(/[;&|]+/)
    .some((segment) => /^\s*git\b[\s\S]*\bpush\b/.test(segment));
}

/**
 * @param {string} repoRoot
 * @param {string} outputDir
 * @returns {string} porcelain status of the artifact directory, '' when clean
 */
function artifactStatus(repoRoot, outputDir) {
  const result = spawnSync('git', ['status', '--porcelain', '--', outputDir], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return result.status === 0 ? (result.stdout || '').trim() : '';
}

/**
 * @param {boolean} gitHookMode
 * @param {string} message
 */
function warn(gitHookMode, message) {
  if (gitHookMode) {
    console.error(message);
  } else {
    console.log(JSON.stringify({ systemMessage: message }));
  }
}

function main() {
  const gitHookMode = process.argv.includes('--git-hook');
  const repoRoot = process.cwd();

  const generatorConfig = readJsonIfPresent(repoRoot, 'plan-product.config.json');
  if (generatorConfig.prePushRegenerate === false) {
    return;
  }

  if (!gitHookMode) {
    let command = '';
    try {
      const payload = JSON.parse(readFileSync(0, 'utf8'));
      command = typeof payload?.tool_input?.command === 'string'
        ? payload.tool_input.command
        : '';
    } catch {
      return; // No hook payload — nothing to inspect.
    }
    if (!command || !isGitPush(command)) {
      return;
    }
  }

  if (process.env.PLAN_PRODUCT_HOOK_DRY_RUN === '1') {
    warn(gitHookMode, 'plan-product: would regenerate code map before push');
    return;
  }

  const pathConfig = readJsonIfPresent(repoRoot, '.plan-product/config.json');
  const outputDir =
    typeof pathConfig?.paths?.codeMap === 'string'
      ? pathConfig.paths.codeMap
      : DEFAULT_OUTPUT_DIR;

  const regen = spawnSync(process.execPath, [REGEN_SCRIPT, '--run'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 170_000,
  });
  if (regen.status !== 0) {
    warn(
      gitHookMode,
      'plan-product: pre-push code-map regeneration failed; push continues with existing artifacts'
    );
    return;
  }

  if (artifactStatus(repoRoot, outputDir)) {
    warn(
      gitHookMode,
      `plan-product: code map regenerated before push and ${outputDir} has uncommitted changes — commit the refreshed artifacts`
    );
  }
}

try {
  main();
} catch {
  // Warn-only: never block the push.
}
process.exit(0);
