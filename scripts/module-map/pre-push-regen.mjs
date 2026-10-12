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
import { checkMapFreshness } from '../lib/map-freshness.mjs';

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
 * Resolve every path the regeneration pipeline can write. The code-map
 * generator gives the legacy `output` key precedence over `codeMapOutput`,
 * while the module-map generator uses `outputDir`. Both fall back through the
 * shared `.plan-product/config.json` code-map directory.
 *
 * @param {Record<string, unknown>} generatorConfig
 * @param {Record<string, unknown>} pathConfig
 * @returns {string[]} deduplicated repo-relative pathspecs
 */
function generatedArtifactTargets(generatorConfig, pathConfig) {
  const configuredDir =
    typeof pathConfig?.paths?.codeMap === 'string'
      ? pathConfig.paths.codeMap
      : DEFAULT_OUTPUT_DIR;
  const outputDir =
    typeof generatorConfig.outputDir === 'string'
      ? generatorConfig.outputDir
      : configuredDir;
  const codeMapOutput =
    typeof generatorConfig.output === 'string'
      ? generatorConfig.output
      : typeof generatorConfig.codeMapOutput === 'string'
        ? generatorConfig.codeMapOutput
        : path.posix.join(
            configuredDir.replace(/\\/g, '/').replace(/\/$/, ''),
            'code-map.json'
          );

  const normalizedOutputDir = outputDir.replace(/\\/g, '/').replace(/\/$/, '');
  const normalizedCodeMap = codeMapOutput
    .replace(/\\/g, '/')
    .replace(/\/$/, '');
  const codeMapCoveredByOutputDir =
    normalizedCodeMap === normalizedOutputDir ||
    normalizedCodeMap.startsWith(`${normalizedOutputDir}/`);
  return [
    ...new Set(
      codeMapCoveredByOutputDir
        ? [normalizedOutputDir]
        : [normalizedCodeMap, normalizedOutputDir]
    ),
  ];
}

/**
 * @param {string} repoRoot
 * @param {string[]} targets
 * @returns {string[]} configured targets containing uncommitted artifacts
 */
function dirtyArtifactTargets(repoRoot, targets) {
  return targets.filter((target) => {
    const result = spawnSync(
      'git',
      ['status', '--porcelain', '--untracked-files=all', '--', target],
      { cwd: repoRoot, encoding: 'utf8' }
    );
    return result.status === 0 && Boolean((result.stdout || '').trim());
  });
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
  const artifactTargets = [
    ...generatedArtifactTargets(generatorConfig, pathConfig),
    ...['AGENTS.md', 'CLAUDE.md'].filter((file) => existsSync(path.join(repoRoot, file))),
  ];

  if (!checkMapFreshness(repoRoot).fresh) {
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
  }

  const dirtyTargets = dirtyArtifactTargets(repoRoot, artifactTargets);
  if (dirtyTargets.length > 0) {
    warn(
      `plan-product: code map regenerated before push and ${dirtyTargets.join(', ')} ${dirtyTargets.length === 1 ? 'has' : 'have'} uncommitted changes — commit the refreshed artifacts`
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
