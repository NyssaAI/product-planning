import { extractStackGraph } from './stack-graph.mjs';

/**
 * @param {string} repoRoot
 * @param {import('./discover-modules.mjs').ModuleDef[]} modules
 * @param {import('./config.mjs').PlanProductConfig} [config]
 * @param {import('./stack-graph.mjs').StackGraph | null} [stack] pre-extracted
 *   adapter graph; falls back to a fresh extraction when omitted.
 * @returns {{ from: string, to: string }[]}
 */
export function buildModuleEdges(repoRoot, modules, config, stack) {
  const resolved = stack ?? extractStackGraph(repoRoot, config);
  if (resolved) {
    const adapterEdges = buildAdapterModuleEdges(modules, resolved.graph);
    return dedupeEdges([...adapterEdges, ...packageDependencyEdges(modules)]);
  }

  return dedupeEdges([
    ...packageDependencyEdges(modules),
  ]);
}

/**
 * Map an adapter's file-level edges onto module ids.
 *
 * @param {import('./discover-modules.mjs').ModuleDef[]} modules
 * @param {ReturnType<import('./detection/types.mjs').StackGraphAdapter['extract']>} graph
 * @returns {{ from: string, to: string }[]}
 */
function buildAdapterModuleEdges(modules, graph) {
  // Longest root first so the most specific module claims each file. Sorted
  // once here rather than per moduleIdForFile() call.
  const sortedModules = [...modules].sort(
    (a, b) => b.root.length - a.root.length
  );

  /** @type {{ from: string, to: string }[]} */
  const edges = [];
  for (const edge of graph.edges ?? []) {
    const from = moduleIdForFile(edge.from, sortedModules);
    const to = moduleIdForFile(edge.to, sortedModules);
    if (from && to) {
      edges.push({ from, to });
    }
  }
  // A configured module name is a declared import boundary even when no
  // package entry point can resolve it to a file. Keep the unresolved file
  // diagnostic; only the explicitly named module relation can be inferred.
  for (const diagnostic of graph.diagnostics ?? []) {
    if (diagnostic.kind !== 'external-or-unresolved-import') continue;
    const target = modules.find(mod => mod.name === diagnostic.specifier);
    const from = moduleIdForFile(diagnostic.file ?? '', sortedModules);
    if (target && from) edges.push({ from, to: target.id });
  }
  return dedupeEdges(edges);
}

/**
 * Edges declared via module package dependencies (monorepo workspace deps).
 *
 * @param {import('./discover-modules.mjs').ModuleDef[]} modules
 * @returns {{ from: string, to: string }[]}
 */
function packageDependencyEdges(modules) {
  const byName = new Map(modules.map((mod) => [mod.name, mod.id]));
  /** @type {{ from: string, to: string }[]} */
  const edges = [];
  for (const mod of modules) {
    for (const dep of mod.packageDependencies) {
      const targetId = byName.get(dep);
      if (targetId) {
        edges.push({ from: mod.id, to: targetId });
      }
    }
  }
  return edges;
}

/**
 * Dedupe, drop self-edges, and sort module edges for stable output.
 *
 * @param {{ from: string, to: string }[]} edges
 * @returns {{ from: string, to: string }[]}
 */
function dedupeEdges(edges) {
  const keys = new Set();
  for (const edge of edges) {
    if (edge.from !== edge.to) {
      keys.add(`${edge.from}\0${edge.to}`);
    }
  }
  return [...keys]
    .map((key) => {
      const [from, to] = key.split('\0');
      return { from, to };
    })
    .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
}

/**
 * @param {string} file
 * @param {import('./discover-modules.mjs').ModuleDef[]} sortedModules modules
 *   pre-sorted longest-root-first.
 * @returns {string | null}
 */
function moduleIdForFile(file, sortedModules) {
  const normalized = file.replace(/\\/g, '/').replace(/^\.\//, '');
  for (const mod of sortedModules) {
    const root = mod.root.replace(/\\/g, '/').replace(/\/$/, '');
    if (root === '.' || normalized === root || normalized.startsWith(`${root}/`)) {
      return mod.id;
    }
  }
  return null;
}
