#!/usr/bin/env node
/**
 * Warn-only pre-push code-map regeneration, invoked from the git pre-push hook
 * that install-git-hook.mjs writes. Regenerates the code map and module graph
 * synchronously, then reports a regeneration failure or uncommitted artifact
 * changes on stderr, which git relays to the user. Always exits 0 — the push
 * is never blocked.
 *
 * Only runs in repos that adopted plan-product: without .plan-product/config.json
 * it does nothing, so a hook installed by mistake never litters a repo.
 *
 * `--git-hook` is accepted for compatibility with already-installed hook blocks
 * and changes nothing.
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
const PATH_CONFIG = '.plan-product/config.json';

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

/** @param {string} message */
function warn(message) {
  console.error(message);
}

function main() {
  const repoRoot = process.cwd();

  if (!existsSync(path.join(repoRoot, PATH_CONFIG))) {
    return; // Not a plan-product repo.
  }

  const generatorConfig = readJsonIfPresent(repoRoot, 'plan-product.config.json');
  if (generatorConfig.prePushRegenerate === false) {
    return;
  }

  if (process.env.PLAN_PRODUCT_HOOK_DRY_RUN === '1') {
    warn('plan-product: would regenerate code map before push');
    return;
  }

  const pathConfig = readJsonIfPresent(repoRoot, PATH_CONFIG);
  const outputDir =
    typeof pathConfig?.paths?.codeMap === 'string'
      ? pathConfig.paths.codeMap
      : DEFAULT_OUTPUT_DIR;

  const regen = spawnSync(process.execPath, [REGEN_SCRIPT, '--run'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 250_000,
  });
  if (regen.status !== 0) {
    const detail = (regen.stderr || regen.error?.message || '').trim();
    warn(
      `plan-product: pre-push code-map regeneration failed; push continues with existing artifacts${detail ? `\n${detail}` : ''}`
    );
    return;
  }

  if (artifactStatus(repoRoot, outputDir)) {
    warn(
      `plan-product: code map regenerated before push and ${outputDir} has uncommitted changes — commit the refreshed artifacts`
    );
  }
}

try {
  main();
} catch (error) {
  // Warn-only: never block the push, but say what went wrong.
  warn(
    `plan-product: pre-push regeneration hook errored; push continues (${error instanceof Error ? error.message : String(error)})`
  );
}
process.exit(0);
