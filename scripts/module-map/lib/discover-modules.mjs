import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { MODULE_GLOB_CANDIDATES, detectSrcChildModules } from './auto-detect.mjs';
import { createLogger } from './logger.mjs';
import { detectStackModules } from './stack-profiles/index.mjs';
import { extractStackGraph } from './stack-graph.mjs';
import { deriveModules } from './detection/derive-modules.mjs';

const log = createLogger({ module: 'discover-modules' });

/**
 * @typedef {object} ModuleDef
 * @property {string} id
 * @property {string} name
 * @property {string} root
 * @property {string} description
 * @property {string[]} flows
 * @property {string[]} packageDependencies
 * @property {string[]} exportEntries
 * @property {'workspace' | 'manual' | 'glob' | 'src-child' | 'fallback' | 'derived' | 'pinned'} source
 */

/**
 * @param {string} repoRoot
 * @param {import('./config.mjs').PlanProductConfig} config
 * @param {import('./stack-graph.mjs').StackGraph | null} [stack] pre-extracted
 *   adapter graph reused by cohesion detection; extracted on demand if omitted.
 * @returns {ModuleDef[]}
 */
export function discoverModules(repoRoot, config, stack) {
  const discover = config.modules.discover;

  if (discover === 'manual') {
    return applyPins(
      (config.modules.manual ?? []).map((m) => manualToModule(m, config)),
      config
    );
  }

  if (discover === 'workspaces') {
    return mergeManual(
      discoverFromWorkspaces(repoRoot, config),
      config
    );
  }

  if (discover === 'glob') {
    const pattern = config.modules.globs?.[0] ?? 'packages/*';
    return mergeManual(discoverFromGlob(repoRoot, pattern, config), config);
  }

  return mergeManual(discoverAuto(repoRoot, config, stack), config);
}

/** @param {string} p */
const normRoot = (p) => p.replace(/\\/g, '/').replace(/\/$/, '');

/**
 * @param {string} root forward-slashed, no trailing slash
 * @param {string} claimed forward-slashed, no trailing slash
 */
function rootWithin(root, claimed) {
  if (claimed === '.' || claimed === '') {
    return true;
  }
  return root === claimed || root.startsWith(`${claimed}/`);
}

/** Path-derived kebab id used only to disambiguate id collisions with pins. */
const fullId = (root) =>
  normRoot(root)
    .split('/')
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Apply `modules.pinned[]` to a discovered module list from any discovery
 * path. Pins are authoritative: a pin replaces every discovered module whose
 * root is the pinned root or nested under it, an `exclude` pin drops those
 * modules without adding one, and a discovered module whose id collides with
 * a pinned id is renamed to a path-derived id. Cohesion detection already
 * folds pins in; re-applying here is idempotent, so every path is uniform.
 *
 * @param {ModuleDef[]} discovered
 * @param {import('./config.mjs').PlanProductConfig} config
 * @returns {ModuleDef[]}
 */
export function applyPins(discovered, config) {
  const pins = (config.modules.pinned ?? []).filter(
    (p) => p && typeof p.root === 'string' && p.root.trim() !== ''
  );
  if (pins.length === 0) {
    return discovered;
  }

  const claimedRoots = pins.map((p) => normRoot(p.root));
  const kept = discovered.filter(
    (m) => !claimedRoots.some((r) => rootWithin(normRoot(m.root), r))
  );

  const pinned = pins.filter((p) => !p.exclude).map((p) => pinToModule(p, config));

  const usedIds = new Set(pinned.map((m) => m.id));
  const renamed = kept.map((m) => {
    if (!usedIds.has(m.id)) {
      usedIds.add(m.id);
      return m;
    }
    let candidate = fullId(m.root) || `${m.id}-2`;
    let n = 2;
    while (usedIds.has(candidate)) {
      candidate = `${fullId(m.root) || m.id}-${n}`;
      n += 1;
    }
    usedIds.add(candidate);
    log.info('renamed discovered module to avoid pinned id', {
      from: m.id,
      to: candidate,
      root: m.root,
    });
    return { ...m, id: candidate };
  });

  log.debug('applyPins complete', {
    pinned: pinned.length,
    dropped: discovered.length - kept.length,
  });
  return [...renamed, ...pinned];
}

/**
 * @param {import('./detection/types.mjs').Pin} pin
 * @param {import('./config.mjs').PlanProductConfig} config
 * @returns {ModuleDef}
 */
