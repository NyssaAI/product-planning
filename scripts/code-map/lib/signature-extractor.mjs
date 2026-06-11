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
    let start = lineNumber - 1;
    if (start < 0 || start >= lines.length) {
      return undefined;
    }

    // Matches on attributed/decorated declarations start at the attribute or
    // decorator line — skip forward to the declaration itself.
    while (
      start < lines.length - 1 &&
      /^\s*(@|\[)/.test(lines[start]) &&
      start < lineNumber - 1 + MAX_SIGNATURE_LINES
    ) {
      start += 1;
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
      // the first line that opens a body — even when the body closes on the
      // same line (`export class Empty {}`).
      if (!sawOpenParen && (/\{/.test(line) || /:\s*$/.test(line))) {
        done = true;
        break;
      }
    }

    if (!done) {
      return undefined;
    }

    let sig = collected.join(' ').replace(/\s+/g, ' ').trim();

    // Cut at the start of the body: the first `{` or `=>` OUTSIDE the
    // parameter list (default params like `options = {}` contain braces
    // at paren depth > 0 and must survive).
    let parenDepth = 0;
    let cutAt = -1;
    for (let idx = 0; idx < sig.length; idx += 1) {
      const ch = sig[idx];
      if (ch === '(') {
        parenDepth += 1;
      } else if (ch === ')') {
        parenDepth -= 1;
      } else if (parenDepth === 0) {
        if (ch === '{' || (ch === '=' && sig[idx + 1] === '>')) {
          cutAt = idx;
          break;
        }
      }
    }
    if (cutAt >= 0) {
      sig = sig.slice(0, cutAt).trim();
    }
    // Python's `:` terminator is kept implicit; const initializers leave a
    // dangling `=` once the body is cut.
    sig = sig.replace(/:\s*$/, '').trim();
    sig = sig.replace(/=\s*$/, '').trim();
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
