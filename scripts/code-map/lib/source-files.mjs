import { readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { BASE_SKIP_DIRS } from '../../lib/skip-dirs.mjs';
import { isPathContained } from '../../lib/repo-paths.mjs';
import { SOURCE_EXTENSIONS } from './code-map-config.mjs';

export const SOURCE_SCAN_SKIP_DIRS = new Set(BASE_SKIP_DIRS);

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

// Directory errors that mean "cannot look inside", not "the walk is broken":
// skip the subtree with a warning instead of aborting the whole generation.
const SKIPPABLE_DIR_ERRORS = new Set(['EPERM', 'EACCES']);

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
  const visitedDirs = new Set();
  const files = [];
  const realRepoRoot = realpathSync(repoRoot);
  for (const root of roots) {
    walkSourceFiles(
      repoRoot,
      realRepoRoot,
      path.resolve(repoRoot, root),
      files,
      seen,
      visitedDirs
    );
  }
  return files.sort();
}

/** Shared source boundary for symbols, endpoints, patterns, and dependency adapters. */
export function sourceInventory(repoRoot, { roots, languages }) {
  const candidates = sourceFilesInRoots(repoRoot, roots);
  const enabled = new Set(languages);
  return {
    roots: [...roots],
    languages: [...languages],
    files: candidates.filter(file => isLanguageEnabled(file, enabled)),
    unsupportedFiles: candidates.filter(file => languageForFile(file) === null),
    disabledFiles: candidates.filter(file => languageForFile(file) !== null && !isLanguageEnabled(file, enabled)),
  };
}

/**
 * @param {string} filePath
 * @returns {string | null}
 */
export function languageForFile(filePath) {
  return EXTENSION_LANGUAGES.get(path.extname(filePath)) ?? null;
}

/**
 * True when the file maps to a configured language. Unknown extensions are
 * excluded from symbol and endpoint inputs because no configured language can
 * enable them.
 *
 * @param {string} filePath
 * @param {ReadonlySet<string>} languages
 * @returns {boolean}
 */
export function isLanguageEnabled(filePath, languages) {
  const language = languageForFile(filePath);
  return language !== null && languages.has(language);
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
 * @param {string} target
 * @returns {import('node:fs').Stats | null} stats following links, or null when the target is missing
 */
function statFollowing(repoRoot, target) {
  try {
    return statSync(target);
  } catch (err) {
    if (isMissingError(err) || warnSkippedDirectory(repoRoot, target, err)) {
      return null;
    }
    throw err;
  }
}

/**
 * @param {string} repoRoot
 * @param {string} dir
 * @returns {string | null}
 */
function realDirectoryPath(repoRoot, dir) {
  try {
    return realpathSync(dir);
  } catch (err) {
    if (isMissingError(err) || warnSkippedDirectory(repoRoot, dir, err)) {
      return null;
    }
    throw err;
  }
}

/** @param {unknown} err */
function isMissingError(err) {
  return /** @type {{ code?: string }} */ (err)?.code === 'ENOENT';
}

/**
 * @param {string} repoRoot
 * @param {string} dir
 * @param {unknown} err
 * @returns {boolean} whether the error was reported as a skippable permission failure
 */
function warnSkippedDirectory(repoRoot, dir, err) {
  const code = /** @type {{ code?: string }} */ (err)?.code ?? '';
  if (!SKIPPABLE_DIR_ERRORS.has(code)) {
    return false;
  }
  const rel = path.relative(repoRoot, dir).replace(/\\/g, '/') || '.';
  process.stderr.write(
    `code-map: skipping ${rel} (${code}: directory is not readable)\n`
  );
  return true;
}

/**
 * @param {string} repoRoot
 * @param {string} realRepoRoot
 * @param {string} dir
 * @param {string[]} acc
 * @param {Set<string>} seen repo-relative file paths already collected
 * @param {Set<string>} visitedDirs real paths of directories already walked; a
 *   symlink or junction is followed at most once and cycles terminate here
 */
function walkSourceFiles(repoRoot, realRepoRoot, dir, acc, seen, visitedDirs) {
  const realDir = realDirectoryPath(repoRoot, dir);
  if (
    realDir === null ||
    !isPathContained(realRepoRoot, realDir) ||
    visitedDirs.has(realDir)
  ) {
    return;
  }
  visitedDirs.add(realDir);

  /** @type {import('node:fs').Dirent[]} */
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if (warnSkippedDirectory(repoRoot, dir, err)) {
      return;
    }
    throw err;
  }

  for (const entry of entries) {
    if (SOURCE_SCAN_SKIP_DIRS.has(entry.name)) {
      continue;
    }
    const full = path.join(dir, entry.name);
    let isDirectory = entry.isDirectory();
    let isFile = entry.isFile();
    if (entry.isSymbolicLink()) {
      // Symlinks and Windows junctions: resolve the target once; `visitedDirs`
      // keeps a link back into an ancestor from looping.
      const stats = statFollowing(repoRoot, full);
      const realTarget = stats ? realDirectoryPath(repoRoot, full) : null;
      if (realTarget === null || !isPathContained(realRepoRoot, realTarget)) {
        continue;
      }
      isDirectory = stats?.isDirectory() ?? false;
      isFile = stats?.isFile() ?? false;
    }
    if (isDirectory) {
      walkSourceFiles(
        repoRoot,
        realRepoRoot,
        full,
        acc,
        seen,
        visitedDirs
      );
      continue;
    }
    if (isFile && isKnownSourceFile(entry.name)) {
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
