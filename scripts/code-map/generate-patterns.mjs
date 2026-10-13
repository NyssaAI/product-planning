#!/usr/bin/env node
/**
 * Generate docs/code-map/patterns.json and patterns.md from structural
 * ast-grep catalogs locating possible uses of known code patterns.
 */

import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from '../module-map/lib/project-root.mjs';
import { sourceInventory } from './lib/source-files.mjs';
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
import { recordUsageEvent } from '../lib/usage.mjs';
import { writeArtifactIfChanged } from '../lib/write-artifact.mjs';
import { checkMapFreshness } from '../lib/map-freshness.mjs';
import { resolveRepoContainedPath } from '../lib/repo-paths.mjs';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const helpMode = args.includes('--help') || args.includes('-h');
const outputDirOverride = flagValue(args, '--output-dir');
const REPO_ROOT = findProjectRoot();
const started = Date.now();

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
  process.stdout.write(`Usage: find-code-patterns [options]
       node scripts/code-map/generate-patterns.mjs [options]

Find source examples of known code patterns using bundled and repo-defined
catalogs. Reports include detector confidence and evidence limits by module.

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
  const freshness = checkMapFreshness(REPO_ROOT);
  if (!freshness.fresh) warnings.push(`MAP_FRESHNESS: ${freshness.reason} Run map-code before relying on module attribution.`);
  const persistedInventory = String(codeMap.schemaVersion).startsWith('2.');
  const languages = persistedInventory ? codeMap.languages : runtime.languages;
  const patterns = catalogResult.patterns.filter((pattern) =>
    languages.includes(pattern.language)
  );
  const sourceRoots = Array.isArray(codeMap.roots) && codeMap.roots.length > 0
    ? codeMap.roots
    : runtime.roots;
  const inventory = persistedInventory
    ? { files: codeMap.files.map((file) => file.path),
        unsupportedFiles: codeMap.coverage?.unsupportedFiles ?? [],
        disabledFiles: codeMap.coverage?.disabledFiles ?? [] }
    : sourceInventory(REPO_ROOT, { roots: sourceRoots, languages });
  const sourceFiles = [...new Set([...inventory.files, ...inventory.unsupportedFiles, ...inventory.disabledFiles])].sort();
  if (sourceFiles.length === 0) {
    throw resultError(
      'NO_SOURCE_FILES: configured roots contain no source files',
      'NO_SOURCE_FILES'
    );
  }
  const { eligibleFiles, excludedFiles } = partitionPatternEligibleFiles(
    sourceFiles,
    patterns,
    languages
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
  const sourceLineCounts = countSourceLines(REPO_ROOT, eligibleFiles);
  const report = buildPatternReport({
    runtime: {
      ...runtime,
      outputDir,
      roots: sourceRoots,
      languages,
      freshness,
    },
    codeMap,
    moduleMap,
    patterns,
    matches,
    sourceFiles,
    eligibleFiles,
    sourceLineCounts,
    excludedFiles,
  });

  const outDir = path.join(REPO_ROOT, outputDir);
  try {
    resolveRepoContainedPath(REPO_ROOT, outputDir, 'pattern output directory');
    for (const name of ['patterns.json', 'patterns.md']) {
      resolveRepoContainedPath(REPO_ROOT, path.join(outDir, name), 'pattern output');
    }
  } catch {
    throw resultError(
      'INVALID_OUTPUT_DIR: --output-dir must be within the project root',
      'INVALID_OUTPUT_DIR'
    );
  }
  mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, 'patterns.json');
  const mdPath = path.join(outDir, 'patterns.md');
  if (writeArtifactIfChanged(jsonPath, `${JSON.stringify(report, null, 2)}\n`)) {
    wrote.push(toRelative(REPO_ROOT, jsonPath));
  }
  if (writeArtifactIfChanged(mdPath, renderPatternsMarkdown(report))) {
    wrote.push(toRelative(REPO_ROOT, mdPath));
  }

  return {
    ok: true,
    wrote,
    patterns: report.summary.patternsEvaluated,
    matches: report.summary.occurrences,
    sourceFiles: report.source.sourceFiles,
    eligibleFiles: report.source.eligibleFiles,
    eligibleLines: report.source.eligibleLines,
    patternLibrary: report.source.patternLibrary,
    patternExpectations: report.source.patternExpectations,
    excludedFiles: report.source.excludedFiles.reduce(
      (sum, entry) => sum + entry.count,
      0
    ),
    coveragePercent: report.summary.coveragePercent,
    patternLines: report.summary.patternLines,
    patternLinePercent: report.summary.patternLinePercent,
    modulesWithPatternEvidence: report.summary.modulesWithPatternEvidence,
    modulesWithoutPatternEvidence: report.summary.modulesWithoutPatternEvidence,
    warnings,
    errors: [],
    summary: `${report.summary.patternsEvaluated} patterns, ${report.summary.occurrences} matches across ${report.source.eligibleFiles} eligible files and ${report.modules.length} modules -> ${toRelative(REPO_ROOT, mdPath)}`,
  };
  } catch (err) {
    return failureResult(err, warnings);
  }
}

/**
 * @param {string} repoRoot
 * @param {string[]} files
 * @returns {Record<string, number>}
 */
function countSourceLines(repoRoot, files) {
  const counts = {};
  for (const file of files) {
    const fullPath = path.join(repoRoot, file);
    try {
      const text = readFileSync(fullPath, 'utf8');
      counts[file] = countPhysicalLines(text);
    } catch {
      counts[file] = 0;
    }
  }
  return counts;
}

/**
 * @param {string} text
 * @returns {number}
 */
function countPhysicalLines(text) {
  const trimmed = text.replace(/\r?\n$/, '');
  return trimmed === '' ? 0 : trimmed.split(/\r?\n/).length;
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
  recordUsageEvent(REPO_ROOT, {
    command: 'find-code-patterns',
    status: result.ok ? 'ok' : 'error',
    durationMs: Date.now() - started,
    summary: result.summary,
    outputs: result.wrote ?? [],
    metrics: {
      patterns: result.patterns,
      matches: result.matches,
      sourceFiles: result.sourceFiles,
      eligibleFiles: result.eligibleFiles,
      coveragePercent: result.coveragePercent,
      patternLinePercent: result.patternLinePercent,
      modulesWithPatternEvidence: result.modulesWithPatternEvidence,
      modulesWithoutPatternEvidence: result.modulesWithoutPatternEvidence,
    },
    warnings: result.warnings ?? [],
    errors: result.errors ?? [],
  });
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`find-code-patterns: ${result.summary}\n`);
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
