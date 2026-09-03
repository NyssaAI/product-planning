/**
 * write-artifact
 *
 * Responsibility: write a generated artifact only when its content actually
 * changed, ignoring the embedded generation timestamp.
 *
 * Every generator stamps `new Date().toISOString()` into its output. Written
 * unconditionally, that means a run with zero source changes still rewrites
 * every artifact, so any repo tracking `docs/code-map/` has a permanently
 * dirty tree after each regeneration — and the pre-push hook regenerates on
 * every push, so the artifacts sit one timestamp ahead of the commit forever.
 *
 * Skipping the write when only the timestamp differs also gives `generated`
 * the more useful meaning: when the content last *changed*, not when the
 * generator last *ran*.
 *
 * Writes are atomic: content goes to a temp file beside the target and is
 * renamed into place, so a crash or a concurrent reader (the pre-push hook
 * runs while editors and other tools may hold the file open) never sees a
 * truncated artifact.
 *
 * @module scripts/lib/write-artifact
 */

import {
  existsSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

/** ISO-8601 instants, the only form the generators stamp. */
const ISO_TIMESTAMP_SOURCE =
  '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?Z';
const ISO_TIMESTAMP = new RegExp(`^${ISO_TIMESTAMP_SOURCE}$`);
const PROSE_GENERATED = new RegExp(
  `^(Generated:\\s*)${ISO_TIMESTAMP_SOURCE}`,
  'gm'
);
const PLAN_PRODUCT_GENERATED = new RegExp(
  `(<!--\\s*plan-product:[\\w-]+\\s+generated\\s+)${ISO_TIMESTAMP_SOURCE}(\\s*-->)`,
  'g'
);

/**
 * Replace only a top-level JSON object's `generated` string. Scanning the
 * original text preserves formatting and avoids masking nested content.
 *
 * @param {string} text
 * @returns {string}
 */
function withoutTopLevelJsonGenerated(text) {
  try {
    const parsed = JSON.parse(text);
    if (
      !parsed ||
      Array.isArray(parsed) ||
      typeof parsed !== 'object' ||
      !Object.hasOwn(parsed, 'generated') ||
      typeof parsed.generated !== 'string' ||
      !ISO_TIMESTAMP.test(parsed.generated)
    ) {
      return text;
    }

    let depth = 0;
    let index = 0;
    while (index < text.length) {
      const char = text[index];
      if (char === '{' || char === '[') {
        depth += 1;
        index += 1;
        continue;
      }
      if (char === '}' || char === ']') {
        depth -= 1;
        index += 1;
        continue;
      }
      if (char !== '"') {
        index += 1;
        continue;
      }

      const tokenStart = index;
      index = jsonStringEnd(text, index);
      const tokenEnd = index;
      const token = JSON.parse(text.slice(tokenStart, tokenEnd));
      if (depth !== 1 || token !== 'generated') continue;

      while (/\s/.test(text[index] ?? '')) index += 1;
      if (text[index] !== ':') continue;
      index += 1;
      while (/\s/.test(text[index] ?? '')) index += 1;
      if (text[index] !== '"') continue;

      const valueStart = index;
      const valueEnd = jsonStringEnd(text, index);
      if (JSON.parse(text.slice(valueStart, valueEnd)) === parsed.generated) {
        return `${text.slice(0, valueStart)}"<generated>"${text.slice(valueEnd)}`;
      }
      index = valueEnd;
    }
  } catch {
    // Not JSON; markdown metadata normalization below still applies.
  }
  return text;
}

/**
 * @param {string} text
 * @param {number} start index of an opening quote
 * @returns {number} index immediately after the closing quote
 */
function jsonStringEnd(text, start) {
  let escaped = false;
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index];
    if (!escaped && char === '"') return index + 1;
    if (char === '\\') {
      escaped = !escaped;
    } else {
      escaped = false;
    }
  }
  throw new Error('unterminated JSON string');
}

/**
 * @param {string} text
 * @returns {string} text with generator-owned metadata timestamps normalized
 */
function withoutTimestamps(text) {
  return withoutTopLevelJsonGenerated(text)
    .replace(PROSE_GENERATED, '$1<generated>')
    .replace(PLAN_PRODUCT_GENERATED, '$1<generated>$2');
}

/**
 * Write `content` through a temp file in the target's directory and rename it
 * over `filePath`. The temp file lives beside the target so the rename never
 * crosses a filesystem boundary.
 *
 * @param {string} filePath
 * @param {string} content
 */
function writeAtomically(filePath, content) {
  const tempPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`
  );
  try {
    writeFileSync(tempPath, content, 'utf8');
    renameSync(tempPath, filePath);
  } catch (err) {
    try {
      unlinkSync(tempPath);
    } catch {
      // Temp file already gone or never created.
    }
    throw err;
  }
}

/**
 * Write `content` to `filePath` unless the only difference from what is
 * already there is a generation timestamp.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {boolean} true when the file was written, false when skipped
 */
export function writeArtifactIfChanged(filePath, content) {
  if (existsSync(filePath)) {
    try {
      const existing = readFileSync(filePath, 'utf8');
      if (withoutTimestamps(existing) === withoutTimestamps(content)) {
        return false;
      }
    } catch {
      // Unreadable existing file — fall through and write.
    }
  }

  writeAtomically(filePath, content);
  return true;
}
