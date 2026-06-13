/**
 * Python StackGraphAdapter.
 *
 * Produces a FileGraph from candidate Python files by extracting code-map
 * symbols and resolving intra-repo import edges.
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAstGrepBinary } from '../../../lib/resolve-ast-grep.mjs';
import { createLogger } from '../logger.mjs';

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

const SKIP_DIRS = new Set([
  '.git',
  '.mypy_cache',
  '.pytest_cache',
  '.ruff_cache',
  '.tox',
  '.venv',
  '.worktrees',
  '__fixtures__',
  '__pycache__',
  'bin',
  'build',
  'dist',
  'fixtures',
  'node_modules',
  'obj',
  'venv',
]);

const FROM_IMPORT_RE = /^\s*from\s+([.\w][\w.]*|\.+)\s+import\s+(.+)$/gm;
const IMPORT_RE = /^\s*import\s+(.+)$/gm;
const DYNAMIC_IMPORT_RE =
  /\bimportlib\.import_module\(\s*['"]([^'"]+)['"]\s*\)/g;

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
export function matches(repoRoot) {
  try {
    const hasMarker = [...PYTHON_MARKERS].some((marker) =>
      existsSync(path.join(repoRoot, marker))
    );
    return hasMarker && hasPythonFiles(repoRoot);
  } catch (error) {
    log.debug('python matches failed', { error: errorMessage(error) });
    return false;
  }
}

/**
 * @param {string} repoRoot
 * @param {string[]} files repo-relative candidate files
 * @returns {import('../detection/types.mjs').FileGraph}
 */
export function extract(repoRoot, files) {
  try {
    const candidateFiles = normalizeCandidateFiles(files);
    const candidateSet = new Set(candidateFiles);
    const moduleIndex = buildModuleIndex(candidateFiles);
    const symbolsByFile = extractSymbols(repoRoot, candidateFiles);
    const edgeWeights = new Map();

    for (const source of candidateFiles) {
      const absSource = path.join(repoRoot, source);
      if (!existsSync(absSource)) {
        continue;
      }

      const text = readFileSync(absSource, 'utf8');
      for (const specifier of readImportSpecifiers(text)) {
        const target = resolveImportSpecifier(source, specifier, {
          candidateSet,
          moduleIndex,
        });
        if (!target || target === source) {
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
    return { files: graphFiles, edges };
  } catch (error) {
    log.warn('python extract failed; returning empty graph', {
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

/**
 * @param {string} sourceFile
 * @param {PythonSpecifier} specifier
 * @param {{ candidateSet: Set<string>, moduleIndex: Map<string, string> }} context
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
  const target = context.moduleIndex.get(moduleName);
  return target && context.candidateSet.has(target) ? target : null;
}

/**
 * @param {string} baseModule
 * @param {string[]} names
 * @param {{ candidateSet: Set<string>, moduleIndex: Map<string, string> }} context
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
 * @param {string[]} candidateFiles
 * @returns {Map<string, string>}
 */
function buildModuleIndex(candidateFiles) {
  const index = new Map();
  for (const file of candidateFiles) {
    for (const moduleName of moduleNamesForFile(file)) {
      if (!index.has(moduleName)) {
        index.set(moduleName, file);
      }
    }
  }
  return index;
}

/**
 * @param {string} file
 * @returns {string[]}
 */
function moduleNamesForFile(file) {
  const withoutExt = file.replace(/\.py$/u, '');
  const rawParts = withoutExt.split('/').filter(Boolean);
  const names = new Set([moduleNameFromParts(rawParts)]);

  if (rawParts[0] === 'src') {
    names.add(moduleNameFromParts(rawParts.slice(1)));
  }

  return [...names].filter(Boolean);
}

/**
 * @param {string} file
 * @returns {string[]}
 */
function packageNameForFile(file) {
  const names = moduleNamesForFile(file);
  const moduleName = names.find((name) => !name.startsWith('src.')) ?? names[0];
  if (!moduleName) {
    return [];
  }
  if (file.endsWith('/__init__.py')) {
    return moduleName.split('.');
  }
  return moduleName.split('.').slice(0, -1);
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

  try {
    const binary = resolveAstGrepBinary({
      toolkitDir: CODE_MAP_DIR,
      projectRoot: repoRoot,
    });
    if (!existsSync(binary)) {
      log.debug('ast-grep binary not found for Python symbols', { binary });
      return symbols;
    }

    const result = spawnSync(
      binary,
      [
        'scan',
        ...candidateFiles.map((file) => path.join(repoRoot, file)),
        '--config',
        SG_CONFIG_PATH,
        '--json',
        '--include-metadata',
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      }
    );

    if (result.error || (result.status !== 0 && !result.stdout?.trim())) {
      log.debug('ast-grep symbol scan failed', {
        error: errorMessage(result.error) || result.stderr?.trim(),
      });
      return symbols;
    }

    const matches = parseScanJson(result.stdout ?? '');
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
 * @param {string} stdout
 * @returns {Array<Record<string, unknown>>}
 */
function parseScanJson(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return [];
  }
  const data = JSON.parse(trimmed);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {Record<string, unknown>} match
 * @returns {string | null}
 */
function symbolNameFromMatch(match) {
  const meta = /** @type {{ single?: Record<string, { text?: string }> }} */ (
    match.metaVariables
  );
  return meta?.single?.NAME?.text ?? null;
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
