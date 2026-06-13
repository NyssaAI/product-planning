import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { selectAdapter } from './adapters/index.mjs';

/** @type {Set<string>} dirs the adapter file walk never descends into */
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
]);

/**
 * @param {string} repoRoot
 * @param {import('./discover-modules.mjs').ModuleDef[]} modules
 * @param {import('./config.mjs').AiPlanConfig} [config]
 * @returns {{ from: string, to: string }[]}
 */
export function buildModuleEdges(repoRoot, modules, config) {
  const adapterEdges = buildAdapterModuleEdges(repoRoot, modules, config);
  if (adapterEdges.length > 0) {
    return adapterEdges;
  }

  const byName = new Map();
  const byRoot = new Map();

  for (const mod of modules) {
    byName.set(mod.name, mod.id);
    byRoot.set(mod.root, mod.id);
  }

  /** @type {Map<string, Set<string>>} */
  const edges = new Map();

  for (const mod of modules) {
    /** @type {Set<string>} */
    const targets = new Set();

    for (const dep of mod.packageDependencies) {
      const targetId = byName.get(dep);
      if (targetId && targetId !== mod.id) {
        targets.add(targetId);
      }
    }

    const dir = path.join(repoRoot, mod.root);
    if (existsSync(dir)) {
      for (const t of scanImportsInDir(repoRoot, dir, byName, byRoot, mod.id)) {
        targets.add(t);
      }
    }

    edges.set(mod.id, targets);
  }

  /** @type {{ from: string, to: string }[]} */
  const list = [];
  for (const [from, targets] of edges) {
    for (const to of targets) {
      if (from !== to) {
        list.push({ from, to });
      }
    }
  }

  return list.sort(
    (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)
  );
}

/**
 * @param {string} repoRoot
 * @param {import('./discover-modules.mjs').ModuleDef[]} modules
 * @param {import('./config.mjs').AiPlanConfig | undefined} config
 * @returns {{ from: string, to: string }[]}
 */
function buildAdapterModuleEdges(repoRoot, modules, config) {
  const adapter = config ? selectAdapter(repoRoot, config.modules.adapter) : null;
  if (!adapter) {
    return [];
  }

  const graph = adapter.extract(repoRoot, listRepoFiles(repoRoot));
  const edgeKeys = new Set();
  for (const edge of graph.edges ?? []) {
    const from = moduleIdForFile(edge.from, modules);
    const to = moduleIdForFile(edge.to, modules);
    if (!from || !to || from === to) {
      continue;
    }
    edgeKeys.add(`${from}\0${to}`);
  }

  return [...edgeKeys]
    .map((key) => {
      const [from, to] = key.split('\0');
      return { from, to };
    })
    .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
}

/**
 * @param {string} repoRoot
 * @param {number} [limit]
 * @returns {string[]}
 */
function listRepoFiles(repoRoot, limit = 20000) {
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

/**
 * @param {string} file
 * @param {import('./discover-modules.mjs').ModuleDef[]} modules
 * @returns {string | null}
 */
function moduleIdForFile(file, modules) {
  const normalized = file.replace(/\\/g, '/').replace(/^\.\//, '');
  const sorted = [...modules].sort((a, b) => b.root.length - a.root.length);
  for (const mod of sorted) {
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
