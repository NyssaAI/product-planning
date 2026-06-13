/**
 * TypeScript/Node StackGraphAdapter.
 *
 * Public Interface:
 * - default adapter object
 *   - id: 'typescript'
 *   - matches(repoRoot) -> boolean
 *   - extract(repoRoot, files) -> FileGraph
 *
 * Dependencies:
 * - Existing code-map ast-grep rules for symbol extraction
 * - tsconfig.json for baseUrl and paths alias resolution
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAstGrepBinary } from '../../../lib/resolve-ast-grep.mjs';
import { createLogger } from '../logger.mjs';

const log = createLogger({ module: 'typescript-adapter' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CODE_MAP_DIR = path.resolve(__dirname, '../../../code-map');
const SG_CONFIG_PATH = path.join(CODE_MAP_DIR, 'sgconfig.yml');

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.d.ts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
]);

const RESOLVE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.d.ts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
];

const SKIP_DIRS = new Set([
  '.git',
  '.next',
  '.worktrees',
  '__fixtures__',
  'bin',
  'build',
  'coverage',
  'dist',
  'fixtures',
  'logs',
  'node_modules',
  'obj',
]);

const IMPORT_RE =
  /\b(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const adapter = {
  id: 'typescript',
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
    if (!existsSync(path.join(repoRoot, 'package.json'))) {
      return false;
    }
    if (existsSync(path.join(repoRoot, 'tsconfig.json'))) {
      return true;
    }
    return hasTypeScriptFiles(repoRoot);
  } catch (error) {
    log.debug('typescript matches failed', { error: errorMessage(error) });
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
    const tsconfig = loadTsConfig(repoRoot);
    const workspacePackages = readWorkspacePackages(repoRoot);
    const symbolsByFile = extractSymbols(repoRoot, candidateFiles);
    const edgeWeights = new Map();

    for (const source of candidateFiles) {
      const absSource = path.join(repoRoot, source);
      if (!existsSync(absSource)) {
        continue;
      }
      const text = readFileSync(absSource, 'utf8');
      for (const specifier of readModuleSpecifiers(text)) {
        const target = resolveSpecifier(repoRoot, source, specifier, {
          candidateSet,
          tsconfig,
          workspacePackages,
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

    log.debug('typescript extract complete', {
      files: graphFiles.length,
      edges: edges.length,
    });
    return { files: graphFiles, edges };
  } catch (error) {
    log.warn('typescript extract failed; returning empty graph', {
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
    .filter((file) => SOURCE_EXTENSIONS.has(extnameWithDts(file)))
    .sort();
}

/**
 * @param {string} repoRoot
 * @returns {boolean}
 */
