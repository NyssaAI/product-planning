/**
 * Language-agnostic module detection core. Given a file dependency graph and
 * the directory layout, derives module boundaries: directories chosen per
 * top-level area at the depth that maximizes coupling/cohesion. Pinned roots
 * are authoritative and excluded from derivation. Deterministic; falls back to
 * directory structure when the graph is too sparse to score.
 */

import { createLogger } from '../logger.mjs';
import { modularity } from './metrics.mjs';
import {
  DEFAULT_EXCLUDE,
  topLevelAreas,
  filesInArea,
  maxDepth,
  partitionAtDepth,
  sizeByModule,
} from './partitions.mjs';

const log = createLogger({ module: 'derive-modules' });

/** Below this edge count the graph can't meaningfully score partitions. */
const SPARSE_EDGE_THRESHOLD = 5;

const norm = (p) => p.replace(/\\/g, '/').replace(/\/$/, '');
const underRoot = (file, root) => file === root || file.startsWith(`${root}/`);
const basename = (root) => norm(root).split('/').filter(Boolean).at(-1) ?? root;
const toId = (root) =>
  norm(root)
    .split('/')
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * @param {string} repoRoot
 * @param {import('./types.mjs').FileGraph} fileGraph
 * @param {{ pins?: import('./types.mjs').Pin[], minFiles?: number, maxFiles?: number, exclude?: Set<string> }} [options]
 * @returns {{ ok: true, value: import('./types.mjs').DetectedModule[] } | { ok: false, error: string }}
 */
export function deriveModules(repoRoot, fileGraph, options = {}) {
  const {
    pins = [],
    minFiles = 3,
    maxFiles = 40,
    exclude = DEFAULT_EXCLUDE,
  } = options;

  if (!fileGraph || !Array.isArray(fileGraph.files)) {
    return { ok: false, error: 'invalid_file_graph' };
  }

  const claimedRoots = pins.map((p) => norm(p.root));
  const allFiles = fileGraph.files.map((f) => norm(f.path));
  const candidateFiles = allFiles.filter(
    (f) => !claimedRoots.some((r) => underRoot(f, r))
  );

  const edges = fileGraph.edges ?? [];
  const sparse = edges.length < SPARSE_EDGE_THRESHOLD;
  if (sparse) {
    log.info('deriveModules: sparse graph — directory-structure fallback', {
      edges: edges.length,
    });
  }

  /** @type {Map<string, string>} combined file -> module root */
  const assign = new Map();
  for (const area of topLevelAreas(candidateFiles, exclude)) {
    const areaFiles = filesInArea(candidateFiles, area, exclude);
    const depth = chooseDepth(areaFiles, area, edges, {
      minFiles,
      maxFiles,
      sparse,
    });
    for (const [file, root] of partitionAtDepth(areaFiles, area, depth)) {
      assign.set(file, root);
    }
  }

  /** @type {import('./types.mjs').DetectedModule[]} */
  const derived = [...new Set(assign.values())].sort().map((root) => {
    const size = [...assign.values()].filter((r) => r === root).length;
    /** @type {import('./types.mjs').DetectedModule} */
    const mod = {
      id: toId(root),
      name: basename(root),
      root,
      description: `Auto-detected module under \`${root}/\`.`,
      source: 'derived',
    };
    if (size > maxFiles) {
      mod.flags = [`large module (${size} files) — consider splitting deeper`];
    }
    return mod;
  });

  /** @type {import('./types.mjs').DetectedModule[]} */
  const pinned = pins
    .filter((p) => !p.exclude)
    .map((p) => ({
      id: p.id ?? toId(p.root),
      name: p.name ?? basename(p.root),
      root: norm(p.root),
      description: p.description ?? `Pinned module under \`${norm(p.root)}/\`.`,
      source: 'pinned',
      ...(p.capabilities ? { capabilities: p.capabilities } : {}),
      ...(p.doesNotOwn ? { doesNotOwn: p.doesNotOwn } : {}),
    }));

  const modules = [...pinned, ...derived].sort((a, b) =>
    a.root.localeCompare(b.root)
  );
  log.debug('deriveModules complete', {
    derived: derived.length,
    pinned: pinned.length,
  });
  return { ok: true, value: modules };
}

/**
 * Pick the area's directory depth. Cohesive (high modularity) wins, penalizing
 * over-granular (tiny) modules; depths whose largest module exceeds maxFiles are
 * skipped while a deeper option exists. Sparse graphs fall back to the shallowest
 * depth that fits the size bounds. Deterministic: ties break to the shallower depth.
 *
 * @param {string[]} areaFiles
 * @param {string} area
 * @param {import('./types.mjs').Edge[]} edges
 * @param {{ minFiles: number, maxFiles: number, sparse: boolean }} cfg
 * @returns {number}
 */
function chooseDepth(areaFiles, area, edges, { minFiles, maxFiles, sparse }) {
  const md = maxDepth(areaFiles);
  let best = { depth: 0, score: -Infinity };
  for (let depth = 0; depth <= md; depth++) {
    const part = partitionAtDepth(areaFiles, area, depth);
    const sizes = sizeByModule(part);
    const maxSize = Math.max(...sizes.values(), 0);
    if (maxSize > maxFiles && depth < md) {
      continue;
    }
    const tiny = [...sizes.values()].filter((s) => s < minFiles).length;
    const score = sparse
      ? -depth - tiny - (maxSize > maxFiles ? 100 : 0)
      : modularity(edges, (f) => part.get(f)) - 0.05 * tiny;
    if (score > best.score) {
      best = { depth, score };
    }
  }
  return best.depth;
}
