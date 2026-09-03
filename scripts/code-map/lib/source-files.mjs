import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { BASE_SKIP_DIRS } from '../../lib/skip-dirs.mjs';
import { SOURCE_EXTENSIONS } from './code-map-config.mjs';

// Shared base infra/test-output dirs (includes fixtures/__fixtures__ so scans
// no longer leak fixture endpoints) plus Python virtualenv dirs.
export const SOURCE_SCAN_SKIP_DIRS = new Set([
  ...BASE_SKIP_DIRS,
  '.venv',
  'venv',
  '__pycache__',
]);

// Go-scoped hygiene lives in the shared go-mod helper; re-exported here for
// code-map consumers (generate-code-map.mjs and tests import from this file).
export { isExcludedGoFile } from '../../lib/go-mod.mjs';
import { isExcludedGoFile } from '../../lib/go-mod.mjs';

const EXTENSION_LANGUAGES = new Map([
  ['.js', 'JavaScript'],
  ['.jsx', 'JavaScript'],
  ['.mjs', 'JavaScript'],
  ['.cjs', 'JavaScript'],
  ['.ts', 'TypeScript'],
  ['.tsx', 'TypeScript'],
  ['.mts', 'TypeScript'],
  ['.cts', 'TypeScript'],
  ['.cs', 'CSharp'],
  ['.py', 'Python'],
  ['.go', 'Go'],
]);

/**
 * Whether a repo-relative path sits under a directory the source walkers
 * skip. The ast-grep symbol scan walks roots itself, so its matches must be
 * filtered with this before they enter the index or the endpoint file union.
 *
 * @param {string} repoRelativePath forward-slash repo-relative path
 * @returns {boolean}
 */
export function isInSkippedDir(repoRelativePath) {
  return repoRelativePath
    .split('/')
    .slice(0, -1)
    .some((segment) => SOURCE_SCAN_SKIP_DIRS.has(segment));
}

/**
 * @param {string} repoRoot
 * @param {readonly string[]} roots
 * @returns {string[]}
 */
export function sourceFilesInRoots(repoRoot, roots) {
  const seen = new Set();
  const files = [];
  for (const root of roots) {
    walkSourceFiles(repoRoot, path.join(repoRoot, root), files, seen);
  }
  return files.sort();
}

/**
 * @param {string} filePath
 * @returns {string | null}
 */
export function languageForFile(filePath) {
  return EXTENSION_LANGUAGES.get(path.extname(filePath)) ?? null;
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
export function isKnownSourceFile(filePath) {
  return SOURCE_EXTENSIONS.has(path.extname(filePath));
}

/**
 * @param {string} repoRoot
 * @param {string} dir
 * @param {string[]} acc
 * @param {Set<string>} seen
 */
function walkSourceFiles(repoRoot, dir, acc, seen) {
  if (!existsSync(dir)) {
    return;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SOURCE_SCAN_SKIP_DIRS.has(entry.name)) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(repoRoot, full, acc, seen);
      continue;
    }
    if (entry.isFile() && isKnownSourceFile(entry.name)) {
      const rel = path.relative(repoRoot, full).replace(/\\/g, '/');
      if (isExcludedGoFile(rel)) {
        continue;
      }
      if (!seen.has(rel)) {
        seen.add(rel);
        acc.push(rel);
      }
    }
  }
}
