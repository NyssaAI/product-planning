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

/** Leading build/layout dirs dropped from module ids. */
const ROOT_PREFIXES = new Set([
  'src', 'test', 'tests', 'app', 'lib', 'internal', 'packages', 'apps',
]);
/** Dotted dir like "NyssaMeshServer.Api" -> "Api"; symbol "A.B.Foo" -> "Foo". */
const lastSegment = (s) => (s.includes('.') ? s.split('.').pop() : s);
const kebab = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Concise id: drop a leading build root, collapse dotted dirs (e.g. `api-actors`). */
function shortId(root) {
  const segs = norm(root).split('/').filter(Boolean);
  if (segs.length > 1 && ROOT_PREFIXES.has(segs[0].toLowerCase())) {
    segs.shift();
  }
  return kebab(segs.map(lastSegment).join('-')) || kebab(norm(root));
}
/** Full path id, used only to disambiguate id collisions. */
const fullId = (root) => kebab(norm(root).split('/').filter(Boolean).join('-'));

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

  /** @type {Map<string, string[]>} file -> short symbol names */
  const fileSymbols = new Map(
    fileGraph.files.map((f) => [
      norm(f.path),
      (f.symbols ?? []).map((s) => lastSegment(s.name)),
    ])
  );

  /** Size + a description and capability bullets sourced from the module's own symbols. */
  const moduleMeta = (root) => {
    let size = 0;
    const syms = new Set();
    for (const [file, modRoot] of assign) {
      if (modRoot !== root) continue;
      size += 1;
      for (const s of fileSymbols.get(file) ?? []) syms.add(s);
    }
    const top = [...syms].sort().slice(0, 3);
    const name = basename(root);
    return {
      size,
      description: `\`${name}\` — ${size} file${size === 1 ? '' : 's'} under \`${root}/\`.`,
      capabilities: top.length > 0 ? top : [`Code under \`${root}/\``],
    };
  };

  /** @type {import('./types.mjs').DetectedModule[]} */
  const derived = [...new Set(assign.values())].sort().map((root) => {
    const meta = moduleMeta(root);
    /** @type {import('./types.mjs').DetectedModule} */
    const mod = {
      id: shortId(root),
      name: basename(root),
      root,
      description: meta.description,
      capabilities: meta.capabilities,
      source: 'derived',
    };
    if (meta.size > maxFiles) {
      mod.flags = [`large module (${meta.size} files) — consider splitting deeper`];
    }
    return mod;
  });

  /** @type {import('./types.mjs').DetectedModule[]} */
  const pinned = pins
    .filter((p) => !p.exclude)
    .map((p) => ({
      id: p.id ?? shortId(p.root),
      name: p.name ?? basename(p.root),
      root: norm(p.root),
      description: p.description ?? `Pinned module under \`${norm(p.root)}/\`.`,
      source: 'pinned',
      ...(p.capabilities ? { capabilities: p.capabilities } : {}),
      ...(p.doesNotOwn ? { doesNotOwn: p.doesNotOwn } : {}),
    }));

  // Pinned ids are authoritative; disambiguate any derived id collision deterministically.
  const usedIds = new Set(pinned.map((m) => m.id));
  for (const mod of derived) {
    if (!usedIds.has(mod.id)) {
      usedIds.add(mod.id);
      continue;
    }
    let candidate = fullId(mod.root);
    let n = 2;
    while (usedIds.has(candidate)) {
      candidate = `${fullId(mod.root)}-${n}`;
      n += 1;
    }
    mod.id = candidate;
    usedIds.add(candidate);
  }

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
