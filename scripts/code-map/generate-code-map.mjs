#!/usr/bin/env node
/**
 * Generate docs/code-index/code-map.json from ast-grep structural scan rules.
 *
 * Per-repo settings: code-map.config.json at the project root (discovered from cwd).
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAstGrepBinary } from '../lib/resolve-ast-grep.mjs';
import { parseScanJson, symbolNameFromMatch } from '../lib/sg-result.mjs';
import { BASE_SKIP_DIRS } from '../lib/skip-dirs.mjs';
import {
  loadCodeMapConfig,
  SOURCE_EXTENSIONS,
  SUPPORTED_LANGUAGES,
} from './lib/code-map-config.mjs';
import { loadAiPlanConfig } from '../module-map/lib/config.mjs';
import { discoverModules } from '../module-map/lib/discover-modules.mjs';
import { extractFileHeaderComment } from './lib/file-header-comment.mjs';
import { extractSignature } from './lib/signature-extractor.mjs';
import { extractDocComment } from './lib/comment-extractor.mjs';
import { extractEndpoints } from './lib/endpoint-extractor.mjs';
import { annotateCodeMapWithModules } from './lib/module-linker.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOLKIT_DIR = __dirname;
const SG_CONFIG_PATH = path.join(TOOLKIT_DIR, 'sgconfig.yml');

// Shared base infra/test-output dirs (includes fixtures/__fixtures__ so the
// endpoint walker no longer leaks fixture endpoints) plus Python virtualenv dirs.
const ENDPOINT_SCAN_SKIP_DIRS = new Set([
  ...BASE_SKIP_DIRS,
  '.venv',
  'venv',
  '__pycache__',
]);

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
 * Project root: directory with code-map.config.json, else nearest .git, else cwd.
 * @param {string} [startDir]
 * @returns {string}
 */
function findProjectRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  for (;;) {
    if (existsSync(path.join(dir, 'code-map.config.json'))) {
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
      outputPath = path.resolve(REPO_ROOT, args[++i] ?? '');
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
       devjoy code-map [options]
       node src/bin/code-map.js [options]

Generate ${config.output} (JSON) from ast-grep rules.
Uses @ast-grep/cli bundled with the dev-tools plugin (no project-repo install).

Languages: ${SUPPORTED_LANGUAGES.join(', ')}
Project root: ${REPO_ROOT}
Scan roots (code-map.config.json): ${config.roots.join(', ')}

Options:
  --include-comments     Embed file-level header comments (default: off)
  --omit-comments        Same as default (no comments in output)
  -o, --output <path>    Output file (default: ${config.output})

Environment:
  CODE_MAP_INCLUDE_COMMENTS=1   Embed file header comments
`);
}

/**
 * @param {readonly string[]} roots
 * @returns {import('node:child_process').SpawnSyncReturns<string>}
 */
function runAstGrepScan(roots) {
  const binary = resolveAstGrepBinary({
    toolkitDir: TOOLKIT_DIR,
    projectRoot: REPO_ROOT,
  });
  if (!existsSync(binary)) {
    throw new Error(`ast-grep binary not found at ${binary}`);
  }

  const scanPaths = roots.map((root) => path.join(REPO_ROOT, root));

  return spawnSync(
    binary,
    [
      'scan',
      ...scanPaths,
      '--config',
      SG_CONFIG_PATH,
      '--json',
      '--include-metadata',
    ],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }
  );
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

  if (file.endsWith('/route.js') && name && HTTP_METHODS.has(name)) {
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
function collectSymbols(matches) {
  /** @type {Map<string, { file: string, line: number, kind: string, name: string }>} */
  const byKey = new Map();

  for (const match of matches) {
    const name = symbolNameFromMatch(match);
    if (!name) {
      continue;
    }

    const file = normalizeRepoPath(String(match.file ?? ''));
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
 * @param {string} repoRelativePath
 * @returns {string | null}
 */
function readFileHeaderComment(repoRelativePath) {
  const absPath = path.join(REPO_ROOT, repoRelativePath);
  if (!existsSync(absPath)) {
    return null;
  }
  if (!SOURCE_EXTENSIONS.has(path.extname(absPath))) {
    return null;
  }
  const content = readFileSync(absPath, 'utf8');
  return extractFileHeaderComment(content);
}

/**
 * @param {Map<string, { file: string, line: number, kind: string, name: string }>} symbols
 * @param {CodeMapOptions} options
 * @returns {object}
 */
function buildCodeMapDocument(symbols, options) {
  const entries = [...symbols.values()].sort((a, b) => {
    if (a.file !== b.file) {
      return a.file.localeCompare(b.file);
    }
    return a.line - b.line || a.name.localeCompare(b.name);
  });

  /** @type {Map<string, { path: string, symbols: Array<{ name: string, kind: string, line: number }>, comment?: string }>} */
  const byFile = new Map();

  for (const entry of entries) {
    if (!byFile.has(entry.file)) {
      byFile.set(entry.file, {
        path: entry.file,
        symbols: [],
      });
    }
    const absPath = path.join(REPO_ROOT, entry.file);
    const signature = extractSignature(absPath, entry.line);
    const summary = extractDocComment(absPath, entry.line);
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
      const comment = readFileHeaderComment(fileEntry.path);
      if (comment) {
        fileEntry.comment = comment;
      }
    }
  }

  const files = [...byFile.values()].sort((a, b) =>
    a.path.localeCompare(b.path)
  );
  const endpointFiles = [
    ...new Set([
      ...files.map((file) => file.path),
      ...sourceFilesInRoots(options.scanRoots),
    ]),
  ].sort();
  const endpoints = extractEndpoints(REPO_ROOT, endpointFiles);
  const moduleContext = loadModuleContext();

  const document = {
    schemaVersion: '1.0',
    generated: new Date().toISOString(),
    roots: [...options.scanRoots],
    languages: [...options.languages],
    fileCount: files.length,
    symbolCount: entries.length,
    endpointCount: endpoints.length,
    files,
    endpoints,
  };

  return annotateCodeMapWithModules(document, moduleContext.modules, {
    outputDir: moduleContext.outputDir,
  });
}

/**
 * @returns {{ outputDir: string, modules: Array<{ id: string, name?: string, root: string }> }}
 */
function loadModuleContext() {
  try {
    const config = loadAiPlanConfig(REPO_ROOT);
    return {
      outputDir: config.outputDir,
      modules: discoverModules(REPO_ROOT, config),
    };
  } catch {
    return {
      outputDir: 'docs/code-index',
      modules: [],
    };
  }
}

/**
 * @param {readonly string[]} roots
 * @returns {string[]}
 */
function sourceFilesInRoots(roots) {
  const files = [];
  for (const root of roots) {
    walkSourceFiles(path.join(REPO_ROOT, root), files);
  }
  return files.sort();
}

/**
 * @param {string} dir
 * @param {string[]} acc
 */
function walkSourceFiles(dir, acc) {
  if (!existsSync(dir)) {
    return;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ENDPOINT_SCAN_SKIP_DIRS.has(entry.name)) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(full, acc);
      continue;
    }
    if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      acc.push(path.relative(REPO_ROOT, full).replace(/\\/g, '/'));
    }
  }
}

function main() {
  const options = parseOptions();
  const result = runAstGrepScan(options.scanRoots);
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && !result.stdout?.trim()) {
    throw new Error(
      result.stderr?.trim() || `ast-grep scan failed with exit ${result.status}`
    );
  }

  const matches = parseScanJson(result.stdout ?? '');
  const symbols = collectSymbols(matches);
  const document = buildCodeMapDocument(symbols, options);

  mkdirSync(path.dirname(options.outputPath), { recursive: true });
  writeFileSync(
    options.outputPath,
    `${JSON.stringify(document, null, 2)}\n`,
    'utf8'
  );

  const relOut = path.relative(REPO_ROOT, options.outputPath);
  process.stdout.write(
    `Wrote ${relOut} (${document.symbolCount} symbols in ${document.fileCount} files${options.includeComments ? ', with comments' : ''})\n`
  );
}

main();
