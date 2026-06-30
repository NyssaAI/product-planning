#!/usr/bin/env node
/**
 * Generate docs/code-index/patterns.json and patterns.md from structural
 * ast-grep pattern catalogs.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from '../module-map/lib/project-root.mjs';
import { sourceFilesInRoots } from './lib/source-files.mjs';
import { loadPatternRuntimeConfig } from './lib/patterns/runtime-config.mjs';
import { loadPatternCatalogs } from './lib/patterns/catalog.mjs';
import {
  partitionPatternEligibleFiles,
  runPatternScan,
} from './lib/patterns/scanner.mjs';
import {
  buildPatternReport,
  loadJsonArtifact,
} from './lib/patterns/model.mjs';
import { renderPatternsMarkdown } from './lib/patterns/render.mjs';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const helpMode = args.includes('--help') || args.includes('-h');
const outputDirOverride = flagValue(args, '--output-dir');
const REPO_ROOT = findProjectRoot();

/**
 * @param {string[]} argv
 * @param {string} flag
 * @returns {string | null | undefined}
 */
function flagValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index < 0) {
    return null;
  }
  const next = argv[index + 1];
  return next && !next.startsWith('--') ? next : undefined;
}

function printHelp() {
  process.stdout.write(`Usage: code-indexer patterns [options]
       node scripts/code-map/generate-patterns.mjs [options]

Generate docs/code-index/patterns.json and patterns.md from bundled and
repo-defined structural pattern catalogs.

Options:
  --json                 Emit parseable JSON result
  --output-dir <path>    Write outputs to a custom directory
  -h, --help             Show this help
`);
}

/**
 * @returns {object}
 */
function runPatterns() {
  /** @type {string[]} */
  const wrote = [];
  /** @type {string[]} */
  const warnings = [];
  try {
  const runtime = loadPatternRuntimeConfig(REPO_ROOT);
  warnings.push(...runtime.warnings);
  const outputDir =
    typeof outputDirOverride === 'string'
      ? outputDirOverride.replace(/\\/g, '/').replace(/\/$/, '')
      : runtime.outputDir;
  const codeMap = loadJsonArtifact(REPO_ROOT, runtime.codeMapPath, 'MISSING_CODE_MAP');
  const moduleMap = loadJsonArtifact(
    REPO_ROOT,
    runtime.moduleMapPath,
    'MISSING_MODULE_MAP'
  );
  const catalogResult = loadPatternCatalogs(REPO_ROOT, runtime);
  warnings.push(...catalogResult.warnings);
  const patterns = catalogResult.patterns.filter((pattern) =>
    runtime.languages.includes(pattern.language)
  );
  const sourceFiles = sourceFilesInRoots(REPO_ROOT, runtime.roots);
  if (sourceFiles.length === 0) {
    throw resultError(
      'NO_SOURCE_FILES: configured roots contain no source files',
      'NO_SOURCE_FILES'
    );
  }
  const { eligibleFiles, excludedFiles } = partitionPatternEligibleFiles(
    sourceFiles,
    patterns,
    runtime.languages
  );
  if (eligibleFiles.length === 0) {
    const err = resultError(
      'NO_PATTERN_ELIGIBLE_FILES: no source files match enabled pattern catalogs',
      'NO_PATTERN_ELIGIBLE_FILES'
    );
    err.result = {
      sourceFiles: sourceFiles.length,
      excludedFiles: excludedFiles.reduce((sum, entry) => sum + entry.count, 0),
    };
    throw err;
  }

  const matches = runPatternScan(REPO_ROOT, patterns, eligibleFiles);
  const report = buildPatternReport({
    runtime: {
      ...runtime,
      outputDir,
    },
    codeMap,
    moduleMap,
    patterns,
    matches,
    sourceFiles,
    eligibleFiles,
    excludedFiles,
  });

  const outDir = path.join(REPO_ROOT, outputDir);
  const normalizedRoot = path.resolve(REPO_ROOT);
  const normalizedOut = path.resolve(outDir);
  if (normalizedOut !== normalizedRoot && !normalizedOut.startsWith(normalizedRoot + path.sep)) {
    throw resultError(
      'INVALID_OUTPUT_DIR: --output-dir must be within the project root',
      'INVALID_OUTPUT_DIR'
    );
  }
  mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, 'patterns.json');
  const mdPath = path.join(outDir, 'patterns.md');
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  wrote.push(toRelative(REPO_ROOT, jsonPath));
  writeFileSync(mdPath, renderPatternsMarkdown(report), 'utf8');
  wrote.push(toRelative(REPO_ROOT, mdPath));

  return {
    ok: true,
    wrote,
    patterns: report.summary.patternsEvaluated,
    matches: report.summary.occurrences,
    sourceFiles: report.source.sourceFiles,
    eligibleFiles: report.source.eligibleFiles,
    excludedFiles: report.source.excludedFiles.reduce(
      (sum, entry) => sum + entry.count,
      0
    ),
    coveragePercent: report.summary.coveragePercent,
    warnings,
    errors: [],
    summary: `${report.summary.patternsEvaluated} patterns, ${report.summary.occurrences} matches across ${report.source.eligibleFiles} eligible files -> ${toRelative(REPO_ROOT, mdPath)}`,
  };
  } catch (err) {
    return failureResult(err, warnings);
  }
}

/**
 * @param {unknown} err
 * @param {string[]} [warnings]
 * @returns {object}
 */
function failureResult(err, warnings = []) {
  const message = err instanceof Error ? err.message : String(err);
  const partial =
    err instanceof Error && err.result && typeof err.result === 'object'
      ? err.result
      : {};
  return {
    ok: false,
    wrote: [],
    patterns: 0,
    matches: 0,
    sourceFiles:
      typeof partial.sourceFiles === 'number' ? partial.sourceFiles : 0,
    eligibleFiles: 0,
    excludedFiles:
      typeof partial.excludedFiles === 'number' ? partial.excludedFiles : 0,
    coveragePercent: 0,
    warnings,
    errors: [message],
    summary: `patterns skipped - ${message}`,
  };
}

/**
 * @param {object} result
 */
function report(result) {
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`code-indexer patterns: ${result.summary}\n`);
    for (const warning of result.warnings ?? []) {
      process.stderr.write(`  warning: ${warning}\n`);
    }
    for (const error of result.errors ?? []) {
      process.stderr.write(`  error: ${error}\n`);
    }
  }
  if (!result.ok) {
    process.exit(1);
  }
}

/**
 * @param {string} message
 * @param {string} code
 */
function resultError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * @param {string} repoRoot
 * @param {string} fullPath
 * @returns {string}
 */
function toRelative(repoRoot, fullPath) {
  return path.relative(repoRoot, fullPath).replace(/\\/g, '/');
}

function main() {
  if (helpMode) {
    printHelp();
    return;
  }
  if (outputDirOverride === undefined) {
    report(failureResult(new Error('--output-dir requires a path')));
    return;
  }
  report(runPatterns());
}

main();
