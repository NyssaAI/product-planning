import { readFileSync } from 'node:fs';

const MAX_SIGNATURE_LINES = 8;
const MAX_SIGNATURE_LENGTH = 300;

/**
 * Extracts the declaration signature starting at the given line.
 *
 * Reads up to 8 source lines from the symbol's declaration site and trims the
 * result at the start of the body (`{`, `=>`, or a Python `:` at the end of
 * the parameter list). Language-agnostic — works on text, not the AST.
 *
 * @param {string} filePath absolute path to the source file
 * @param {number} lineNumber 1-based line of the declaration
 * @returns {string | undefined} the signature, or undefined when extraction fails
 */
export function extractSignature(filePath, lineNumber) {
  try {
    const lines = readFileSync(filePath, 'utf8').split('\n');
    const start = lineNumber - 1;
    if (start < 0 || start >= lines.length) {
      return undefined;
    }

    const chunk = lines.slice(
      start,
      Math.min(start + MAX_SIGNATURE_LINES, lines.length)
    );

    // Accumulate lines until the parameter list closes; track paren depth so
    // multi-line parameter lists are captured in full.
    const collected = [];
    let depth = 0;
    let sawOpenParen = false;
    let done = false;

    for (const rawLine of chunk) {
      const line = rawLine.trim();
      collected.push(line);
      for (const ch of line) {
        if (ch === '(') {
          depth += 1;
          sawOpenParen = true;
        } else if (ch === ')') {
          depth -= 1;
        }
      }
      if (sawOpenParen && depth <= 0) {
        done = true;
        break;
      }
      // Declarations without parameter lists (classes, interfaces) finish on
      // the first line that opens a body.
      if (!sawOpenParen && /[{:]\s*$/.test(line)) {
        done = true;
        break;
      }
    }

    if (!done) {
      return undefined;
    }

    let sig = collected.join(' ').replace(/\s+/g, ' ').trim();

    // Cut at the start of the body. Python's `:` terminator is kept implicit —
    // strip a trailing colon after the closing paren or class name.
    sig = sig.replace(/\s*(\{|=>).*$/, '').trim();
    sig = sig.replace(/:\s*$/, '').trim();
    // Strip trailing decorators-only or attribute-only artifacts.
    if (!sig || sig.startsWith('@') || sig.startsWith('[')) {
      return undefined;
    }

    return sig.length > 0 && sig.length <= MAX_SIGNATURE_LENGTH
      ? sig
      : undefined;
  } catch {
    return undefined;
  }
}
