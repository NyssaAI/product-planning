import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { detectCodeMapRoots } from '../../module-map/lib/auto-detect.mjs';
import {
  DEFAULT_CODE_MAP_OUTPUT,
  resolveCodeMapOutput,
} from '../../lib/code-map-output.mjs';
import {
  isPathContained,
  resolveRepoContainedPath,
} from '../../lib/repo-paths.mjs';

export {
  DEFAULT_CODE_MAP_OUTPUT,
  isPathContained,
  resolveCodeMapOutput,
  resolveRepoContainedPath,
};

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
