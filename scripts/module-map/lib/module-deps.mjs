import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
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
    if (adapterEdges.length > 0) {
      // Adapter import-resolution supersedes the regex import scan below, but
      // declared package dependencies are orthogonal — fold them in so manual
      // modules don't silently lose their workspace edges.
      return dedupeEdges([...adapterEdges, ...packageDependencyEdges(modules)]);
    }
  }

  return dedupeEdges([
    ...packageDependencyEdges(modules),
    ...importScanEdges(repoRoot, modules),
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
 * Edges discovered by scanning each module's source for relative/named imports.
 *
 * @param {string} repoRoot
 * @param {import('./discover-modules.mjs').ModuleDef[]} modules
 * @returns {{ from: string, to: string }[]}
 */
function importScanEdges(repoRoot, modules) {
  const byName = new Map();
  const byRoot = new Map();
  for (const mod of modules) {
    byName.set(mod.name, mod.id);
    byRoot.set(mod.root, mod.id);
  }

  /** @type {{ from: string, to: string }[]} */
  const edges = [];
  for (const mod of modules) {
    const dir = path.join(repoRoot, mod.root);
    if (!existsSync(dir)) {
      continue;
    }
    for (const to of scanImportsInDir(repoRoot, dir, byName, byRoot, mod.id)) {
      edges.push({ from: mod.id, to });
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

/**
 * @param {string} repoRoot
 * @param {string} dir
 * @param {Map<string, string>} byName
 * @param {Map<string, string>} byRoot
 * @param {string} selfId
 */
function scanImportsInDir(repoRoot, dir, byName, byRoot, selfId) {
  /** @type {Set<string>} */
  const targets = new Set();
  const files = [];
  collectSourceFiles(dir, files);

  const importRe =
    /(?:import|export)\s+[\s\S]*?\sfrom\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(importRe)) {
      const spec = match[1] ?? match[2];
      if (!spec) {
        continue;
      }
      if (byName.has(spec)) {
        targets.add(byName.get(spec));
        continue;
      }
      if (spec.startsWith('.')) {
        const resolved = path.normalize(
          path.join(path.dirname(file), spec)
        );
        for (const [root, id] of byRoot) {
          const rootAbs = path.normalize(path.join(repoRoot, root));
          if (resolved.startsWith(rootAbs) && id !== selfId) {
            targets.add(id);
          }
        }
      }
    }
  }

  return targets;
}

/**
 * @param {string} dir
 * @param {string[]} acc
 */
function collectSourceFiles(dir, acc) {
  if (!existsSync(dir)) {
    return;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') {
        continue;
      }
      collectSourceFiles(full, acc);
    } else if (/\.(m?js|tsx?|mts|cts)$/.test(entry.name)) {
      acc.push(full);
    }
  }
}