function pinToModule(pin, config) {
  const root = normRoot(pin.root);
  const id = pin.id ?? (fullId(root) || 'root');
  return {
    id,
    name: pin.name ?? (path.posix.basename(root) || id),
    root,
    description: pin.description ?? `Pinned module under \`${root}/\`.`,
    capabilities: Array.isArray(pin.capabilities) ? pin.capabilities : undefined,
    doesNotOwn: Array.isArray(pin.doesNotOwn) ? pin.doesNotOwn : undefined,
    flows: config.modules.flows[id] ?? [],
    packageDependencies: [],
    exportEntries: [],
    source: 'pinned',
  };
}

/**
 * @param {string} repoRoot
 * @param {import('./config.mjs').PlanProductConfig} config
 * @param {import('./stack-graph.mjs').StackGraph | null} [stack]
 */
function discoverAuto(repoRoot, config, stack) {
  log.debug('discoverAuto start', { repoRoot });
  const fromWs = discoverFromWorkspaces(repoRoot, config);
  if (fromWs.length > 0) {
    log.info('discoverAuto using workspaces', { count: fromWs.length });
    return fromWs;
  }

  const fromCohesion = discoverFromCohesion(repoRoot, config, stack);
  if (fromCohesion.length > 0) {
    log.info('discoverAuto using cohesion detection', {
      count: fromCohesion.length,
    });
    return fromCohesion;
  }

  const fromStack = detectStackModules(repoRoot, config);
  if (fromStack.length > 0) {
    log.info('discoverAuto using stack profile', { count: fromStack.length });
    return fromStack;
  }

  const globs =
    config.modules.globs?.length > 0
      ? config.modules.globs
      : [...MODULE_GLOB_CANDIDATES];

  for (const pattern of globs) {
    const found = discoverFromGlob(repoRoot, pattern, config);
    if (found.length > 0) {
      return found;
    }
  }

  const srcChildren = detectSrcChildModules(repoRoot);
  if (srcChildren.length >= 2) {
    return srcChildren.map((root) => srcChildModule(root, config));
  }

  if (srcChildren.length === 1) {
    return [srcChildModule(srcChildren[0], config)];
  }

  if (existsSync(path.join(repoRoot, 'src'))) {
    return [
      {
        id: 'src',
        name: 'src',
        root: 'src',
        description: 'Primary source tree (auto-detected).',
        flows: config.modules.flows.src ?? [],
        packageDependencies: [],
        exportEntries: [],
        source: 'fallback',
      },
    ];
  }

  return [
    {
      id: 'main',
      name: config.projectName,
      root: detectCodeRoot(repoRoot),
      description: 'Application code (auto-detected single module).',
      flows: config.modules.flows.main ?? [],
      packageDependencies: [],
      exportEntries: [],
      source: 'fallback',
    },
  ];
}

/**
 * Cohesion-based detection: pick a language adapter, extract its file graph,
 * and derive directory-anchored feature modules via the shared core. Returns
 * [] when no adapter matches (leaving existing JS/glob paths intact).
 *
 * @param {string} repoRoot
 * @param {import('./config.mjs').PlanProductConfig} config
 * @param {import('./stack-graph.mjs').StackGraph | null} [stack]
 * @returns {ModuleDef[]}
 */
function discoverFromCohesion(repoRoot, config, stack) {
  const resolved = stack ?? extractStackGraph(repoRoot, config);
  if (!resolved) {
    return [];
  }
  const { adapter, graph } = resolved;
  log.debug('discoverFromCohesion adapter selected', { adapter: adapter.id });

  const result = deriveModules(repoRoot, graph, {
    pins: config.modules.pinned ?? [],
    minFiles: config.modules.minFiles,
    maxFiles: config.modules.maxFiles,
  });
  if (!result.ok) {
    log.warn('discoverFromCohesion failed', { error: result.error });
    return [];
  }
  return result.value.map((d) => detectedToModule(d, config));
}

/**
 * @param {import('./detection/types.mjs').DetectedModule} d
 * @param {import('./config.mjs').PlanProductConfig} config
 * @returns {ModuleDef}
 */
function detectedToModule(d, config) {
  return {
    id: d.id,
    name: d.name,
    root: d.root,
    description: d.description,
    capabilities: d.capabilities,
    doesNotOwn: d.doesNotOwn,
    flows: config.modules.flows[d.id] ?? [],
    packageDependencies: [],
    exportEntries: [],
    source: d.source,
    ...(d.flags ? { flags: d.flags } : {}),
  };
}

/**
 * @param {string} repoRoot
 */
function detectCodeRoot(repoRoot) {
  for (const dir of ['src', 'lib', 'app']) {
    if (existsSync(path.join(repoRoot, dir))) {
      return dir;
    }
  }
  return '.';
}

/**
 * @param {string} root
 * @param {import('./config.mjs').PlanProductConfig} config
 */