function hasTypeScriptFiles(repoRoot) {
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
      if (/\.(tsx?|mts|cts)$/i.test(entry.name)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function readModuleSpecifiers(text) {
  const specifiers = [];
  for (const match of text.matchAll(IMPORT_RE)) {
    const specifier = match[1] ?? match[2];
    if (specifier) {
      specifiers.push(specifier);
    }
  }
  return specifiers;
}

/**
 * @param {string} repoRoot
 * @param {string} sourceFile
 * @param {string} specifier
 * @param {{ candidateSet: Set<string>, tsconfig: TsConfigResolution, workspacePackages: WorkspacePackage[] }} context
 * @returns {string | null}
 */
function resolveSpecifier(repoRoot, sourceFile, specifier, context) {
  if (specifier.startsWith('.')) {
    return resolveCandidatePath(
      repoRoot,
      path.resolve(path.dirname(path.join(repoRoot, sourceFile)), specifier),
      context.candidateSet
    );
  }

  const aliasResolved = resolvePathAlias(
    repoRoot,
    specifier,
    context.tsconfig,
    context.candidateSet
  );
  if (aliasResolved) {
    return aliasResolved;
  }

  return resolveWorkspacePackage(
    repoRoot,
    specifier,
    context.candidateSet,
    context.workspacePackages
  );
}

/**
 * @param {string} repoRoot
 * @param {string} absBase
 * @param {Set<string>} candidateSet
 * @returns {string | null}
 */
function resolveCandidatePath(repoRoot, absBase, candidateSet) {
  for (const absCandidate of candidatePaths(absBase)) {
    if (!existsSync(absCandidate) || !statSync(absCandidate).isFile()) {
      continue;
    }
    const rel = normalizePath(path.relative(repoRoot, absCandidate));
    if (candidateSet.has(rel)) {
      return rel;
    }
  }
  return null;
}

/**
 * @param {string} absBase
 * @returns {string[]}
 */
function candidatePaths(absBase) {
  const paths = [];
  const ext = extnameWithDts(absBase);
  if (ext) {
    paths.push(absBase);
  } else {
    for (const suffix of RESOLVE_EXTENSIONS) {
      paths.push(`${absBase}${suffix}`);
    }
  }
  for (const suffix of RESOLVE_EXTENSIONS) {
    paths.push(path.join(absBase, `index${suffix}`));
  }
  return paths;
}

/**
 * @typedef {{ baseUrl: string | null, pathRules: Array<{ key: string, pattern: string, targets: string[] }> }} TsConfigResolution
 */

/**
 * @param {string} repoRoot
 * @returns {TsConfigResolution}
 */
function loadTsConfig(repoRoot) {
  const configPath = path.join(repoRoot, 'tsconfig.json');
  if (!existsSync(configPath)) {
    return { baseUrl: null, pathRules: [] };
  }
  try {
    return readTsConfig(configPath, new Set());
  } catch (error) {
    log.debug('failed to load tsconfig', { error: errorMessage(error) });
    return { baseUrl: null, pathRules: [] };
  }
}

/**
 * @param {string} configPath
 * @param {Set<string>} seen
 * @returns {TsConfigResolution}
 */
function readTsConfig(configPath, seen) {
  const absConfig = resolveTsConfigPath(configPath);
  if (!absConfig || seen.has(absConfig) || !existsSync(absConfig)) {
    return { baseUrl: null, pathRules: [] };
  }
  seen.add(absConfig);

  const dir = path.dirname(absConfig);
  const raw = JSON.parse(stripJsonComments(readFileSync(absConfig, 'utf8')));
  const parent = resolveExtendsConfig(dir, raw.extends);
  const inherited = parent
    ? readTsConfig(parent, seen)
    : { baseUrl: null, pathRules: [] };
  const compilerOptions = raw.compilerOptions ?? {};
  const baseUrl =
    typeof compilerOptions.baseUrl === 'string'
      ? path.resolve(dir, compilerOptions.baseUrl)
      : inherited.baseUrl;
  const ruleBase = baseUrl ?? dir;
  const pathRules = [...inherited.pathRules];

  if (compilerOptions.paths && typeof compilerOptions.paths === 'object') {
    for (const [pattern, targets] of Object.entries(compilerOptions.paths)) {
      const idx = pathRules.findIndex((rule) => rule.key === pattern);
      if (idx >= 0) {
        pathRules.splice(idx, 1);
      }
      if (Array.isArray(targets)) {
        pathRules.push({
          key: pattern,
          pattern,
          targets: targets
            .filter((target) => typeof target === 'string')
            .map((target) => path.resolve(ruleBase, target)),
        });
      }
    }
  }

  return { baseUrl, pathRules };
}

/**
 * @param {string} configPath
 * @returns {string | null}
 */
function resolveTsConfigPath(configPath) {
  if (existsSync(configPath) && statSync(configPath).isFile()) {
    return path.resolve(configPath);
  }
  if (existsSync(`${configPath}.json`)) {
    return path.resolve(`${configPath}.json`);
  }
  if (existsSync(path.join(configPath, 'tsconfig.json'))) {
    return path.resolve(path.join(configPath, 'tsconfig.json'));
  }
  return null;
}

/**
 * @param {string} configDir
 * @param {unknown} extendValue
 * @returns {string | null}
 */
function resolveExtendsConfig(configDir, extendValue) {
  if (typeof extendValue !== 'string' || !extendValue) {
    return null;
  }
  if (!extendValue.startsWith('.') && !path.isAbsolute(extendValue)) {
    return null;
  }
  return path.resolve(configDir, extendValue);
}

/**
 * @param {string} repoRoot
 * @param {string} specifier
 * @param {TsConfigResolution} tsconfig
 * @param {Set<string>} candidateSet
 * @returns {string | null}
 */
function resolvePathAlias(repoRoot, specifier, tsconfig, candidateSet) {
  for (const rule of tsconfig.pathRules) {
    const starValue = matchPathPattern(rule.pattern, specifier);
    if (starValue === null) {
      continue;
    }
    for (const target of rule.targets) {
      const replaced = target.replace('*', starValue);
      const resolved = resolveCandidatePath(repoRoot, replaced, candidateSet);
      if (resolved) {
        return resolved;
      }
    }
  }

  if (tsconfig.baseUrl) {
    return resolveCandidatePath(
      repoRoot,
      path.resolve(tsconfig.baseUrl, specifier),
      candidateSet
    );
  }

  return null;
}

/**
 * @param {string} pattern
 * @param {string} specifier
 * @returns {string | null}
 */
function matchPathPattern(pattern, specifier) {
  if (!pattern.includes('*')) {
    return pattern === specifier ? '' : null;
  }
  const [prefix, suffix] = pattern.split('*');
  if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) {
    return null;
  }
  return specifier.slice(prefix.length, specifier.length - suffix.length);
}

/**
 * @param {string} repoRoot
 * @param {string} specifier
 * @param {Set<string>} candidateSet
 * @param {WorkspacePackage[]} packages
 * @returns {string | null}
 */
function resolveWorkspacePackage(repoRoot, specifier, candidateSet, packages) {
  for (const pkg of packages) {
    if (specifier !== pkg.name && !specifier.startsWith(`${pkg.name}/`)) {
      continue;
    }
    const subpath =
      specifier === pkg.name
        ? pkg.entry
        : specifier.slice(pkg.name.length + 1);
    const resolved = resolveCandidatePath(
      repoRoot,
      path.resolve(pkg.dir, subpath),
      candidateSet
    );
    if (resolved) {
      return resolved;
    }
  }
  return null;
}

/**
 * @typedef {{ name: string, dir: string, entry: string }} WorkspacePackage
 */

/**
 * @param {string} repoRoot
 * @returns {WorkspacePackage[]}
 */
function readWorkspacePackages(repoRoot) {
  /** @type {WorkspacePackage[]} */
  const packages = [];
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
      if (entry.name !== 'package.json') {
        continue;
      }
      const pkgPath = path.join(current, entry.name);
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        if (typeof pkg.name !== 'string' || current === repoRoot) {
          continue;
        }
        packages.push({
          name: pkg.name,
          dir: current,
          entry:
            stringPackageEntry(pkg.exports) ??
            stringPackageEntry(pkg.module) ??
            stringPackageEntry(pkg.main) ??
            stringPackageEntry(pkg.types) ??
            'src/index',
        });
      } catch {
        // Best-effort workspace mapping only.
      }
    }
  }

  return packages.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function stringPackageEntry(value) {
  if (typeof value === 'string') {
    return value.replace(/^\.\//, '');
  }
  if (value && typeof value === 'object') {
    const record = /** @type {Record<string, unknown>} */ (value);
    return (
      stringPackageEntry(record.import) ??
      stringPackageEntry(record.require) ??
      stringPackageEntry(record.default) ??
      stringPackageEntry(record['.'])
    );
  }
  return null;
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
      log.debug('ast-grep binary not found for TypeScript symbols', { binary });
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
  return meta?.single?.NAME?.text ?? meta?.single?.METHOD?.text ?? null;
}

/**
 * @param {string} text
 * @returns {string}
 */
function stripJsonComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/,\s*([}\]])/g, '$1');
}

/**
 * @param {string} p
 * @returns {string}
 */
function normalizePath(p) {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * @param {string} p
 * @returns {string}
 */
function extnameWithDts(p) {
  return p.endsWith('.d.ts') ? '.d.ts' : path.extname(p);
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error ?? '');
}
