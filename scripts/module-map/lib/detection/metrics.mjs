/**
 * Coupling/cohesion metrics over a file dependency graph, used to score
 * candidate module partitions. Pure and deterministic — no I/O, no Date,
 * no random. Edges are treated as undirected for scoring.
 *
 * An "assign" is a function mapping a file path to its module id (or
 * `undefined` when the file is unassigned, e.g. excluded).
 *
 * @typedef {import('./types.mjs').Edge} Edge
 * @typedef {(file: string) => (string | undefined)} Assign
 */

/**
 * Internal vs. external edge weight for an assignment.
 * @param {Edge[]} edges
 * @param {Assign} assign
 * @returns {{ internal: number, external: number }}
 */
function internalExternalWeights(edges, assign) {
  let internal = 0;
  let external = 0;
  for (const e of edges) {
    const a = assign(e.from);
    const b = assign(e.to);
    if (a === undefined || b === undefined) {
      continue;
    }
    if (a === b) {
      internal += e.weight;
    } else {
      external += e.weight;
    }
  }
  return { internal, external };
}

/**
 * internal / (internal + external). 1 = perfectly cohesive, 0 = all cross-module.
 * @param {Edge[]} edges
 * @param {Assign} assign
 * @returns {number}
 */
export function internalExternalRatio(edges, assign) {
  const { internal, external } = internalExternalWeights(edges, assign);
  const total = internal + external;
  return total === 0 ? 0 : internal / total;
}

/**
 * Newman modularity Q for an assignment (weighted, undirected).
 * Q = Σ_c [ in_c/m − (tot_c/2m)² ]; higher = more modular.
 * @param {Edge[]} edges
 * @param {Assign} assign
 * @returns {number}
 */
export function modularity(edges, assign) {
  let total = 0;
  /** @type {Map<string, number>} */
  const degree = new Map();
  /** @type {Map<string, number>} */
  const internal = new Map();

  for (const e of edges) {
    const a = assign(e.from);
    const b = assign(e.to);
    if (a === undefined || b === undefined) {
      continue;
    }
    total += e.weight;
    degree.set(a, (degree.get(a) ?? 0) + e.weight);
    degree.set(b, (degree.get(b) ?? 0) + e.weight);
    if (a === b) {
      internal.set(a, (internal.get(a) ?? 0) + e.weight);
    }
  }

  if (total === 0) {
    return 0;
  }
  const m2 = 2 * total;
  let q = 0;
  for (const [mod, deg] of degree) {
    const eii = (internal.get(mod) ?? 0) / total;
    const ai = deg / m2;
    q += eii - ai * ai;
  }
  return q;
}

/**
 * Cohesion of one module: internal weight / (internal + boundary).
 * @param {Edge[]} edges
 * @param {Assign} assign
 * @param {string} moduleId
 * @returns {number}
 */
export function cohesion(edges, assign, moduleId) {
  let internal = 0;
  let boundary = 0;
  for (const e of edges) {
    const a = assign(e.from);
    const b = assign(e.to);
    if (a === moduleId && b === moduleId) {
      internal += e.weight;
    } else if (a === moduleId || b === moduleId) {
      boundary += e.weight;
    }
  }
  const denom = internal + boundary;
  return denom === 0 ? 0 : internal / denom;
}

/**
 * Coupling between two modules: total cross-edge weight between them.
 * @param {Edge[]} edges
 * @param {Assign} assign
 * @param {string} modA
 * @param {string} modB
 * @returns {number}
 */
export function coupling(edges, assign, modA, modB) {
  let weight = 0;
  for (const e of edges) {
    const a = assign(e.from);
    const b = assign(e.to);
    if ((a === modA && b === modB) || (a === modB && b === modA)) {
      weight += e.weight;
    }
  }
  return weight;
}