function srcChildModule(root, config) {
  const id = path.basename(root);
  return {
    id,
    name: id,
    root,
    description: `Source area under \`${root}/\` (auto-detected).`,
    flows: config.modules.flows[id] ?? [],
    packageDependencies: [],
    exportEntries: [],
    source: 'src-child',
  };
}

/**
 * @param {ModuleDef[]} discovered
 * @param {import('./config.mjs').PlanProductConfig} config
 */
function mergeManual(discovered, config) {
  const ids = new Set(discovered.map((m) => m.id));
  const extra = (config.modules.manual ?? [])
    .filter((m) => !ids.has(m.id))
    .map((m) => manualToModule(m, config));
  return applyPins([...discovered, ...extra], config).sort((a, b) =>
    a.id.localeCompare(b.id)
  );
}

/**
 * Parse a package.json, naming the file in the error so a malformed manifest
 * is diagnosable instead of surfacing as a bare SyntaxError.
 *
 * @param {string} repoRoot
 * @param {string} pkgPath
 * @returns {Record<string, any>}
 */
function readPackageJson(repoRoot, pkgPath) {
  const rel = path.relative(repoRoot, pkgPath).replace(/\\/g, '/') || 'package.json';
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const error = new Error(`INVALID_PACKAGE_JSON: ${rel} is not valid JSON (${message})`);
    error.code = 'INVALID_PACKAGE_JSON';
    throw error;
  }
  return parsed && typeof parsed === 'object' ? parsed : {};
}

/**
 * Workspace globs from a root package.json: npm/pnpm array form or Yarn's
 * object form `{ "workspaces": { "packages": [...] } }`.
 *
 * @param {Record<string, any>} rootPkg
 * @returns {string[]}
 */
function workspacePatterns(rootPkg) {
  const ws = rootPkg.workspaces;
  const list = Array.isArray(ws)
    ? ws
    : ws && typeof ws === 'object' && Array.isArray(ws.packages)
      ? ws.packages
      : [];
  return list.filter((p) => typeof p === 'string');
}

/**
 * @param {string} repoRoot
 * @param {import('./config.mjs').PlanProductConfig} config
 */
function discoverFromWorkspaces(repoRoot, config) {
  const rootPkgPath = path.join(repoRoot, 'package.json');
  if (!existsSync(rootPkgPath)) {
    return [];
  }

  const rootPkg = readPackageJson(repoRoot, rootPkgPath);
  const patterns = workspacePatterns(rootPkg);

  /** @type {PackageEntry[]} */
  const entries = [];
  const seen = new Set();

  for (const pattern of patterns) {
    for (const dir of expandWorkspacePattern(repoRoot, pattern)) {
      const pkgPath = path.join(dir, 'package.json');
      if (!existsSync(pkgPath) || seen.has(dir)) {
        continue;
      }
      seen.add(dir);
      entries.push(readPackageEntry(repoRoot, pkgPath, config));
    }
  }

  return assignUniquePackageIds(entries, config);
}

/**
 * @param {string} repoRoot
 * @param {string} pattern
 * @param {import('./config.mjs').PlanProductConfig} config
 */
function discoverFromGlob(repoRoot, pattern, config) {
  const dirs = expandWorkspacePattern(repoRoot, pattern);
  const entries = dirs
    .filter((dir) => existsSync(path.join(dir, 'package.json')))
    .map((dir) =>
      readPackageEntry(repoRoot, path.join(dir, 'package.json'), config)
    );
  return assignUniquePackageIds(entries, config);
}

/**
 * @param {string} repoRoot
 * @param {string} pattern
 */
function expandWorkspacePattern(repoRoot, pattern) {
  const normalized = pattern.replace(/\\/g, '/');

  if (!normalized.includes('*')) {
    const full = path.join(repoRoot, normalized);
    return existsSync(full) ? [full] : [];
  }

  const idx = normalized.indexOf('*');
  const base = normalized.slice(0, idx).replace(/\/$/, '');
  const baseFull = path.join(repoRoot, base);

  if (!existsSync(baseFull)) {
    return [];
  }

  return readdirSync(baseFull, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(baseFull, e.name));
}

/**
 * @typedef {object} PackageEntry
 * @property {ModuleDef} module
 * @property {string[]} candidates ids to try in order, most preferred first
 */

/**
 * @param {string} repoRoot
 * @param {string} pkgPath
 * @param {import('./config.mjs').PlanProductConfig} config
 * @returns {PackageEntry}
 */
