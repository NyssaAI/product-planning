import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
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
 * The @ast-grep/cli optionalDependency holding this platform's prebuilt binary.
 *
 * npm installs it directly, so it is present even when install scripts are
 * blocked. Returns null where no prebuilt exists (musl, unlisted arch).
 * @returns {string | null}
 */
export function astGrepPlatformPackage() {
  const { platform, arch } = process;
  if (platform === 'win32') {
    if (arch === 'x64') return '@ast-grep/cli-win32-x64-msvc';
    if (arch === 'arm64') return '@ast-grep/cli-win32-arm64-msvc';
    if (arch === 'ia32') return '@ast-grep/cli-win32-ia32-msvc';
    return null;
  }
  if (platform === 'darwin') {
    if (arch === 'arm64') return '@ast-grep/cli-darwin-arm64';
    if (arch === 'x64') return '@ast-grep/cli-darwin-x64';
    return null;
  }
  if (platform === 'linux') {
    // @ast-grep/cli ships no musl build; its own postinstall bails here too.
    try {
      const { MUSL, familySync } = createRequire(import.meta.url)('detect-libc');
      if (familySync() === MUSL) return null;
    } catch {
      // detect-libc absent: assume glibc, which is what the prebuilts target.
    }
    if (arch === 'arm64') return '@ast-grep/cli-linux-arm64-gnu';
    if (arch === 'x64') return '@ast-grep/cli-linux-x64-gnu';
    return null;
  }
  return null;
}

/**
 * Locate the ast-grep binary beneath a node_modules root.
 *
 * Two places, in order. @ast-grep/cli's postinstall copies the binary out of
 * the platform package into @ast-grep/cli itself; when npm blocks install
 * scripts -- `ignore-scripts`, or an `allowScripts` allowlist that omits the
 * package -- that copy never happens, yet the platform package is installed and
 * holds a working binary. Looking in both means the postinstall is a
 * convenience rather than a requirement.
 * @param {string} root
 * @returns {string | null}
 */
function binaryInNodeModules(root) {
  const copied = binaryAtBase(
    path.join(root, 'node_modules', '@ast-grep', 'cli', 'ast-grep')
  );
  if (copied) {
    return copied;
  }

  const platformPackage = astGrepPlatformPackage();
  if (!platformPackage) {
    return null;
  }

  return binaryAtBase(
    path.join(root, 'node_modules', ...platformPackage.split('/'), 'ast-grep')
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

  const platformPackage = astGrepPlatformPackage();
  const binaryName =
    process.platform === 'win32' ? 'ast-grep.exe' : 'ast-grep';

  throw new Error(
    '@ast-grep/cli not found. The plan-product plugin should install it automatically on first use. ' +
      'If this persists, run `npm install` in the plan-product plugin directory (PLAN_PRODUCT_PLUGIN_ROOT / CLAUDE_PLUGIN_ROOT / CURSOR_PLUGIN_ROOT).' +
      (platformPackage
        ? `\n\nIf npm reported "install scripts blocked", re-running npm install will NOT fix it: the prebuilt lives in ` +
          `node_modules/${platformPackage}/${binaryName} and this resolver already looks there, so a missing binary means ` +
          `that package was not installed either. Check that optional dependencies are enabled (not --no-optional / --omit=optional).`
        : `\n\nNo @ast-grep prebuilt is published for ${process.platform}/${process.arch}` +
          (process.platform === 'linux' ? ' (musl builds are not shipped)' : '') +
          '. Install ast-grep another way and put it on PATH.')
  );
}
