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

/**
 * ISO-8601 instants, the only form the generators stamp. Generated artifacts
 * carry these solely as generation metadata, so neutralizing them before the
 * comparison cannot mask a real content change.
 */
const ISO_TIMESTAMP = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g;

/**
 * @param {string} text
 * @returns {string} text with every ISO timestamp replaced by a fixed token
 */
function withoutTimestamps(text) {
  return text.replace(ISO_TIMESTAMP, '<generated>');
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
