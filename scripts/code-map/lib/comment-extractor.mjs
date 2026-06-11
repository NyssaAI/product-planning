import { readFileSync } from 'node:fs';

const MAX_LOOKBACK_LINES = 20;
const MAX_SUMMARY_LENGTH = 120;

/**
 * @param {string} line a trimmed source line
 * @returns {boolean}
 */
function isCommentLine(line) {
  return (
    line.startsWith('//') ||
    line.startsWith('/*') ||
    line.startsWith('*') ||
    line.startsWith('#') ||
    line.startsWith('"""') ||
    line.startsWith("'''")
  );
}

/**
 * @param {string} line a trimmed comment line
 * @returns {string}
 */
function stripCommentMarkers(line) {
  return line
    .replace(/^\/\/+\s?/, '')
    .replace(/^\/\*+\s?/, '')
    .replace(/\*+\/\s*$/, '')
    .replace(/^\*+\s?/, '')
    .replace(/^#+\s?/, '')
    .replace(/^("{3}|'{3})\s?/, '')
    .replace(/("{3}|'{3})\s*$/, '')
    .trim();
}

/**
 * Scans backwards from a symbol's declaration line for a leading comment
 * block (`//`, `/* … *​/`, `#`, `"""`) and extracts the first sentence.
 *
 * Decorator and attribute lines between the comment and the declaration are
 * skipped so doc comments above `@decorator` / `[Attribute]` lines still
 * attach to the symbol.
 *
 * @param {string} filePath absolute path to the source file
 * @param {number} lineNumber 1-based line of the declaration
 * @returns {string | undefined} first sentence (≤120 chars), or undefined
 */
export function extractDocComment(filePath, lineNumber) {
  try {
    const lines = readFileSync(filePath, 'utf8').split('\n');
    const targetIdx = lineNumber - 1;
    if (targetIdx <= 0 || targetIdx >= lines.length) {
      return undefined;
    }

    /** @type {string[]} */
    const commentLines = [];
    let i = targetIdx - 1;
    let inComment = false;

    while (i >= 0 && i >= targetIdx - MAX_LOOKBACK_LINES) {
      const line = lines[i].trim();

      if (isCommentLine(line)) {
        const stripped = stripCommentMarkers(line);
        // JSDoc tag lines (@param, @returns, @type, …) are metadata, not prose.
        if (stripped && !stripped.startsWith('@')) {
          commentLines.unshift(stripped);
        }
        inComment = true;
        i -= 1;
        continue;
      }

      // Skip decorator/attribute lines between comment and declaration —
      // only before we have started collecting comment lines.
      if (!inComment && (line.startsWith('@') || line.startsWith('['))) {
        i -= 1;
        continue;
      }

      break;
    }

    if (commentLines.length === 0) {
      return undefined;
    }

    const text = commentLines.join(' ').replace(/\s+/g, ' ').trim();
    const sentenceEnd = text.search(/[.!?](\s|$)/);
    const sentence =
      sentenceEnd >= 0 ? text.slice(0, sentenceEnd + 1) : text;
    const result = sentence.slice(0, MAX_SUMMARY_LENGTH).trim();
    return result.length > 0 ? result : undefined;
  } catch {
    return undefined;
  }
}
