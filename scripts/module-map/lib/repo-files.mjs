import { readdirSync } from 'node:fs';
import path from 'node:path';
import { BASE_SKIP_DIRS } from '../../lib/skip-dirs.mjs';

/**
 * @type {Set<string>} dirs the repo file walk never descends into. Includes
 * test-fixture trees (`fixtures`, `__fixtures__`) so that sample sub-repos used
 * as test data are not detected as the parent project's own modules.
 */
const WALK_SKIP = BASE_SKIP_DIRS;

/**
 * Repo-relative file list for adapter walks (build/IDE dirs skipped). Paths use
 * forward slashes and are sorted for deterministic adapter extraction.
 *
 * @param {string} repoRoot
 * @param {number} [limit]
 * @returns {string[]}
 */
export function listRepoFiles(repoRoot, limit = Infinity) {
  /** @type {string[]} */
  const out = [];
  const stack = [repoRoot];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      throw new Error(`Cannot inventory ${path.relative(repoRoot, dir)}: ${error.message}`);
    }
    for (const entry of entries) {
      if (WALK_SKIP.has(entry.name)) {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        if (out.length >= limit) throw new Error(`Repository inventory exceeded limit ${limit}`);
        out.push(path.relative(repoRoot, full).replace(/\\/g, '/'));
      }
    }
  }
  return out.sort();
}
