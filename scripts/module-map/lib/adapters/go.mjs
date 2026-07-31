/**
 * Go StackGraphAdapter.
 *
 * Produces a FileGraph from candidate Go files by extracting code-map symbols
 * and resolving intra-repo import edges statically: `go.mod` module lines and
 * `go.work` use directives map import paths to package directories — no Go
 * toolchain is invoked. Edges fan out dir-level: an import of a package adds
 * one edge per candidate file in that package directory.
 *
 * Hygiene: `vendor/` and `testdata/` directories, `*.pb.go`, and `_test.go`
 * files are dropped from candidates. Files whose nearest enclosing `go.mod`
 * is not a recognized module root (root module or a `go.work` member) belong
 * to a nested module and are excluded, matching Go semantics.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAstGrepBinary } from '../../../lib/resolve-ast-grep.mjs';
import { createLogger } from '../logger.mjs';
import { runBatchedScan } from './sg-scan.mjs';
import { symbolNameFromMatch } from '../../../lib/sg-result.mjs';
import { BASE_SKIP_DIRS } from '../../../lib/skip-dirs.mjs';

const log = createLogger({ module: 'go-adapter' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CODE_MAP_DIR = path.resolve(__dirname, '../../../code-map');
const SG_CONFIG_PATH = path.join(CODE_MAP_DIR, 'sgconfig.yml');

// Shared base infra/test-output dirs plus Go vendoring and test fixtures.
const SKIP_DIRS = new Set([...BASE_SKIP_DIRS, 'vendor', 'testdata']);

const adapter = {
  id: 'go',
  matches,
  extract,
};

export default adapter;

/**
 * @param {string} repoRoot
 * @returns {boolean}
 */
function matches(repoRoot) {
  try {
    const scan = scanForGoMarkers(repoRoot);
    return scan.hasGoMod && scan.hasGoFiles;
  } catch (error) {
    log.debug('go matches failed', { error: errorMessage(error) });
    return false;
  }
}

/**
 * Bounded walk finding go.mod/go.work presence and .go files, honoring
 * SKIP_DIRS so fixture repos and vendored trees never count as markers.
 * @param {string} repoRoot
 * @returns {{ hasGoMod: boolean, hasGoFiles: boolean }}
 */
function scanForGoMarkers(repoRoot) {
  let hasGoMod =
    existsSync(path.join(repoRoot, 'go.mod')) ||
    existsSync(path.join(repoRoot, 'go.work'));
  let hasGoFiles = false;
  const stack = [repoRoot];
  let checked = 0;
  while (stack.length > 0 && checked < 2000 && !(hasGoMod && hasGoFiles)) {
    const current = stack.pop();
    checked += 1;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          stack.push(path.join(current, entry.name));
        }
        continue;
      }
      if (entry.name === 'go.mod') {
        hasGoMod = true;
      }
      if (entry.name.endsWith('.go')) {
        hasGoFiles = true;
      }
    }
  }
  return { hasGoMod, hasGoFiles };
}

/**
 * @param {string} repoRoot
 * @param {string[]} files repo-relative candidate files
 * @returns {import('../detection/types.mjs').FileGraph}
 */
function extract(repoRoot, files) {
  try {
    const moduleRoots = discoverModuleRoots(repoRoot);
    const allModDirs = moduleRoots.allModDirs;
    const candidateFiles = normalizeCandidateFiles(files).filter((file) => {
      const nearest = nearestModDir(file, allModDirs);
      return nearest !== null && moduleRoots.roots.has(nearest);
    });

    const packageIndex = buildPackageIndex(candidateFiles, moduleRoots);
    const filesByDir = groupByDir(candidateFiles);
    const symbolsByFile = extractSymbols(repoRoot, candidateFiles);
    const edgeWeights = new Map();

    for (const source of candidateFiles) {
      const absSource = path.join(repoRoot, source);
      if (!existsSync(absSource)) {
        continue;
      }
      const sourceDir = dirOf(source);
      const text = readFileSync(absSource, 'utf8');
      for (const importPath of readImportPaths(text)) {
        const targetDir = packageIndex.get(importPath);
        if (targetDir === undefined || targetDir === sourceDir) {
          continue;
        }
        for (const target of filesByDir.get(targetDir) ?? []) {
          const key = `${source}\0${target}`;
          edgeWeights.set(key, (edgeWeights.get(key) ?? 0) + 1);
        }
      }
    }

    const graphFiles = candidateFiles.map((file) => ({
      path: file,
      symbols: symbolsByFile.get(file) ?? [],
    }));

    const edges = [...edgeWeights.entries()]
      .map(([key, weight]) => {
        const [from, to] = key.split('\0');
        return { from, to, weight };
      })
      .sort(
        (a, b) =>
          a.from.localeCompare(b.from) ||
          a.to.localeCompare(b.to) ||
          a.weight - b.weight
      );

    log.debug('go extract complete', {
      files: graphFiles.length,
      edges: edges.length,
    });
    return { files: graphFiles, edges };
  } catch (error) {
    log.warn('go extract failed; returning empty graph', {
      error: errorMessage(error),
    });
    return { files: [], edges: [] };
  }
}