function readPackageEntry(repoRoot, pkgPath, config) {
  const pkg = readPackageJson(repoRoot, pkgPath);
  const relDir = path
    .relative(repoRoot, path.dirname(pkgPath))
    .replace(/\\/g, '/');
  const packageName = typeof pkg.name === 'string' ? pkg.name : undefined;
  const candidates = packageIdCandidates(packageName, relDir);
  const id = candidates[0];

  return {
    candidates,
    module: {
      id,
      name: packageName ?? id,
      root: relDir,
      description: pkg.description ?? '',
      flows: config.modules.flows[id] ?? [],
      packageDependencies: [
        ...Object.keys(pkg.dependencies ?? {}),
        ...Object.keys(pkg.peerDependencies ?? {}),
      ],
      exportEntries: Object.keys(pkg.exports ?? {}),
      source: 'workspace',
    },
  };
}

/**
 * Candidate module ids for one package, most preferred first: the unscoped
 * package name, then `scope-name` for a scoped package, then an id derived
 * from the package directory. Later candidates are used only when an earlier
 * one collides with another package in the same discovery pass.
 *
 * @param {string | undefined} packageName
 * @param {string} relDir forward-slash repo-relative package directory
 * @returns {string[]}
 */
export function packageIdCandidates(packageName, relDir) {
  const rootId =
    relDir.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'root';
  if (!packageName) {
    return unique([path.basename(relDir), rootId]);
  }
  if (packageName.startsWith('@')) {
    const [scope, name] = packageName.slice(1).split('/');
    return name
      ? unique([name, `${scope}-${name}`, rootId])
      : unique([scope, rootId]);
  }
  return unique([packageName, rootId]);
}

/** @param {string[]} values */
function unique(values) {
  return [...new Set(values)];
}

/**
 * Give every package a distinct id. Packages whose preferred id collides all
 * move to their next candidate together, so `@a/core` and `@b/core` become
 * `a-core` and `b-core` while a lone `@acme/core` stays `core`. Exhausted
 * candidates fall back to a numeric suffix. The result is sorted by root so
 * the outcome does not depend on directory read order.
 *
 * @param {PackageEntry[]} entries
 * @param {import('./config.mjs').PlanProductConfig} config
 * @returns {ModuleDef[]}
 */
export function assignUniquePackageIds(entries, config) {
  const sorted = [...entries].sort((a, b) =>
    a.module.root.localeCompare(b.module.root)
  );
  const level = new Map(sorted.map((entry) => [entry, 0]));
  const idAt = (entry) =>
    entry.candidates[Math.min(level.get(entry), entry.candidates.length - 1)];

  for (;;) {
    /** @type {Map<string, PackageEntry[]>} */
    const byId = new Map();
    for (const entry of sorted) {
      const id = idAt(entry);
      byId.set(id, [...(byId.get(id) ?? []), entry]);
    }
    let changed = false;
    for (const group of byId.values()) {
      if (group.length < 2) {
        continue;
      }
      for (const entry of group) {
        if (level.get(entry) < entry.candidates.length - 1) {
          level.set(entry, level.get(entry) + 1);
          changed = true;
        }
      }
    }
    if (!changed) {
      break;
    }
  }

  const used = new Set();
  for (const entry of sorted) {
    const base = idAt(entry);
    let id = base;
    let n = 2;
    while (used.has(id)) {
      id = `${base}-${n}`;
      n += 1;
    }
    used.add(id);
    if (id !== entry.module.id) {
      log.warn('package id collision resolved', {
        package: entry.module.name,
        root: entry.module.root,
        from: entry.module.id,
        to: id,
      });
      entry.module.id = id;
      entry.module.flows = config.modules.flows[id] ?? entry.module.flows;
    }
  }
  return sorted.map((entry) => entry.module);
}

/**
 * @param {import('./config.mjs').ManualModule} manual
 * @param {import('./config.mjs').PlanProductConfig} config
 */
function manualToModule(manual, config) {
  const id = manual.id;
  return {
    id,
    name: manual.name ?? id,
    root: manual.root.replace(/\\/g, '/'),
    description: manual.description ?? '',
    capabilities: Array.isArray(manual.capabilities)
      ? manual.capabilities
      : undefined,
    doesNotOwn: Array.isArray(manual.doesNotOwn)
      ? manual.doesNotOwn
      : undefined,
    flows: manual.flows ?? config.modules.flows[id] ?? [],
    packageDependencies: [],
    exportEntries: [],
    source: 'manual',
    preserveModule:
      manual.preserveModule === true || manual.preserveScope === true,
  };
}

/**
 * @param {string | null} navPath
 */
export function parseNavEntries(navPath) {
  if (!navPath || !existsSync(navPath)) {
    return [];
  }
  const text = readFileSync(navPath, 'utf8');
  const entries = [];
  const re =
    /\{\s*name:\s*['"]([^'"]+)['"]\s*,\s*label:\s*['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(re)) {
    entries.push({ id: match[1], label: match[2] });
  }
  return entries;
}
