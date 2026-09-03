/**
 * Shared directory-skip set for source/endpoint walkers.
 *
 * Adapters and the code-map endpoint walker each walk the repo tree looking for
 * source files; they must agree on which infrastructure and test-output dirs to
 * skip. Previously each site kept its own divergent set, which let the code-map
 * endpoint walker leak `fixtures`/`__fixtures__` endpoints that every adapter
 * excluded. This base set is the union the adapters agreed on; each site adds
 * its own language-specific extras via `new Set([...BASE_SKIP_DIRS, ...extras])`.
 *
 * Public Interface:
 * - BASE_SKIP_DIRS: Set<string>
 */

/** @type {ReadonlySet<string>} */
export const BASE_SKIP_DIRS = new Set([
  '.git',
  '.cache',
  '.next',
  '.nx',
  '.turbo',
  '.worktrees',
  '__fixtures__',
  'bin',
  'build',
  'coverage',
  'dist',
  'fixtures',
  'logs',
  'node_modules',
  'obj',
  'target',
  'third_party',
  'vendor',
]);
