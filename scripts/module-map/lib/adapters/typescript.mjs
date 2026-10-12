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
import { runBatchedScan } from './sg-scan.mjs';
import { symbolNameFromMatch } from '../../../lib/sg-result.mjs';
import { BASE_SKIP_DIRS } from '../../../lib/skip-dirs.mjs';

const log = createLogger({ module: 'typescript-adapter' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CODE_MAP_DIR = path.resolve(__dirname, '../../../code-map');
const SG_CONFIG_PATH = path.join(CODE_MAP_DIR, 'sgconfig.yml');

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.d.ts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
]);

const RESOLVE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.d.ts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
];

// NodeNext/bundler-style specifiers name the emitted JS file while the source
// on disk is TypeScript: `import './b.js'` must resolve to `b.ts`/`b.tsx`.
// Tried after the literal path so a real `.js` source still wins.
const EMITTED_EXTENSION_SOURCES = new Map([
  ['.js', ['.ts', '.tsx']],
  ['.jsx', ['.tsx']],
  ['.mjs', ['.mts']],
  ['.cjs', ['.cts']],
]);

// Files the adapter matches on and extracts from (TypeScript or JavaScript).
const SOURCE_FILE_RE = /\.(tsx?|mts|cts|jsx?|mjs|cjs)$/i;

// Extensionless entry points tried, in order, when a package's declared entry
// (`exports`/`module`/`main`) points at build output that is never walked.
const PACKAGE_ENTRY_FALLBACKS = ['src/index', 'index'];

// TypeScript adds no language-specific skip dirs beyond the shared base.
const SKIP_DIRS = new Set([...BASE_SKIP_DIRS]);