/**
 * @param {string[]} files
 * @returns {string[]}
 */
function normalizeCandidateFiles(files) {
  return [...new Set(files.map(normalizePath))]
    .filter(
      (file) =>
        file.endsWith('.go') &&
        !file.endsWith('_test.go') &&
        !file.endsWith('.pb.go') &&
        !/(^|\/)(vendor|testdata)\//.test(file)
    )
    .sort();
}

/**
 * Recognized module roots: the root go.mod and go.work `use` members. Other
 * discovered go.mod dirs are nested modules whose subtrees are excluded. When
 * the repo root has neither go.mod nor go.work, every discovered go.mod dir
 * is a root (subdirectory monorepo).
 * @param {string} repoRoot
 * @returns {{ roots: Map<string, string>, allModDirs: string[] }}
 *   roots: module dir ('' for repo root) -> module path from its go.mod
 */
function discoverModuleRoots(repoRoot) {
  const modDirs = findGoModDirs(repoRoot);
  /** @type {Map<string, string>} */
  const roots = new Map();

  const rootHasMod = modDirs.includes('');
  const workMembers = readGoWorkMembers(repoRoot);

  /** @type {string[]} */
  let rootDirs;
  if (rootHasMod || workMembers.length > 0) {
    rootDirs = [
      ...(rootHasMod ? [''] : []),
      ...workMembers.filter((dir) => modDirs.includes(dir)),
    ];
  } else {
    rootDirs = modDirs;
  }

  for (const dir of rootDirs) {
    const modulePath = readModulePath(repoRoot, dir);
    if (modulePath) {
      roots.set(dir, modulePath);
    }
  }
  return { roots, allModDirs: modDirs };
}

/**
 * @param {string} repoRoot
 * @returns {string[]} repo-relative dirs containing go.mod ('' for root)
 */
function findGoModDirs(repoRoot) {
  /** @type {string[]} */
  const dirs = [];
  const stack = [repoRoot];
  let checked = 0;
  while (stack.length > 0 && checked < 2000) {
    const current = stack.pop();
    checked += 1;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          stack.push(path.join(current, entry.name));
        }
        continue;
      }
      if (entry.name === 'go.mod') {
        dirs.push(normalizePath(path.relative(repoRoot, current)));
      }
    }
  }
  return dirs.sort();
}

/**
 * @param {string} repoRoot
 * @returns {string[]} repo-relative member dirs from go.work `use` directives
 */
