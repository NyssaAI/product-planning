/**
 * Python StackGraphAdapter.
 *
 * Produces a FileGraph from candidate Python files by extracting code-map
 * symbols and resolving intra-repo import edges.
 */

import {
  existsSync,
  readdirSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAstGrepBinary } from '../../../lib/resolve-ast-grep.mjs';
import { createLogger } from '../logger.mjs';
import { runBatchedScan } from './sg-scan.mjs';
import { symbolNameFromMatch } from '../../../lib/sg-result.mjs';
import { BASE_SKIP_DIRS } from '../../../lib/skip-dirs.mjs';

const log = createLogger({ module: 'python-adapter' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CODE_MAP_DIR = path.resolve(__dirname, '../../../code-map');
const SG_CONFIG_PATH = path.join(CODE_MAP_DIR, 'sgconfig.yml');

const PYTHON_MARKERS = new Set([
  'pyproject.toml',
  'setup.cfg',
  'setup.py',
  'requirements.txt',
  'Pipfile',
]);

// Shared base infra/test-output dirs plus Python virtualenv and tool caches.
const SKIP_DIRS = new Set([
  ...BASE_SKIP_DIRS,
  '.venv',
  'venv',
  '__pycache__',
  '.mypy_cache',
  '.pytest_cache',
  '.ruff_cache',
  '.tox',
]);

// A directory holding one of these is a plausible absolute-import root: the
// project is run, tested, or installed from there, so `from app.x import y`
// resolves relative to it rather than to the repo root.
const IMPORT_ROOT_MARKERS = ['pyproject.toml', 'setup.py', 'setup.cfg'];

const FROM_IMPORT_RE = /^\s*from\s+([.\w][\w.]*|\.+)\s+import\s+(.+)$/gm;
const IMPORT_RE = /^\s*import\s+(.+)$/gm;
const DYNAMIC_IMPORT_RE =
  /\bimportlib\.import_module\(\s*['"]([^'"]+)['"]\s*\)/g;
const IMPORT_RULE = JSON.stringify({
  id: 'python-dependency-import', language: 'Python',
  rule: { any: [
    { kind: 'import_statement' },
    { kind: 'import_from_statement' },
    { pattern: 'importlib.import_module($MODULE)' },
  ] },
});

const adapter = {
  id: 'python',
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
    const hasMarker = [...PYTHON_MARKERS].some((marker) =>
      existsSync(path.join(repoRoot, marker))
    );
    return hasMarker && hasPythonFiles(repoRoot);
  } catch (error) {
    log.warn('python matches failed', { error: errorMessage(error) });
    return false;
  }
}

/**
 * @param {string} repoRoot
 * @param {string[]} files repo-relative candidate files
 * @returns {import('../detection/types.mjs').FileGraph}
 */
function extract(repoRoot, files) {
  try {
    const candidateFiles = normalizeCandidateFiles(files);
    const candidateSet = new Set(candidateFiles);
    const moduleIndex = buildModuleIndex(repoRoot, candidateFiles);
    const symbolsByFile = extractSymbols(repoRoot, candidateFiles);
    const importsByFile = extractImports(repoRoot, candidateFiles);
    const edgeWeights = new Map();
    const diagnostics = [];

    for (const source of candidateFiles) {
      const absSource = path.join(repoRoot, source);
      if (!existsSync(absSource)) {
        continue;
      }

      for (const specifier of importsByFile.get(source) ?? []) {
        const target = resolveImportSpecifier(source, specifier, {
          candidateSet,
          moduleIndex,
          sourceFile: source,
        });
        if (!target) {
          diagnostics.push({ kind: specifier.module.startsWith('.') ? 'unresolved-local-import' : 'external-or-unresolved-import', file: source, specifier: specifier.module });
          continue;
        }
        if (target === source) {
          continue;
        }
        const key = `${source}\0${target}`;
        edgeWeights.set(key, (edgeWeights.get(key) ?? 0) + 1);
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

    log.debug('python extract complete', {
      files: graphFiles.length,
      edges: edges.length,
    });
    return { files: graphFiles, edges, diagnostics };
  } catch (error) {
    log.warn('python extract failed; returning empty graph', {
      error: errorMessage(error),
    });
    return { files: [], edges: [], diagnostics: [{ kind: 'extraction-failed', message: errorMessage(error) }] };
  }
}

/**
 * @param {string[]} files
 * @returns {string[]}
 */
function normalizeCandidateFiles(files) {
  return [...new Set(files.map(normalizePath))]
    .filter((file) => file.endsWith('.py'))
    .sort();
}

/**
 * @param {string} repoRoot
 * @returns {boolean}
 */
function hasPythonFiles(repoRoot) {
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
      if (entry.name.endsWith('.py')) {
        return true;
      }
    }
  }
  return false;
}

/**
 * @typedef {{ type: 'import', module: string }} ImportSpecifier
 * @typedef {{ type: 'from', module: string, names: string[] }} FromImportSpecifier
 * @typedef {ImportSpecifier | FromImportSpecifier} PythonSpecifier
 */

/**
 * @param {string} text
 * @returns {PythonSpecifier[]}
 */
function readImportSpecifiers(text) {
  /** @type {PythonSpecifier[]} */
  const specifiers = [];

  for (const match of text.matchAll(FROM_IMPORT_RE)) {
    specifiers.push({
      type: 'from',
      module: match[1],
      names: parseImportedNames(match[2]),
    });
  }

  for (const match of text.matchAll(IMPORT_RE)) {
    for (const imported of splitImportList(match[1])) {
      const moduleName = imported.replace(/\s+as\s+\w+$/u, '').trim();
      if (moduleName) {
        specifiers.push({ type: 'import', module: moduleName });
      }
    }
  }

  for (const match of text.matchAll(DYNAMIC_IMPORT_RE)) {
    specifiers.push({ type: 'import', module: match[1] });
  }

  return specifiers;
}

/** Scan actual import nodes so examples and commented calls cannot create edges. */
function extractImports(repoRoot, candidateFiles) {
  const byFile = new Map(candidateFiles.map(file => [file, []]));
  if (candidateFiles.length === 0) return byFile;
  const binary = resolveAstGrepBinary({ toolkitDir: CODE_MAP_DIR, projectRoot: repoRoot });
  const matches = runBatchedScan(binary, repoRoot,
    candidateFiles.map(file => path.join(repoRoot, file)), ['--inline-rules', IMPORT_RULE]);
  for (const match of matches) {
    const file = normalizePath(path.relative(repoRoot, String(match.file ?? '')));
    if (!byFile.has(file)) continue;
    const text = String(match.text ?? '');
    // Import statement nodes can contain parenthesized lines and comments.
    // Dynamic call strings are left intact for the literal-only matcher.
    const normalized = /^\s*(?:from|import)\s/.test(text)
      ? text.replace(/#[^\r\n]*/g, '').replace(/\\\r?\n/g, ' ').replace(/\r?\n/g, ' ')
      : text;
    byFile.get(file).push(...readImportSpecifiers(normalized));
  }
  return byFile;
}

/**
 * @param {string} sourceFile
 * @param {PythonSpecifier} specifier
 * @param {{ candidateSet: Set<string>, moduleIndex: Map<string, ModuleCandidate[]>, sourceFile: string }} context
 * @returns {string | null}
 */
function resolveImportSpecifier(sourceFile, specifier, context) {
  if (specifier.type === 'import') {
    return resolveModule(specifier.module, context);
  }

  const isRelative = specifier.module.startsWith('.');
  if (!isRelative) {
    return (
      resolveModule(specifier.module, context) ??
      resolveImportedSubmodule(specifier.module, specifier.names, context)
    );
  }

  const resolvedModule = resolveRelativeModule(sourceFile, specifier.module);
  if (!resolvedModule) {
    return null;
  }
  if (specifier.module.replace(/\./g, '') === '') {
    return (
      resolveImportedSubmodule(resolvedModule, specifier.names, context) ??
      resolveModule(resolvedModule, context)
    );
  }
  return resolveModule(resolvedModule, context);
}

/**
 * @param {string} moduleName
 * @param {{ candidateSet: Set<string>, moduleIndex: Map<string, string> }} context
 * @returns {string | null}
 */
function resolveModule(moduleName, context) {
  const candidates = context.moduleIndex.get(moduleName) ?? [];
  const target = candidates.find(({ file, root }) =>
    context.candidateSet.has(file) && isWithinRoot(context.sourceFile, root)
  )?.file;
  return target ?? null;
}

/**
 * @param {string} baseModule
 * @param {string[]} names
 * @param {{ candidateSet: Set<string>, moduleIndex: Map<string, ModuleCandidate[]>, sourceFile: string }} context
 * @returns {string | null}
 */
function resolveImportedSubmodule(baseModule, names, context) {
  for (const name of names) {
    if (name === '*' || !/^[A-Za-z_]\w*$/u.test(name)) {
      continue;
    }
    const resolved = resolveModule(`${baseModule}.${name}`, context);
    if (resolved) {
      return resolved;
    }
  }
  return null;
}

/**
 * @param {string} sourceFile
 * @param {string} relativeModule
 * @returns {string | null}
 */
function resolveRelativeModule(sourceFile, relativeModule) {
  const level = relativeModule.match(/^\.+/u)?.[0].length ?? 0;
  const suffix = relativeModule.slice(level);
  const packageParts = packageNameForFile(sourceFile);
  const keep = packageParts.length - (level - 1);
  if (keep < 0) {
    return null;
  }
  const parts = packageParts.slice(0, keep);
  if (suffix) {
    parts.push(...suffix.split('.').filter(Boolean));
  }
  return parts.join('.');
}

/**
 * @typedef {{ file: string, root: string }} ModuleCandidate
 *
 * @param {string} repoRoot
 * @param {string[]} candidateFiles
 * @returns {Map<string, ModuleCandidate[]>}
 */
function buildModuleIndex(repoRoot, candidateFiles) {
  const importRoots = discoverImportRoots(repoRoot, candidateFiles);
  const index = new Map();
  for (const file of candidateFiles) {
    for (const root of importRoots) {
      if (!isWithinRoot(file, root)) {
        continue;
      }
      const moduleName = moduleNameForRoot(file, root);
      if (!moduleName) {
        continue;
      }
      const candidates = index.get(moduleName) ?? [];
      candidates.push({ file, root });
      index.set(moduleName, candidates);
    }
  }
  for (const candidates of index.values()) {
    candidates.sort(
      (a, b) =>
        pathDepth(b.root) - pathDepth(a.root) ||
        a.root.localeCompare(b.root) ||
        a.file.localeCompare(b.file)
    );
  }
  return index;
}

/**
 * Plausible import roots come from project markers, conventional `src/`
 * layouts, and the directory immediately above a contiguous `__init__.py`
 * package chain. The repo root remains the lowest-priority fallback.
 *
 * @param {string} repoRoot
 * @param {string[]} candidateFiles
 * @returns {string[]}
 */
function discoverImportRoots(repoRoot, candidateFiles) {
  const roots = new Set(['']);
  const directories = new Set();
  for (const file of candidateFiles) {
    let dir = path.posix.dirname(file);
    while (dir !== '.') {
      directories.add(dir);
      const parent = path.posix.dirname(dir);
      if (parent === dir) {
        break;
      }
      dir = parent;
    }
  }

  for (const dir of [...directories].sort()) {
    if (path.posix.basename(dir) === 'src') {
      roots.add(dir);
    }
    if (
      IMPORT_ROOT_MARKERS.some((marker) =>
        existsSync(path.join(repoRoot, dir, marker))
      )
    ) {
      roots.add(dir);
    }
  }

  const candidateSet = new Set(candidateFiles);
  for (const file of candidateFiles) {
    let packageDir = path.posix.dirname(file);
    while (candidateSet.has(`${packageDir}/__init__.py`)) {
      const parent = path.posix.dirname(packageDir);
      if (parent === '.') {
        roots.add('');
        break;
      }
      if (!candidateSet.has(`${parent}/__init__.py`)) {
        roots.add(parent);
        break;
      }
      packageDir = parent;
    }
  }

  return [...roots].sort(
    (a, b) => pathDepth(b) - pathDepth(a) || a.localeCompare(b)
  );
}

/**
 * @param {string} file
 * @param {string} root
 * @returns {string}
 */
function moduleNameForRoot(file, root) {
  const relative = root === '' ? file : path.posix.relative(root, file);
  return moduleNameFromParts(relative.replace(/\.py$/u, '').split('/').filter(Boolean));
}

/**
 * @param {string} file
 * @returns {string[]}
 */
function packageNameForFile(file) {
  const rawParts = file.replace(/\.py$/u, '').split('/').filter(Boolean);
  const srcIndex = rawParts.lastIndexOf('src');
  const moduleName = moduleNameFromParts(
    srcIndex === -1 ? rawParts : rawParts.slice(srcIndex + 1)
  );
  if (!moduleName) {
    return [];
  }
  if (file.endsWith('/__init__.py')) {
    return moduleName.split('.');
  }
  return moduleName.split('.').slice(0, -1);
}

/**
 * @param {string} file
 * @param {string} root
 * @returns {boolean}
 */
function isWithinRoot(file, root) {
  return root === '' || file === root || file.startsWith(`${root}/`);
}

/**
 * @param {string} value
 * @returns {number}
 */
function pathDepth(value) {
  return value === '' ? 0 : value.split('/').filter(Boolean).length;
}

/**
 * @param {string[]} parts
 * @returns {string}
 */
function moduleNameFromParts(parts) {
  const moduleParts = [...parts];
  if (moduleParts[moduleParts.length - 1] === '__init__') {
    moduleParts.pop();
  }
  return moduleParts.join('.');
}

/**
 * @param {string} list
 * @returns {string[]}
 */
function parseImportedNames(list) {
  return splitImportList(list.replace(/[()]/gu, ''))
    .map((name) => name.replace(/\s+as\s+\w+$/u, '').trim())
    .filter(Boolean);
}

/**
 * @param {string} list
 * @returns {string[]}
 */
function splitImportList(list) {
  return list
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
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

  const binary = resolveAstGrepBinary({
    toolkitDir: CODE_MAP_DIR,
    projectRoot: repoRoot,
  });
  try {

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
    log.warn('symbol extraction failed', { error: errorMessage(error) });
    throw error;
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
