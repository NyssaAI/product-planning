import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const PLUGIN_NAME = 'plan-product';

const MANIFEST_DIRS = ['.codex-plugin', '.claude-plugin', '.cursor-plugin'];

/** Env values already warned about, so repeated lookups stay quiet. */
const warnedEnvRoots = new Set();

/**
 * @param {string} file
 * @returns {Record<string, any> | null}
 */
function readJsonQuietly(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * True when an environment-provided directory is a plan-product plugin root:
 * it carries Claude's plugin manifest or a package.json whose `name` is
 * plan-product. Other plugin manifests are not enough for an environment
 * override because they may belong to the invoking foreign plugin.
 *
 * @param {string} dir
 * @returns {boolean}
 */
export function isPlanProductPluginRoot(dir) {
  if (existsSync(path.join(dir, '.claude-plugin', 'plugin.json'))) {
    return true;
  }
  const pkg = readJsonQuietly(path.join(dir, 'package.json'));
  return Boolean(pkg && pkg.name === PLUGIN_NAME);
}

/**
 * @param {string} key
 * @param {string} raw
 */
function warnIgnoredEnvRoot(key, raw) {
  const marker = `${key}=${raw}`;
  if (warnedEnvRoots.has(marker)) {
    return;
  }
  warnedEnvRoots.add(marker);
  process.stderr.write(
    `plan-product: ignoring ${key}=${raw} — no plan-product plugin manifest ` +
      '(.claude-plugin/plugin.json or package.json named plan-product) found there; ' +
      'falling back to the script location\n'
  );
}

/**
 * @param {string} [startDir] Directory of the calling script (e.g. code-map toolkit dir).
 * @returns {string | null}
 */
export function findPluginRoot(startDir) {
  for (const key of [
    'PLAN_PRODUCT_PLUGIN_ROOT',
    'PLUGIN_ROOT',
    'CLAUDE_PLUGIN_ROOT',
    'CURSOR_PLUGIN_ROOT',
  ]) {
    const raw = process.env[key]?.trim();
    if (!raw) {
      continue;
    }
    const resolved = path.resolve(raw);
    if (isPlanProductPluginRoot(resolved)) {
      return resolved;
    }
    warnIgnoredEnvRoot(key, raw);
  }

  let dir = path.resolve(startDir ?? process.cwd());
  for (;;) {
    if (
      MANIFEST_DIRS.some((manifestDir) =>
        existsSync(path.join(dir, manifestDir, 'plugin.json'))
      )
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  return null;
}
