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

// Go-scoped hygiene: vendored, generated, and test Go files stay out of the
// symbol index and the endpoint walk without changing other languages' walks.
const GO_EXCLUDED_DIR_RE = /(^|\/)(vendor|testdata)\//;

/**
 * @param {string} repoRelPath forward-slash repo-relative path
 * @returns {boolean}
 */
export function isExcludedGoFile(repoRelPath) {
  if (!repoRelPath.endsWith('.go')) {
    return false;
  }
  return (
    GO_EXCLUDED_DIR_RE.test(repoRelPath) ||
    repoRelPath.endsWith('_test.go') ||
    repoRelPath.endsWith('.pb.go')
  );
}

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
  ['.java', 'Java'],
  ['.py', 'Python'],
  ['.go', 'Go'],
]);

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
