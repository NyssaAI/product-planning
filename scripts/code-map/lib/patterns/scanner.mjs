import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAstGrepBinary } from '../../../lib/resolve-ast-grep.mjs';
import { parseScanJson } from '../../../lib/sg-result.mjs';
import { languageForFile } from '../source-files.mjs';
import {
  cleanupTempAstGrepConfig,
  writeTempAstGrepConfig,
} from './temp-rules.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOOLKIT_DIR = path.resolve(__dirname, '../..');
const MAX_SCAN_ARG_LENGTH = 24000;

/**
 * @typedef {object} PatternMatch
 * @property {string} patternId
 * @property {string} patternName
 * @property {string | undefined} familyId
 * @property {string | undefined} familyName
 * @property {string | undefined} kind
 * @property {string} confidence
 * @property {boolean} includeInHeadline
 * @property {string} language
 * @property {string} file
 * @property {number} line
 * @property {number} endLine
 * @property {number} lineCount
 */

/**
 * @param {string[]} sourceFiles
 * @param {import('./catalog.mjs').PatternDefinition[]} patterns
 * @param {string[]} languages
 * @returns {{ eligibleFiles: string[], excludedFiles: Array<{ extension: string, language: string | null, count: number, reason: string }> }}
 */
export function partitionPatternEligibleFiles(sourceFiles, patterns, languages) {
  const enabledLanguages = new Set(languages);
  const patternLanguages = new Set(patterns.map((pattern) => pattern.language));
  const eligibleFiles = [];
  /** @type {Map<string, { extension: string, language: string | null, count: number, reason: string }>} */
  const excluded = new Map();

  for (const file of sourceFiles) {
    const language = languageForFile(file);
    const extension = path.extname(file) || '(none)';
    let reason = '';
    if (!language) {
      reason = 'no supported language';
    } else if (!enabledLanguages.has(language)) {
      reason = 'language disabled by config';
    } else if (!patternLanguages.has(language)) {
      reason = 'no enabled pattern catalog';
    }

    if (!reason) {
      eligibleFiles.push(file);
      continue;
    }

    const key = `${extension}:${language ?? ''}:${reason}`;
    const current =
      excluded.get(key) ?? { extension, language, count: 0, reason };
    current.count += 1;
    excluded.set(key, current);
  }

  return {
    eligibleFiles: eligibleFiles.sort(),
    excludedFiles: [...excluded.values()].sort(
      (a, b) =>
        a.reason.localeCompare(b.reason) ||
        String(a.language ?? '').localeCompare(String(b.language ?? '')) ||
        a.extension.localeCompare(b.extension)
    ),
  };
}

/**
 * @param {string} repoRoot
 * @param {import('./catalog.mjs').PatternDefinition[]} patterns
 * @param {string[]} eligibleFiles
 * @returns {PatternMatch[]}
 */
export function runPatternScan(repoRoot, patterns, eligibleFiles) {
  if (patterns.length === 0 || eligibleFiles.length === 0) {
    return [];
  }

  const patternsById = new Map(patterns.map((pattern) => [pattern.id, pattern]));
  const binary = resolveAstGrepBinary({
    toolkitDir: TOOLKIT_DIR,
    projectRoot: repoRoot,
  });
  let temp;
  try {
    temp = writeTempAstGrepConfig(patterns);
    const absPaths = eligibleFiles.map((file) => path.join(repoRoot, file));
    const rawMatches = [];
    for (const batch of batchByArgLength(absPaths)) {
      const result = spawnSync(
        binary,
        [
          'scan',
          ...batch,
          '--config',
          temp.configPath,
          '--json',
          '--include-metadata',
        ],
        {
          cwd: repoRoot,
          encoding: 'utf8',
          maxBuffer: 64 * 1024 * 1024,
          timeout: 120_000,
        }
      );
      if (result.error) {
        throw scanError(`AST_GREP_FAILED: ${result.error.message}`, result.error);
      }
      if (result.status !== 0 && result.status !== 1) {
        throw scanError(
          `AST_GREP_FAILED: ${result.stderr?.trim() || `ast-grep exited ${result.status}`}`
        );
      }
      try {
        rawMatches.push(...parseScanJson(result.stdout ?? ''));
      } catch (cause) {
        throw scanError('AST_GREP_FAILED: ast-grep emitted invalid JSON', cause);
      }
    }
    return rawMatches
      .map((match) => normalizeMatch(repoRoot, match, patternsById))
      .filter((match) => match !== null)
      .sort(
        (a, b) =>
          a.file.localeCompare(b.file) ||
          a.line - b.line ||
          a.patternId.localeCompare(b.patternId)
      );
  } finally {
    if (temp) {
      cleanupTempAstGrepConfig(temp);
    }
  }
}

/**
 * @param {string} repoRoot
 * @param {Record<string, unknown>} match
 * @param {Map<string, import('./catalog.mjs').PatternDefinition>} patternsById
 * @returns {PatternMatch | null}
 */
function normalizeMatch(repoRoot, match, patternsById) {
  const metadata = /** @type {{ patternId?: string, patternName?: string, familyId?: string, familyName?: string, patternKind?: string, confidence?: string, includeInHeadline?: string }} */ (
    match.metadata ?? {}
  );
  const patternId = metadata.patternId;
  if (!patternId) {
    return null;
  }
  const pattern = patternsById.get(patternId);
  if (!pattern) {
    return null;
  }
  const file = normalizeMatchFile(repoRoot, String(match.file ?? ''));
  const range = /** @type {{ start?: { line?: number }, end?: { line?: number } }} */ (match.range);
  const line = (range?.start?.line ?? 0) + 1;
  const endLine = Math.max(line, (range?.end?.line ?? range?.start?.line ?? 0) + 1);
  return {
    patternId,
    patternName: metadata.patternName ?? pattern.name,
    familyId: metadata.familyId || pattern.familyId,
    familyName: metadata.familyName || pattern.familyName,
    kind: metadata.patternKind || pattern.kind,
    confidence: metadata.confidence ?? pattern.confidence,
    includeInHeadline:
      metadata.includeInHeadline === undefined
        ? pattern.includeInHeadline
        : metadata.includeInHeadline !== 'false',
    language: pattern.language,
    file,
    line,
    endLine,
    lineCount: endLine - line + 1,
  };
}

/**
 * @param {string} repoRoot
 * @param {string} filePath
 * @returns {string}
 */
function normalizeMatchFile(repoRoot, filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  if (!path.isAbsolute(filePath)) {
    return normalized;
  }
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

/**
 * @param {string[]} absPaths
 * @returns {string[][]}
 */
function batchByArgLength(absPaths) {
  /** @type {string[][]} */
  const batches = [];
  /** @type {string[]} */
  let current = [];
  let length = 0;
  for (const absPath of absPaths) {
    const added = absPath.length + 1;
    if (current.length > 0 && length + added > MAX_SCAN_ARG_LENGTH) {
      batches.push(current);
      current = [];
      length = 0;
    }
    current.push(absPath);
    length += added;
  }
  if (current.length > 0) {
    batches.push(current);
  }
  return batches;
}

/**
 * @param {string} message
 * @param {unknown} [cause]
 */
function scanError(message, cause) {
  const err = new Error(message);
  err.code = 'AST_GREP_FAILED';
  if (cause) {
    err.cause = cause;
  }
  return err;
}
