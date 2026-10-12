/**
 * Shared ast-grep scan helper for stack-graph adapters.
 *
 * ast-grep parses each file into a tree-sitter syntax tree in its own process
 * and emits structural matches as JSON. This module wraps that invocation so
 * adapters can run a batched scan over an explicit file list without exceeding
 * the OS command-line length limit (ENAMETOOLONG on large repos).
 *
 * Public Interface:
 * - runBatchedScan(binary, repoRoot, absPaths, ruleArgs) -> match[]
 * - batchByArgLength(absPaths, maxLen?) -> string[][]
 *
 * JSON parsing (`parseScanJson`) lives in scripts/lib/sg-result.mjs and is
 * re-exported here for adapters that already import from this module.
 */

import { spawnSync } from 'node:child_process';
import { parseScanJson } from '../../../lib/sg-result.mjs';

// Conservative cap on the total length of file-path arguments per ast-grep
// invocation, well under the Windows ~32 KB command-line limit (the rest of the
// budget covers the binary path, the rules, and flags).
const MAX_SCAN_ARG_LENGTH = 24000;

/**
 * Run `ast-grep scan` over the given absolute file paths, batching the argv so
 * no single invocation exceeds the OS command-line limit. Returns the merged
 * match objects across all batches.
 *
 * @param {string} binary ast-grep executable path
 * @param {string} repoRoot scan cwd
 * @param {string[]} absPaths absolute file paths to scan
 * @param {string[]} ruleArgs ast-grep rule selection (e.g. --config or --inline-rules)
 * @returns {Array<Record<string, unknown>>}
 */
export function runBatchedScan(binary, repoRoot, absPaths, ruleArgs) {
  /** @type {Array<Record<string, unknown>>} */
  const matches = [];
  for (const batch of batchByArgLength(absPaths, MAX_SCAN_ARG_LENGTH)) {
    const result = spawnSync(binary, ['scan', ...batch, ...ruleArgs, '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.error || (result.status !== 0 && result.status !== 1)) {
      throw new Error(`ast-grep scan batch failed: ${errorMessage(result.error) || result.stderr?.trim() || result.status}`);
    }
    matches.push(...parseScanJson(result.stdout ?? ''));
  }
  return matches;
}

/**
 * Split absolute file paths into batches whose joined length stays under
 * maxLen, so no single spawn exceeds the OS command-line limit.
 *
 * @param {string[]} absPaths
 * @param {number} [maxLen]
 * @returns {string[][]}
 */
export function batchByArgLength(absPaths, maxLen = MAX_SCAN_ARG_LENGTH) {
  /** @type {string[][]} */
  const batches = [];
  /** @type {string[]} */
  let current = [];
  let length = 0;
  for (const absPath of absPaths) {
    const added = absPath.length + 1;
    if (current.length > 0 && length + added > maxLen) {
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
 * @param {unknown} error
 * @returns {string}
 */
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error ?? '');
}
