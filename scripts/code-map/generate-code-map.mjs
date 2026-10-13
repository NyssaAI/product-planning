#!/usr/bin/env node
/**
 * Generate docs/code-map/code-map.json from ast-grep structural scan rules.
 *
 * Per-repo settings: .jamaynor/plan-product/config.json at the project root (discovered from cwd).
 */

import { hasGeneratorConfig } from '../lib/generator-config.mjs';
import {
  existsSync,
  mkdirSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAstGrepBinary } from '../lib/resolve-ast-grep.mjs';
import { symbolNameFromMatch } from '../lib/sg-result.mjs';
import { runBatchedScan } from '../module-map/lib/adapters/sg-scan.mjs';
import {
  loadCodeMapConfig,
  resolveRepoContainedPath,
  SOURCE_EXTENSIONS,
  SUPPORTED_LANGUAGES,
} from './lib/code-map-config.mjs';
import { loadPlanProductConfig } from '../module-map/lib/config.mjs';
import { discoverModules } from '../module-map/lib/discover-modules.mjs';
import { extractStackGraph } from '../module-map/lib/stack-graph.mjs';
import { extractFileHeaderComment } from './lib/file-header-comment.mjs';
import { extractSignature } from './lib/signature-extractor.mjs';
import { extractDocComment } from './lib/comment-extractor.mjs';
import { extractEndpoints } from '../lib/endpoint-extractor.mjs';
import { annotateCodeMapWithModules } from './lib/module-linker.mjs';
import {
  isExcludedGoFile,
  isInSkippedDir,
  isLanguageEnabled,
  sourceInventory,
} from './lib/source-files.mjs';
import { createSourceFileCache } from './lib/source-lines.mjs';
import { recordUsageEvent } from '../lib/usage.mjs';
import { writeArtifactIfChanged } from '../lib/write-artifact.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOLKIT_DIR = __dirname;
const SG_CONFIG_PATH = path.join(TOOLKIT_DIR, 'sgconfig.yml');

const HTTP_METHODS = new Set([
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS',
]);

/**
 * @typedef {{ includeComments: boolean, outputPath: string, scanRoots: readonly string[], languages: readonly string[] }} CodeMapOptions
 */

/**
 * Project root: directory with .jamaynor/plan-product/config.json, else nearest .git, else cwd.
 * @param {string} [startDir]
 * @returns {string}
 */
function findProjectRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  for (;;) {
    if (
      hasGeneratorConfig(dir) ||
      existsSync(path.join(dir, '.plan-product', 'config.json'))
    ) {
      return dir;
    }
    if (existsSync(path.join(dir, '.git'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return path.resolve(startDir);
    }
    dir = parent;
  }
}

const REPO_ROOT = findProjectRoot();

/**
 * @returns {CodeMapOptions}
 */
function parseOptions() {
  const config = loadCodeMapConfig(REPO_ROOT);
  const args = process.argv.slice(2);
  let includeComments =
    process.env.CODE_MAP_INCLUDE_COMMENTS === '1' ||
    process.env.CODE_MAP_INCLUDE_COMMENTS === 'true';

  let outputPath = path.join(REPO_ROOT, config.output);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--include-comments') {
      includeComments = true;
    } else if (
      arg === '--omit-comments' ||
      arg === '--no-comments'
    ) {
      includeComments = false;
    } else if (arg === '--help' || arg === '-h') {
      printHelp(config);
      process.exit(0);
    } else if (arg === '--output' || arg === '-o') {
      const value = args[i + 1];
      if (!value || value.startsWith('-')) {
        throw new Error(`${arg} requires a path within the project root`);
      }
      i += 1;
      outputPath = resolveRepoContainedPath(REPO_ROOT, value, arg);
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return {
    includeComments,
    outputPath,
    scanRoots: config.roots,
    languages: config.languages,
  };
}

/**
 * @param {import('./lib/code-map-config.mjs').CodeMapConfig} config
 */
function printHelp(config) {
  process.stdout.write(`Usage: code-map [options]
       node src/bin/code-map.js [options]

Generate ${config.output} (JSON) from ast-grep rules.
Uses @ast-grep/cli bundled with the plan-product plugin (no project-repo install).

Languages: ${SUPPORTED_LANGUAGES.join(', ')}
Project root: ${REPO_ROOT}
Scan roots (.jamaynor/plan-product/config.json): ${config.roots.join(', ')}

Options:
  --include-comments     Embed file-level header comments (default: off)
  --omit-comments        Same as default (no comments in output)
  -o, --output <path>    Output file (default: ${config.output})

Environment:
  CODE_MAP_INCLUDE_COMMENTS=1   Embed file header comments
`);
}

/**
 * @param {readonly string[]} files Explicit shared inventory, independent of ignore files.
 * @returns {Array<Record<string, unknown>>}
 */
function runAstGrepScan(files) {
  const binary = resolveAstGrepBinary({
    toolkitDir: TOOLKIT_DIR,
    projectRoot: REPO_ROOT,
  });
  if (!existsSync(binary)) {
    throw new Error(`ast-grep binary not found at ${binary}`);
  }

  return runBatchedScan(binary, REPO_ROOT, files.map(file => path.join(REPO_ROOT, file)),
    ['--config', SG_CONFIG_PATH, '--include-metadata']);
}

/**
 * @param {string} kind
 * @returns {number}
 */
function kindRank(kind) {
  if (kind === 'route') {
    return 4;
  }
  if (kind === 'async-function') {
    return 3;
  }
  if (
    kind === 'function' ||
    kind === 'default-function' ||
    kind === 'py-function'
  ) {
    return 2;
  }
  return 1;
}

/**
 * @param {string} file
 * @returns {string}
 */
function normalizeRepoPath(file) {
  return path.relative(REPO_ROOT, file).replace(/\\/g, '/');
}

/**
 * @param {Record<string, unknown>} match
 * @param {string | null} name
 * @returns {string}
 */
function mapKindFromMatch(match, name) {
  const metadata = /** @type {{ mapKind?: string }} */ (match.metadata ?? {});
  const file = normalizeRepoPath(String(match.file ?? ''));

  if (
    /(?:^|\/)route\.(?:[cm]?[jt]sx?)$/.test(file) &&
    name &&
    HTTP_METHODS.has(name)
  ) {
    return 'route';
  }
  if (metadata.mapKind === 'route') {
    return 'route';
  }
  return metadata.mapKind ?? 'symbol';
}

/**
 * @param {Array<Record<string, unknown>>} matches
 * @returns {Map<string, { file: string, line: number, kind: string, name: string }>}
 */
function collectSymbols(matches, languages) {
  /** @type {Map<string, { file: string, line: number, kind: string, name: string }>} */
  const byKey = new Map();

  for (const match of matches) {
    const name = symbolNameFromMatch(match);
    if (!name) {
      continue;
    }

    const file = normalizeRepoPath(String(match.file ?? ''));
    // The ast-grep scan walks roots itself and bypasses sourceFilesInRoots,
    // so skipped directories, excluded Go files, and disabled languages must
    // be dropped here or their symbols re-enter the index and endpoint union.
    if (
      isInSkippedDir(file) ||
      isExcludedGoFile(file) ||
      !isLanguageEnabled(file, languages)
    ) {
      continue;
    }
    const range = /** @type {{ start?: { line?: number } }} */ (match.range);
    const line = (range?.start?.line ?? 0) + 1;
    const kind = mapKindFromMatch(match, name);
    const key = `${file}:${line}:${name}`;

    const existing = byKey.get(key);
    if (!existing || kindRank(kind) > kindRank(existing.kind)) {
      byKey.set(key, { file, line, kind, name });
    }
  }

  return byKey;
}

/**
 * @param {Map<string, { file: string, line: number, kind: string, name: string }>} symbols
 * @param {CodeMapOptions} options
 * @returns {object}
 */
function buildCodeMapDocument(symbols, options, inventory) {
  const entries = [...symbols.values()].sort((a, b) => {
    if (a.file !== b.file) {
      return a.file.localeCompare(b.file);
    }
    return a.line - b.line || a.name.localeCompare(b.name);
  });

  /** @type {Map<string, { path: string, symbols: Array<{ name: string, kind: string, line: number }>, comment?: string }>} */
  const byFile = new Map(inventory.files.map(file => [file, { path: file, symbols: [] }]));
  const readCachedSource = createSourceFileCache();
  /** @type {Map<string, { content: string, lines: readonly string[] } | null>} */
  const sources = new Map();

  /** @param {string} repoRelativePath */
  function sourceFor(repoRelativePath) {
    if (sources.has(repoRelativePath)) {
      return sources.get(repoRelativePath);
    }
    const absPath = path.join(REPO_ROOT, repoRelativePath);
    if (!SOURCE_EXTENSIONS.has(path.extname(absPath))) {
      sources.set(repoRelativePath, null);
      return null;
    }
    try {
      const source = readCachedSource(absPath);
      sources.set(repoRelativePath, source);
      return source;
    } catch (error) {
      if (/** @type {{ code?: string }} */ (error)?.code !== 'ENOENT') {
        throw error;
      }
      sources.set(repoRelativePath, null);
      return null;
    }
  }

  for (const entry of entries) {
    if (!byFile.has(entry.file)) {
      byFile.set(entry.file, {
        path: entry.file,
        symbols: [],
      });
    }
    const source = sourceFor(entry.file);
    const signature = source
      ? extractSignature(source.lines, entry.line)
      : undefined;
    const summary = source
      ? extractDocComment(source.lines, entry.line)
      : undefined;
    /** @type {{ name: string, kind: string, line: number, signature?: string, summary?: string }} */
    const symbol = {
      name: entry.name,
      kind: entry.kind,
      line: entry.line,
    };
    if (signature !== undefined) {
      symbol.signature = signature;
    }
    if (summary !== undefined) {
      symbol.summary = summary;
    }
    byFile.get(entry.file).symbols.push(symbol);
  }

  if (options.includeComments) {
    for (const fileEntry of byFile.values()) {
      const source = sourceFor(fileEntry.path);
      const comment = source ? extractFileHeaderComment(source.content) : null;
      if (comment) {
        fileEntry.comment = comment;
      }
    }
  }

  const files = [...byFile.values()].sort((a, b) =>
    a.path.localeCompare(b.path)
  );
  const endpoints = extractEndpoints(REPO_ROOT, inventory.files);
  const stack = extractStackGraph(REPO_ROOT, loadPlanProductConfig(REPO_ROOT), inventory);
  const moduleContext = loadModuleContext(stack);

  const document = {
    schemaVersion: '2.0',
    generated: new Date().toISOString(),
    roots: [...options.scanRoots],
    languages: [...options.languages],
    fileCount: files.length,
    symbolCount: entries.length,
    endpointCount: endpoints.length,
    files,
    endpoints,
    fileDependencies: stack.graph.edges,
    coverage: {
      scannedFileCount: inventory.files.length,
      unsupportedFiles: inventory.unsupportedFiles,
      disabledFiles: inventory.disabledFiles,
      zeroSymbolFiles: files.filter(file => file.symbols.length === 0).map(file => file.path),
      adapters: stack.adapters,
      diagnostics: stack.graph.diagnostics,
      limitations: 'Static source evidence only. Runtime calls, reflection, generated code, and nonliteral imports may be absent. Dependency edges identify files, not symbol callers.',
    },
  };

  return annotateCodeMapWithModules(document, moduleContext.modules, {
    outputDir: moduleContext.outputDir,
  });
}

/**
 * @returns {{ outputDir: string, modules: Array<{ id: string, name?: string, root: string }> }}
 */
function loadModuleContext(stack) {
  try {
    const config = loadPlanProductConfig(REPO_ROOT);
    return {
      outputDir: config.outputDir,
      modules: discoverModules(REPO_ROOT, config, stack),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `code-map: warning: module context unavailable (${message}); generating an unlinked map\n`
    );
    return {
      outputDir: 'docs/code-map',
      modules: [],
    };
  }
}

function runCodeMap() {
  const options = parseOptions();
  const inventory = sourceInventory(REPO_ROOT, { roots: options.scanRoots, languages: options.languages });
  const matches = runAstGrepScan(inventory.files);
  const symbols = collectSymbols(matches, new Set(options.languages));
  const allowed = new Set(inventory.files);
  for (const [key, symbol] of symbols) if (!allowed.has(symbol.file)) symbols.delete(key);
  const document = buildCodeMapDocument(symbols, options, inventory);

  mkdirSync(path.dirname(options.outputPath), { recursive: true });
  const written = writeArtifactIfChanged(
    options.outputPath,
    `${JSON.stringify(document, null, 2)}\n`
  );

  const relOut = path.relative(REPO_ROOT, options.outputPath);
  process.stdout.write(
    written
      ? `Wrote ${relOut} (${document.symbolCount} symbols in ${document.fileCount} files${options.includeComments ? ', with comments' : ''})\n`
      : `Unchanged ${relOut} (${document.symbolCount} symbols in ${document.fileCount} files)\n`
  );
  return {
    output: relOut.replace(/\\/g, '/'),
    document,
    includeComments: options.includeComments,
  };
}

function main() {
  const started = Date.now();
  try {
    const result = runCodeMap();
    recordUsageEvent(REPO_ROOT, {
      command: 'generate-code-map',
      status: 'ok',
      durationMs: Date.now() - started,
      summary: `${result.document.symbolCount} symbols in ${result.document.fileCount} files -> ${result.output}`,
      outputs: [result.output],
      metrics: {
        files: result.document.fileCount,
        symbols: result.document.symbolCount,
        endpoints: result.document.endpointCount,
        includeComments: result.includeComments,
      },
      warnings: [],
      errors: [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    recordUsageEvent(REPO_ROOT, {
      command: 'generate-code-map',
      status: 'error',
      durationMs: Date.now() - started,
      summary: `code-map generation failed - ${message}`,
      outputs: [],
      warnings: [],
      errors: [message],
    });
    throw err;
  }
}

main();