// ast-grep inline rules matching module specifiers structurally on the
// tree-sitter parse tree: static imports, `export … from` re-exports, dynamic
// `import()`, and `require()`. Matching the actual `source` node (rather than
// regex over text) ignores imports inside comments and strings and captures
// CommonJS requires the previous regex missed. One rule per ast-grep language.
const IMPORT_RULES = ['TypeScript', 'JavaScript']
  .map(
    (language) => `id: plan-product-imports-${language.toLowerCase()}
language: ${language}
metadata: { mapKind: import }
rule:
  any:
    - { kind: import_statement, has: { field: source, pattern: $SRC } }
    - { kind: export_statement, has: { field: source, pattern: $SRC } }
    - { pattern: import($SRC) }
    - { pattern: require($SRC) }`
  )
  .join('\n---\n');

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
function matches(repoRoot) {
  try {
    if (!existsSync(path.join(repoRoot, 'package.json'))) {
      return false;
    }
    if (existsSync(path.join(repoRoot, 'tsconfig.json'))) {
      return true;
    }
    // JS-only repos get import-based discovery too: extract() already handles
    // .js/.jsx/.mjs/.cjs, so any source file outside skipped dirs is enough.
    return hasSourceFiles(repoRoot);
  } catch (error) {
    log.warn('typescript matches failed', { error: errorMessage(error) });
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
    const tsconfig = loadTsConfig(repoRoot);
    const workspacePackages = readWorkspacePackages(repoRoot);
    const symbolsByFile = extractSymbols(repoRoot, candidateFiles);
    const specifiersByFile = extractModuleSpecifiers(repoRoot, candidateFiles);
    const edgeWeights = new Map();
    const diagnostics = [];

    for (const source of candidateFiles) {
      for (const specifier of specifiersByFile.get(source) ?? []) {
        const target = resolveSpecifier(repoRoot, source, specifier, {
          candidateSet,
          tsconfig,
          workspacePackages,
        });
        if (!target) {
          if (!specifier.startsWith('node:')) diagnostics.push({ kind: specifier.startsWith('.') ? 'unresolved-local-import' : 'external-or-unresolved-import', file: source, specifier });
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

    log.debug('typescript extract complete', {
      files: graphFiles.length,
      edges: edges.length,
    });
    return { files: graphFiles, edges, diagnostics };
  } catch (error) {
    log.warn('typescript extract failed; returning empty graph', {
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
    .filter((file) => SOURCE_EXTENSIONS.has(extnameWithDts(file)))
    .sort();
}

/**
 * @param {string} repoRoot
 * @returns {boolean}
 */
function hasSourceFiles(repoRoot) {
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
      if (SOURCE_FILE_RE.test(entry.name)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Extract module specifiers per file via a single ast-grep scan over the
 * tree-sitter parse tree (see IMPORT_RULES). Returns a map of repo-relative
 * file -> specifier strings (quotes stripped), parallel to extractSymbols.
 *
 * @param {string} repoRoot
 * @param {string[]} candidateFiles
 * @returns {Map<string, string[]>}
 */
function extractModuleSpecifiers(repoRoot, candidateFiles) {
  const byFile = new Map(candidateFiles.map((file) => [file, []]));
  if (candidateFiles.length === 0) {
    return byFile;
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
      ['--inline-rules', IMPORT_RULES]
    );
    const candidateSet = new Set(candidateFiles);
    for (const match of matches) {
      const file = normalizePath(
        path.relative(repoRoot, String(match.file ?? ''))
      );
      if (!candidateSet.has(file)) {
        continue;
      }
      const specifier = moduleSpecifierFromMatch(match);
      if (specifier) {
        byFile.get(file).push(specifier);
      }
    }
  } catch (error) {
    log.warn('module specifier extraction failed', {
      error: errorMessage(error),
    });
    throw error;
  }

  return byFile;
}

/**
 * @param {Record<string, unknown>} match
 * @returns {string | null}
 */
function moduleSpecifierFromMatch(match) {
  const meta = /** @type {{ single?: Record<string, { text?: string }> }} */ (
    match.metaVariables
  );
  const raw = meta?.single?.SRC?.text;
  return raw ? stripStringQuotes(raw) : null;
}

/**
 * @param {string} raw a string-literal node's source text, including quotes
 * @returns {string}
 */
function stripStringQuotes(raw) {
  const trimmed = raw.trim();
  const quote = trimmed[0];
  if (
    (quote === "'" || quote === '"' || quote === '`') &&
    trimmed.at(-1) === quote
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
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
    const stem = absBase.slice(0, -ext.length);
    for (const suffix of EMITTED_EXTENSION_SOURCES.get(ext.toLowerCase()) ?? []) {
      paths.push(`${stem}${suffix}`);
    }
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

/** Exact config files consulted by the adapter, including inherited package configs. */
export function tsConfigInputs(repoRoot) {
  const seen = new Set();
  try {
    readTsConfig(path.join(repoRoot, 'tsconfig.json'), seen);
  } catch {
    // The adapter falls back on parse errors; the invalid file still affects its result.
  }
  return [...seen].sort();
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
    // Bare package name: the declared entry first, then the source-layout
    // fallbacks (a `main` under dist/ is build output and never walked).
    // Subpath: the literal path, then the same path under src/.
    const subpath = specifier.slice(pkg.name.length + 1);
    const subpaths =
      specifier === pkg.name ? pkg.entries : [subpath, `src/${subpath}`];
    for (const candidate of subpaths) {
      const resolved = resolveCandidatePath(
        repoRoot,
        path.resolve(pkg.dir, candidate),
        candidateSet
      );
      if (resolved) {
        return resolved;
      }
    }
  }
  return null;
}

/**
 * @typedef {{ name: string, dir: string, entries: string[] }} WorkspacePackage
 */

/**
 * Collect every named package.json in the repo, including the root package so
 * self-references (`import 'my-pkg'` inside my-pkg) resolve to its own source.
 *
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
        if (typeof pkg.name !== 'string') {
          continue;
        }
        packages.push({
          name: pkg.name,
          dir: current,
          entries: packageEntryCandidates(pkg),
        });
      } catch {
        // Best-effort workspace mapping only.
      }
    }
  }

  return packages.sort(
    (a, b) => a.name.localeCompare(b.name) || a.dir.localeCompare(b.dir)
  );
}

/**
 * Ordered package-relative entry points to try for a bare package import:
 * the declared entry (`exports`/`module`/`main`), then `src/index.*`, then
 * `index.*` in the package dir, then `types`/`typings` (which only resolves
 * when it points at walked source rather than emitted declarations).
 *
 * @param {Record<string, unknown>} pkg parsed package.json
 * @returns {string[]}
 */
function packageEntryCandidates(pkg) {
  const declared =
    stringPackageEntry(pkg.exports) ??
    stringPackageEntry(pkg.module) ??
    stringPackageEntry(pkg.main);
  const typed = stringPackageEntry(pkg.types) ?? stringPackageEntry(pkg.typings);
  return [
    ...new Set(
      [declared, ...PACKAGE_ENTRY_FALLBACKS, typed].filter(
        (candidate) => typeof candidate === 'string' && candidate !== ''
      )
    ),
  ];
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