function readGoWorkMembers(repoRoot) {
  const workFile = path.join(repoRoot, 'go.work');
  if (!existsSync(workFile)) {
    return [];
  }
  const text = readFileSync(workFile, 'utf8');
  /** @type {string[]} */
  const members = [];
  const blockMatch = text.match(/^use\s*\(([\s\S]*?)\)/m);
  const singles = [...text.matchAll(/^use\s+([^\s(][^\n]*)$/gm)].map(
    (m) => m[1]
  );
  const rawEntries = [
    ...(blockMatch
      ? blockMatch[1].split('\n').map((line) => line.trim())
      : []),
    ...singles,
  ];
  for (const raw of rawEntries) {
    const entry = raw.replace(/\/\/.*$/, '').trim();
    if (!entry) {
      continue;
    }
    const rel = normalizePath(entry.replace(/^\.\//, ''));
    if (!rel.startsWith('..')) {
      members.push(rel === '.' ? '' : rel);
    }
  }
  return members;
}

/**
 * @param {string} repoRoot
 * @param {string} dir repo-relative module dir ('' for root)
 * @returns {string | null} the go.mod `module` path
 */
function readModulePath(repoRoot, dir) {
  const modFile = path.join(repoRoot, dir, 'go.mod');
  if (!existsSync(modFile)) {
    return null;
  }
  const match = readFileSync(modFile, 'utf8').match(/^module\s+(\S+)/m);
  return match ? match[1] : null;
}

/**
 * @param {string} file repo-relative path
 * @param {string[]} modDirs repo-relative go.mod dirs
 * @returns {string | null} deepest modDir that contains file
 */
function nearestModDir(file, modDirs) {
  let best = null;
  for (const dir of modDirs) {
    if (dir === '' || file.startsWith(`${dir}/`)) {
      if (best === null || dir.length > best.length) {
        best = dir;
      }
    }
  }
  return best;
}

/**
 * Map full import paths to package directories across all module roots.
 * @param {string[]} candidateFiles
 * @param {{ roots: Map<string, string> }} moduleRoots
 * @returns {Map<string, string>} import path -> repo-relative package dir
 */
function buildPackageIndex(candidateFiles, moduleRoots) {
  /** @type {Map<string, string>} */
  const index = new Map();
  const dirs = new Set(candidateFiles.map(dirOf));
  for (const dir of dirs) {
    for (const [rootDir, modulePath] of moduleRoots.roots) {
      const inRoot = rootDir === '' || dir === rootDir || dir.startsWith(`${rootDir}/`);
      if (!inRoot) {
        continue;
      }
      const relPkg =
        dir === rootDir ? '' : rootDir === '' ? dir : dir.slice(rootDir.length + 1);
      const importPath = relPkg ? `${modulePath}/${relPkg}` : modulePath;
      if (!index.has(importPath)) {
        index.set(importPath, dir);
      }
    }
  }
  return index;
}

/**
 * Line-based Go import parser: single imports (`import "x"`, with optional
 * alias, `.`, or `_`) and import blocks. Blank and dot imports count as
 * dependencies — blank imports are real side-effect edges (db drivers).
 * @param {string} text
 * @returns {string[]}
 */
function readImportPaths(text) {
  /** @type {string[]} */
  const paths = [];
  let inBlock = false;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (inBlock) {
      if (line.startsWith(')')) {
        inBlock = false;
        continue;
      }
      const match = line.match(/^(?:[\w.]+\s+|_\s+|\.\s+)?"([^"]+)"/);
      if (match) {
        paths.push(match[1]);
      }
      continue;
    }
    if (/^import\s*\($/.test(line)) {
      inBlock = true;
      continue;
    }
    const single = line.match(/^import\s+(?:[\w.]+\s+|_\s+|\.\s+)?"([^"]+)"/);
    if (single) {
      paths.push(single[1]);
    }
  }
  return paths;
}

/**
 * @param {string[]} candidateFiles
 * @returns {Map<string, string[]>} dir -> files
 */
function groupByDir(candidateFiles) {
  /** @type {Map<string, string[]>} */
  const byDir = new Map();
  for (const file of candidateFiles) {
    const dir = dirOf(file);
    if (!byDir.has(dir)) {
      byDir.set(dir, []);
    }
    byDir.get(dir).push(file);
  }
  return byDir;
}

/**
 * @param {string} file
 * @returns {string} repo-relative dir ('' for root)
 */
function dirOf(file) {
  const dir = path.posix.dirname(file);
  return dir === '.' ? '' : dir;
}

/**
 * @param {string} repoRoot
 * @param {string[]} candidateFiles
 * @returns {Map<string, Array<{ name: string, kind: string, line: number }>>}
 */
function extractSymbols(repoRoot, candidateFiles) {
  const symbols = new Map(candidateFiles.map((file) => [file, []]));
  if (candidateFiles.length === 0) {
    return symbols;
  }

  try {
    const binary = resolveAstGrepBinary({
      toolkitDir: CODE_MAP_DIR,
      projectRoot: repoRoot,
    });
    if (!existsSync(binary)) {
      log.debug('ast-grep binary not found for Go symbols', { binary });
      return symbols;
    }

    const matches = runBatchedScan(
      binary,
      repoRoot,
      candidateFiles.map((file) => path.join(repoRoot, file)),
      ['--config', SG_CONFIG_PATH, '--include-metadata']
    );
    const candidateSet = new Set(candidateFiles);
    for (const match of matches) {
      const file = normalizePath(
        path.relative(repoRoot, String(match.file ?? ''))
      );
      if (!candidateSet.has(file)) {
        continue;
      }
      const name = symbolNameFromMatch(match);
      if (!name) {
        continue;
      }
      const range = /** @type {{ start?: { line?: number } }} */ (match.range);
      const metadata = /** @type {{ mapKind?: string }} */ (
        match.metadata ?? {}
      );
      symbols.get(file).push({
        name,
        kind: metadata.mapKind ?? 'symbol',
        line: (range?.start?.line ?? 0) + 1,
      });
    }

    for (const fileSymbols of symbols.values()) {
      fileSymbols.sort((a, b) => a.line - b.line || a.name.localeCompare(b.name));
    }
  } catch (error) {
    log.debug('symbol extraction failed', { error: errorMessage(error) });
  }

  return symbols;
}

/**
 * @param {string} p
 * @returns {string}
 */
function normalizePath(p) {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error ?? '');
}
