import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { MODULE_GLOB_CANDIDATES, detectSrcChildModules } from './auto-detect.mjs';
import { createLogger } from './logger.mjs';
import { detectStackModules } from './stack-profiles/index.mjs';

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
 * @property {'workspace' | 'manual' | 'glob' | 'src-child' | 'fallback'} source
 */

/**
 * @param {string} repoRoot
 * @param {import('./config.mjs').AiPlanConfig} config
 * @returns {ModuleDef[]}
 */
export function discoverModules(repoRoot, config) {
  const discover = config.modules.discover;

  if (discover === 'manual') {
    return (config.modules.manual ?? []).map((m) =>
      manualToModule(m, config)
    );
  }

  if (discover === 'workspaces') {
    return mergeManual(
      discoverFromWorkspaces(repoRoot, config),
      config
    );
  }

  if (discover === 'glob') {
    const pattern =
      config.modules.globs?.[0] ??
      (typeof config.modules.glob === 'string'
        ? config.modules.glob
        : 'packages/*');
    return mergeManual(discoverFromGlob(repoRoot, pattern, config), config);
  }

  return mergeManual(discoverAuto(repoRoot, config), config);
}

/**
 * @param {string} repoRoot
 * @param {import('./config.mjs').AiPlanConfig} config
 */
function discoverAuto(repoRoot, config) {
  log.debug('discoverAuto start', { repoRoot });
  const fromWs = discoverFromWorkspaces(repoRoot, config);
  if (fromWs.length > 0) {
    log.info('discoverAuto using workspaces', { count: fromWs.length });
    return fromWs;
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
 * @param {import('./config.mjs').AiPlanConfig} config
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
 * @param {import('./config.mjs').AiPlanConfig} config
 */
function mergeManual(discovered, config) {
  const ids = new Set(discovered.map((m) => m.id));
  const extra = (config.modules.manual ?? [])
    .filter((m) => !ids.has(m.id))
    .map((m) => manualToModule(m, config));
  return [...discovered, ...extra].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * @param {string} repoRoot
 * @param {import('./config.mjs').AiPlanConfig} config
 */
function discoverFromWorkspaces(repoRoot, config) {
  const rootPkgPath = path.join(repoRoot, 'package.json');
  if (!existsSync(rootPkgPath)) {
    return [];
  }

  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
  const patterns = Array.isArray(rootPkg.workspaces)
    ? rootPkg.workspaces
    : [];

  /** @type {ModuleDef[]} */
  const modules = [];
  const seen = new Set();

  for (const pattern of patterns) {
    for (const dir of expandWorkspacePattern(repoRoot, pattern)) {
      const pkgPath = path.join(dir, 'package.json');
      if (!existsSync(pkgPath) || seen.has(dir)) {
        continue;
      }
      seen.add(dir);
      modules.push(readPackageAsModule(repoRoot, pkgPath, config));
    }
  }

  return modules;
}

/**
 * @param {string} repoRoot
 * @param {string} pattern
 * @param {import('./config.mjs').AiPlanConfig} config
 */
function discoverFromGlob(repoRoot, pattern, config) {
  const dirs = expandWorkspacePattern(repoRoot, pattern);
  return dirs
    .filter((dir) => existsSync(path.join(dir, 'package.json')))
    .map((dir) =>
      readPackageAsModule(
        repoRoot,
        path.join(dir, 'package.json'),
        config
      )
    );
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
 * @param {string} repoRoot
 * @param {string} pkgPath
 * @param {import('./config.mjs').AiPlanConfig} config
 */
function readPackageAsModule(repoRoot, pkgPath, config) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const relDir = path
    .relative(repoRoot, path.dirname(pkgPath))
    .replace(/\\/g, '/');
  const id = packageNameToId(pkg.name, path.basename(relDir));
  const name = pkg.name ?? id;

  return {
    id,
    name,
    root: relDir,
    description: pkg.description ?? '',
    flows: config.modules.flows[id] ?? [],
    packageDependencies: [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.peerDependencies ?? {}),
    ],
    exportEntries: Object.keys(pkg.exports ?? {}),
    source: 'workspace',
  };
}

/**
 * @param {string | undefined} packageName
 * @param {string} fallbackId
 */
function packageNameToId(packageName, fallbackId) {
  if (!packageName) {
    return fallbackId;
  }
  if (packageName.startsWith('@')) {
    const parts = packageName.split('/');
    return parts.length > 1 ? parts[1] : parts[0].slice(1);
  }
  return packageName;
}

/**
 * @param {import('./config.mjs').ManualModule} manual
 * @param {import('./config.mjs').AiPlanConfig} config
 */
function manualToModule(manual, config) {
  const id = manual.id;
  return {
    id,
    name: manual.name ?? id,
    root: manual.root.replace(/\\/g, '/'),
    description: manual.description ?? '',
    flows: manual.flows ?? config.modules.flows[id] ?? [],
    packageDependencies: [],
    exportEntries: [],
    source: 'manual',
    preserveScope: manual.preserveScope === true,
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
