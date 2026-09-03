/**
 * Shared source-line access for the code-map extractors.
 *
 * The generator reads each indexed file once and hands the same pre-split
 * lines to every extractor; the extractors still accept a path so existing
 * callers (and tests) keep working unchanged.
 *
 * Public Interface:
 * - splitSourceLines(content) -> string[]
 * - resolveSourceLines(source) -> readonly string[]
 * - createSourceFileCache() -> cached source reader
 */

import { readFileSync } from 'node:fs';

/**
 * Split file content the way every extractor expects it: on `\n` only, so
 * line numbers stay 1:1 with ast-grep's and a trailing `\r` is left for the
 * per-line `trim()` calls to drop.
 *
 * @param {string} content
 * @returns {string[]}
 */
export function splitSourceLines(content) {
  return content.split('\n');
}

/**
 * @param {string | readonly string[]} source absolute file path, or lines already split by {@link splitSourceLines}
 * @returns {readonly string[]}
 */
export function resolveSourceLines(source) {
  if (Array.isArray(source)) {
    return source;
  }
  return splitSourceLines(readFileSync(/** @type {string} */ (source), 'utf8'));
}

/**
 * Create a per-build source reader. The first lookup reads and splits the
 * source; subsequent symbol lookups reuse the exact same object.
 *
 * @param {(filePath: string) => string} [readSource]
 * @returns {(filePath: string) => { content: string, lines: readonly string[] }}
 */
export function createSourceFileCache(
  readSource = (filePath) => readFileSync(filePath, 'utf8')
) {
  /** @type {Map<string, { content: string, lines: readonly string[] }>} */
  const cache = new Map();
  return (filePath) => {
    let source = cache.get(filePath);
    if (!source) {
      const content = readSource(filePath);
      source = { content, lines: splitSourceLines(content) };
      cache.set(filePath, source);
    }
    return source;
  };
}
