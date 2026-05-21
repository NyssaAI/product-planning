import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * @param {string} repoRoot
 * @param {import('./discover-modules.mjs').ModuleDef[]} modules
 * @returns {{ from: string, to: string }[]}
 */
export function buildModuleEdges(repoRoot, modules) {
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
