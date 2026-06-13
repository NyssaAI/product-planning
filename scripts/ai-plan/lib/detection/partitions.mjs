/**
 * Directory-tree partitioning for module detection. Turns a flat file list
 * into candidate module assignments by cutting each top-level area's tree at
 * a chosen depth. Pure and deterministic.
 */

/** @type {Set<string>} build/IDE dirs never treated as modules */
export const DEFAULT_EXCLUDE = new Set([
  'bin', 'obj', 'node_modules', '.git', 'Properties',
  'dist', 'build', '.next', 'logs', '.vs', '.worktrees',
]);

/** @param {string} p @returns {string[]} forward-slashed path segments */
function segs(p) {
  return p.replace(/\\/g, '/').split('/').filter(Boolean);
}

/**
 * Immediate child directories of the repo root that contain a file (e.g. `src`, `test`).
 * @param {string[]} files repo-relative paths
 * @param {Set<string>} [exclude]
 * @returns {string[]} sorted area names
 */
export function topLevelAreas(files, exclude = DEFAULT_EXCLUDE) {
  const areas = new Set();
  for (const f of files) {
    const s = segs(f);
    if (s.length < 2 || exclude.has(s[0])) {
      continue;
    }
    areas.add(s[0]);
  }
  return [...areas].sort();
}

/**
 * Files under `area`, dropping any whose path crosses an excluded directory.
 * @param {string[]} files
 * @param {string} area
 * @param {Set<string>} [exclude]
 * @returns {string[]}
 */
export function filesInArea(files, area, exclude = DEFAULT_EXCLUDE) {
  return files.filter((f) => {
    const s = segs(f);
    return s[0] === area && !s.slice(0, -1).some((d) => exclude.has(d));
  });
}

/**
 * Deepest directory nesting below the area (excluding the filename).
 * @param {string[]} areaFiles
 * @returns {number}
 */
export function maxDepth(areaFiles) {
  let m = 0;
  for (const f of areaFiles) {
    m = Math.max(m, segs(f).slice(1, -1).length);
  }
  return m;
}

/**
 * Assign each area file to the module rooted `depth` segments below the area.
 * depth 0 → the area itself is one module.
 * @param {string[]} areaFiles
 * @param {string} area
 * @param {number} depth
 * @returns {Map<string, string>} file -> module root (repo-relative dir)
 */
export function partitionAtDepth(areaFiles, area, depth) {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const f of areaFiles) {
    const dirSegs = segs(f).slice(1, -1);
    const take = Math.min(depth, dirSegs.length);
    map.set(f, [area, ...dirSegs.slice(0, take)].join('/'));
  }
  return map;
}

/**
 * File count per module root for an assignment.
 * @param {Map<string, string>} partition
 * @returns {Map<string, number>}
 */
export function sizeByModule(partition) {
  /** @type {Map<string, number>} */
  const sizes = new Map();
  for (const root of partition.values()) {
    sizes.set(root, (sizes.get(root) ?? 0) + 1);
  }
  return sizes;
}
