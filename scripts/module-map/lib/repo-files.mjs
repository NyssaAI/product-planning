import { readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * @type {Set<string>} dirs the repo file walk never descends into. Includes
 * test-fixture trees (`fixtures`, `__fixtures__`) so that sample sub-repos used
 * as test data are not detected as the parent project's own modules.
 */
const WALK_SKIP = new Set([
  'bin',
  'obj',
  'node_modules',
  '.git',
  '.vs',
  '.worktrees',
  'dist',
  'build',
  '.next',
  'fixtures',
  '__fixtures__',
]);

/**
 * Repo-relative file list for adapter walks (build/IDE dirs skipped). Paths use
 * forward slashes and are sorted for deterministic adapter extraction.
 *
 * @param {string} repoRoot
 * @param {number} [limit]
 * @returns {string[]}
 */
export function listRepoFiles(repoRoot, limit = 20000) {
  /** @type {string[]} */
  const out = [];
  const stack = [repoRoot];
  while (stack.length > 0 && out.length < limit) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (WALK_SKIP.has(entry.name)) {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else {
        out.push(path.relative(repoRoot, full).replace(/\\/g, '/'));
      }
    }
  }
  return out.sort();
}
