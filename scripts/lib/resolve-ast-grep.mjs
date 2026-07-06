import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findPluginRoot } from './plugin-root.mjs';

/**
 * @param {string} base Path without .exe
 * @returns {string | null}
 */
function binaryAtBase(base) {
  const candidate =
    process.platform === 'win32' ? `${base}.exe` : base;
  return existsSync(candidate) ? candidate : null;
}

/**
 * @param {string} root
 * @returns {string | null}
 */
function binaryInNodeModules(root) {
  return binaryAtBase(
    path.join(root, 'node_modules', '@ast-grep', 'cli', 'ast-grep')
  );
}

/**
 * Install @ast-grep/cli into the plugin root (once). No project-repo install required.
 * @param {string} pluginRoot
 */
function ensurePluginAstGrep(pluginRoot) {
  const pkgPath = path.join(pluginRoot, 'package.json');
  if (!existsSync(pkgPath)) {
    throw new Error(
      `plan-product plugin package.json not found at ${pluginRoot}`
    );
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (!pkg.dependencies?.['@ast-grep/cli']) {
    throw new Error(
      'plan-product plugin package.json must list @ast-grep/cli under dependencies'
    );
  }

  process.stderr.write(
    `plan-product: installing @ast-grep/cli into plugin (one-time, ${pluginRoot})…\n`
  );

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(
    npm,
    ['install', '--omit=dev', '--no-audit', '--no-fund', '--prefer-offline'],
    {
      cwd: pluginRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      timeout: 120_000,
    }
  );

  if (result.status !== 0) {
    throw new Error(
      `Failed to install @ast-grep/cli in plan-product plugin (exit ${result.status ?? 'unknown'}). Ensure Node.js and npm are available.`
    );
  }
}

/**
 * Resolve ast-grep binary shipped with the plan-product plugin.
 * @param {{ toolkitDir: string, projectRoot?: string }} options
 * @returns {string}
 */
export function resolveAstGrepBinary(options) {
  const { toolkitDir, projectRoot } = options;
  const pluginRoot =
    findPluginRoot(toolkitDir) ??
    findPluginRoot(path.join(toolkitDir, '../..'));

  /** @type {string[]} */
  const searchRoots = [];

  if (pluginRoot) {
    searchRoots.push(pluginRoot);
  }

  const jamaynorHome =
    process.env.JAMAYNOR_HOME?.trim() ||
    path.join(os.homedir(), '.jamaynor');
  searchRoots.push(jamaynorHome);

  if (projectRoot) {
    searchRoots.push(projectRoot);
  }

  for (const root of searchRoots) {
    const found = binaryInNodeModules(root);
    if (found) {
      return found;
    }
  }

  if (pluginRoot) {
    ensurePluginAstGrep(pluginRoot);
    const found = binaryInNodeModules(pluginRoot);
    if (found) {
      return found;
    }
  }

  throw new Error(
    '@ast-grep/cli not found. The plan-product plugin should install it automatically on first use. ' +
      'If this persists, run `npm install` in the plan-product plugin directory (PLAN_PRODUCT_PLUGIN_ROOT / CLAUDE_PLUGIN_ROOT / CURSOR_PLUGIN_ROOT).'
  );
}
