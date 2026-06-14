import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { detectCodeMapRoots } from '../../ai-plan/lib/auto-detect.mjs';

/** @type {readonly string[]} */
export const DEFAULT_SCAN_ROOTS = ['src', 'native'];

/** @type {readonly string[]} */
export const SUPPORTED_LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'CSharp',
  'Java',
  'Python',
  'Go',
  'Rust',
];

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
  '.rs',
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
  const configPath = path.join(repoRoot, 'code-map.config.json');
  const defaults = {
    output: 'docs/agent-plan/context/code-map.json',
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
