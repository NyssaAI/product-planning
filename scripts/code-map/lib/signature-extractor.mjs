import { resolveSourceLines } from './source-lines.mjs';

const MAX_SIGNATURE_LINES = 8;
const MAX_SIGNATURE_LENGTH = 300;
// Decorators and attributes may stack and span lines (`@app.route(` … `)`);
// bound how far we read forward looking for the declaration they annotate.
const MAX_DECORATOR_LINES = 40;

/**
 * Net bracket depth contributed by one line: `(` and `[` open, `)` and `]`
 * close. Used to find where a multi-line decorator or attribute ends.
 *
 * @param {string} line
 * @returns {number}
 */
function bracketDelta(line) {
  let delta = 0;
  for (const ch of line) {
    if (ch === '(' || ch === '[') {
      delta += 1;
    } else if (ch === ')' || ch === ']') {
      delta -= 1;
    }
  }
  return delta;
}

/**
 * Matches on attributed/decorated declarations start at the attribute or
 * decorator line. Skip forward past every decorator — including ones whose
 * argument list continues on following lines — to the declaration itself
 * (the `def` / `class` / method line).
 *
 * @param {readonly string[]} lines
 * @param {number} start 0-based index of the match line
 * @returns {number} 0-based index of the first non-decorator line
 */
function skipDecorators(lines, start) {
  const limit = Math.min(lines.length - 1, start + MAX_DECORATOR_LINES);
  let idx = start;
  while (idx < limit && /^\s*(@|\[)/.test(lines[idx])) {
    let depth = bracketDelta(lines[idx]);
    idx += 1;
    while (depth > 0 && idx < limit) {
      depth += bracketDelta(lines[idx]);
      idx += 1;
    }
  }
  return idx;
}

/**
 * Extracts the declaration signature starting at the given line.
 *
 * Reads up to 8 source lines from the symbol's declaration site and trims the
 * result at the start of the body (`{`, `=>`, or a Python `:` at the end of
 * the parameter list). Language-agnostic — works on text, not the AST.
 *
 * @param {string | readonly string[]} source absolute path to the source file, or its lines pre-split with `splitSourceLines`
 * @param {number} lineNumber 1-based line of the declaration
 * @returns {string | undefined} the signature, or undefined when extraction fails
 */
export function extractSignature(source, lineNumber) {
  try {
    const lines = resolveSourceLines(source);
    let start = lineNumber - 1;
    if (start < 0 || start >= lines.length) {
      return undefined;
    }

    start = skipDecorators(lines, start);

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
