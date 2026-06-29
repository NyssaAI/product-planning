import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { detectCodeMapRoots } from '../../module-map/lib/auto-detect.mjs';

/** @type {readonly string[]} */
export const DEFAULT_SCAN_ROOTS = ['src'];

/** @type {readonly string[]} */
export const SUPPORTED_LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'CSharp',
  'Java',
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
  '.java',
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
 * @property {string} output
 * @property {readonly string[]} roots
 * @property {readonly string[]} languages
 */

/**
 * @param {string} repoRoot
 * @returns {CodeMapConfig}
 */
export function loadCodeMapConfig(repoRoot) {
  const configPath = path.join(repoRoot, 'code-indexer.config.json');
  const defaults = {
    output: 'docs/code-index/code-map.json',
    roots: DEFAULT_SCAN_ROOTS,
    languages: SUPPORTED_LANGUAGES,
  };

  if (!existsSync(configPath)) {
    return {
      ...defaults,
      roots: detectCodeMapRoots(repoRoot),
    };
  }

  const raw = JSON.parse(readFileSync(configPath, 'utf8'));
  return {
    output:
      typeof raw.output === 'string' ? raw.output : defaults.output,
    roots: Array.isArray(raw.roots)
      ? raw.roots
      : detectCodeMapRoots(repoRoot),
    languages: Array.isArray(raw.languages)
      ? raw.languages
      : defaults.languages,
  };
}
