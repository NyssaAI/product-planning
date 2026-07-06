/**
 * Disjoint module ownership.
 *
 * Each file belongs to exactly one module: the one whose root is the longest
 * (most specific) prefix containing it. The code-map linker and the plan-product
 * model both use this so they agree on which module owns a file — and therefore
 * its symbols and endpoints. A parent module never double-counts a file that a
 * more specific child module owns.
 */

/**
 * @param {string} root
 * @returns {string} forward-slashed, trailing-slash-stripped; '.'/'' -> ''
 */
export function normalizeRoot(root) {
  const normalized = String(root ?? '')
    .replace(/\\/g, '/')
    .replace(/\/$/, '');
  return normalized === '.' ? '' : normalized;
}

/**
 * @param {string} root
 * @param {string} filePath
 * @returns {boolean} whether `root` contains `filePath`
 */
function rootContains(root, filePath) {
  const r = normalizeRoot(root);
  const f = String(filePath ?? '').replace(/\\/g, '/');
  return r === '' || f === r || f.startsWith(`${r}/`);
}

/**
 * The most-specific (longest) root that contains `filePath`, or null.
 *
 * @param {string} filePath
 * @param {Iterable<string>} roots
 * @returns {string | null}
 */
export function ownerRoot(filePath, roots) {
  /** @type {string | null} */
  let best = null;
  let bestLen = -1;
  for (const root of roots) {
    if (!rootContains(root, filePath)) {
      continue;
    }
    const len = normalizeRoot(root).length;
    if (len > bestLen) {
      bestLen = len;
      best = root;
    }
  }
  return best;
}

/**
 * Whether `moduleRoot` is the disjoint owner of `filePath` among `allRoots`.
 *
 * @param {string} moduleRoot
 * @param {string} filePath
 * @param {Iterable<string>} allRoots
 * @returns {boolean}
 */
export function ownsFile(moduleRoot, filePath, allRoots) {
  const owner = ownerRoot(filePath, allRoots);
  return owner !== null && normalizeRoot(owner) === normalizeRoot(moduleRoot);
}
