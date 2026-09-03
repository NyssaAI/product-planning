import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { detectCodeMapRoots } from '../../module-map/lib/auto-detect.mjs';

/** Fallback code-map location when neither config file names one. */
export const DEFAULT_CODE_MAP_OUTPUT = 'docs/code-map/code-map.json';

/** @type {readonly string[]} */
export const SUPPORTED_LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'CSharp',
  'Python',
  'Go',
];

// Extensions that drive file detection. The first block has ast-grep
// scan rules; everything from `.kt` down is detected-but-unsupported — it has
// NO ast-grep rules or stack-graph adapter, so such files contribute to root
// detection only and yield no symbols. Do not remove them without confirming
// detection elsewhere does not depend on them.
export const SOURCE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.cs',
  '.py',
  '.go',
  // Detected-but-unsupported (no rules/adapter) below this line:
  '.kt',
  '.kts',
  '.rb',
  '.php',
  '.swift',
  '.cpp',
  '.c',
  '.h',
  '.hpp',
  '.vb',
  '.fs',
]);

/**
 * @typedef {object} CodeMapConfig
 * @property {string} output repo-relative code-map output path
 * @property {readonly string[]} roots
 * @property {readonly string[]} languages
 */

/**
 * `.plan-product/config.json` `paths` block, or `{}` when the file is absent
 * or unparseable (module-map treats it the same way).
 *
 * @param {string} repoRoot
 * @returns {Record<string, unknown>}
 */
function readPlanProductPaths(repoRoot) {
  const configPath = path.join(repoRoot, '.plan-product', 'config.json');
  if (!existsSync(configPath)) {
    return {};
  }
  try {
    const parsed = JSON.parse(readFileSync(configPath, 'utf8'));
    return parsed && typeof parsed.paths === 'object' && parsed.paths !== null
      ? parsed.paths
      : {};
  } catch {
    return {};
  }
}

/**
 * Resolve where the code map is written. Both generators must agree on this
 * path or module-map reads a stale/missing map. Preserve the legacy `output`
 * key as the most specific override, followed by `codeMapOutput`, then
 * `.plan-product/config.json` `paths.codeMap` + `/code-map.json`, then the
 * default.
 *
 * @param {Record<string, unknown>} raw parsed plan-product.config.json (or `{}`)
 * @param {Record<string, unknown>} planProductPaths `.plan-product/config.json` `paths`
 * @returns {string} repo-relative, forward-slash path
 */
export function resolveCodeMapOutput(raw, planProductPaths) {
  if (typeof raw.output === 'string') {
    if (
      typeof raw.codeMapOutput === 'string' &&
      raw.codeMapOutput !== raw.output
    ) {
      process.stderr.write(
        `code-map: plan-product.config.json sets both output (${raw.output}) and codeMapOutput (${raw.codeMapOutput}); using output\n`
      );
    }
    return raw.output;
  }
  if (typeof raw.codeMapOutput === 'string') {
    return raw.codeMapOutput;
  }
  if (typeof planProductPaths.codeMap === 'string') {
    return path.posix.join(
      planProductPaths.codeMap.replace(/\\/g, '/').replace(/\/$/, ''),
      'code-map.json'
    );
  }
  return DEFAULT_CODE_MAP_OUTPUT;
}

/**
 * Resolve a configured path and reject escapes from the repository. Existing
 * paths are checked after symlink/junction resolution as well as lexically.
 *
 * @param {string} repoRoot
 * @param {string} configuredPath
 * @param {string} label
 * @returns {string} absolute contained path
 */
export function resolveRepoContainedPath(repoRoot, configuredPath, label) {
  if (typeof configuredPath !== 'string' || configuredPath.trim() === '') {
    throw new Error(`${label} must be a non-empty path within the project root`);
  }
  const root = path.resolve(repoRoot);
  const resolved = path.resolve(root, configuredPath);
  if (!isContained(root, resolved)) {
    throw new Error(`${label} must be within the project root: ${configuredPath}`);
  }
  const realRoot = realpathSync(root);
  let existingAncestor = resolved;
  while (!existsSync(existingAncestor)) {
    const parent = path.dirname(existingAncestor);
    if (parent === existingAncestor) {
      break;
    }
    existingAncestor = parent;
  }
  const realAncestor = realpathSync(existingAncestor);
  const realTarget = path.resolve(
    realAncestor,
    path.relative(existingAncestor, resolved)
  );
  if (!isContained(realRoot, realTarget)) {
    throw new Error(`${label} must be within the project root: ${configuredPath}`);
  }
  return resolved;
}

/**
 * @param {string} root
 * @param {string} candidate
 * @returns {boolean}
 */
function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  );
}

/**
 * @param {string} repoRoot
 * @returns {CodeMapConfig}
 */
export function loadCodeMapConfig(repoRoot) {
  const configPath = path.join(repoRoot, 'plan-product.config.json');
  const planProductPaths = readPlanProductPaths(repoRoot);

  if (!existsSync(configPath)) {
    const config = {
      output: resolveCodeMapOutput({}, planProductPaths),
      roots: detectCodeMapRoots(repoRoot),
      languages: SUPPORTED_LANGUAGES,
    };
    validateCodeMapPaths(repoRoot, config);
    return config;
  }

  /** @type {Record<string, unknown>} */
  let raw;
  try {
    raw = JSON.parse(readFileSync(configPath, 'utf8'));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`plan-product.config.json is not valid JSON: ${message}`);
  }
  const config = {
    output: resolveCodeMapOutput(raw, planProductPaths),
    roots: Array.isArray(raw.roots)
      ? raw.roots
      : detectCodeMapRoots(repoRoot),
    languages: Array.isArray(raw.languages)
      ? raw.languages
      : SUPPORTED_LANGUAGES,
  };
  validateCodeMapPaths(repoRoot, config);
  return config;
}

/**
 * @param {string} repoRoot
 * @param {CodeMapConfig} config
 */
function validateCodeMapPaths(repoRoot, config) {
  resolveRepoContainedPath(repoRoot, config.output, 'code-map output');
  for (const root of config.roots) {
    resolveRepoContainedPath(repoRoot, root, 'code-map root');
  }
}
