import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createLogger } from './logger.mjs';

const log = createLogger({ module: 'module-enrichment' });

/** @type {readonly string[]} */
const ENTRY_POINT_NAMES = [
  'main.py',
  'main.ts',
  'main.js',
  'index.ts',
  'index.js',
  'Program.cs',
  'app.py',
  'server.js',
  'server.ts',
];

/** @type {readonly string[]} */
const TEST_ROOT_CANDIDATES = [
  'test',
  'tests',
  '__tests__',
  'spec',
];

/** @type {readonly string[]} */
const CONFIG_FILE_CANDIDATES = [
  'pyproject.toml',
  'package.json',
  'go.mod',
  'Cargo.toml',
  'appsettings.json',
  '.env.example',
  'ai-plan.config.json',
  'code-map.config.json',
];

/**
 * @param {string} repoRoot
 * @param {string} moduleRoot
 * @returns {string[]}
 */
export function detectEntryPoints(repoRoot, moduleRoot) {
  const base = path.join(repoRoot, moduleRoot);
  /** @type {string[]} */
  const found = [];

  if (!existsSync(base)) {
    log.debug('detectEntryPoints: module root missing', { moduleRoot });
    return found;
  }

  const stack = [base];
  let scanned = 0;
  while (stack.length > 0 && scanned < 400) {
    const current = stack.pop();
    scanned += 1;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      const full = path.join(current, entry.name);
      if (entry.isFile()) {
        if (ENTRY_POINT_NAMES.includes(entry.name)) {
          found.push(path.relative(repoRoot, full).replace(/\\/g, '/'));
        }
        if (found.length >= 8) {
          log.debug('detectEntryPoints: cap reached', { moduleRoot, count: found.length });
          return found;
        }
      } else if (entry.isDirectory() && scanned < 400) {
        stack.push(full);
      }
    }
  }

  log.debug('detectEntryPoints complete', { moduleRoot, count: found.length });
  return found;
}

/**
 * @param {string} repoRoot
 * @param {string} moduleRoot
 * @returns {string[]}
 */
export function detectTestRoots(repoRoot, moduleRoot) {
  /** @type {string[]} */
  const found = [];

  for (const candidate of TEST_ROOT_CANDIDATES) {
    const full = path.join(repoRoot, candidate);
    if (existsSync(full)) {
      found.push(candidate);
    }
  }

  const moduleName = path.basename(moduleRoot);
  for (const candidate of TEST_ROOT_CANDIDATES) {
    const mirrored = path.join(repoRoot, candidate, moduleName);
    if (existsSync(mirrored)) {
      const rel = path.join(candidate, moduleName).replace(/\\/g, '/');
      if (!found.includes(rel)) {
        found.push(rel);
      }
    }
  }

  const dotnetTests = path.join(repoRoot, `${moduleName}.Tests`);
  if (existsSync(dotnetTests)) {
    found.push(`${moduleName}.Tests`);
  }

  log.debug('detectTestRoots complete', { moduleRoot, roots: found });
  return found;
}

/**
 * @param {string} repoRoot
 * @returns {string[]}
 */
export function detectConfigFiles(repoRoot) {
  /** @type {string[]} */
  const found = [];
  for (const name of CONFIG_FILE_CANDIDATES) {
    const full = path.join(repoRoot, name);
    if (existsSync(full)) {
      found.push(name);
    }
  }
  log.debug('detectConfigFiles complete', { count: found.length });
  return found;
}

/**
 * @param {{ path: string, symbols?: { name: string, kind: string, line: number }[] }[]} codeMapFiles
 * @param {string} moduleRoot
 * @returns {{ file: string, name: string, kind: string }[]}
 */
export function detectPublicSurface(codeMapFiles, moduleRoot) {
  const prefix = `${moduleRoot.replace(/\\/g, '/')}/`;
  /** @type {{ file: string, name: string, kind: string }[]} */
  const out = [];

  for (const file of codeMapFiles) {
    const p = file.path.replace(/\\/g, '/');
    if (!p.startsWith(prefix)) {
      continue;
    }
    for (const sym of file.symbols ?? []) {
      if (sym.kind === 'export' || sym.kind === 'public' || sym.kind === 'function') {
        out.push({ file: p, name: sym.name, kind: sym.kind });
      }
      if (out.length >= 30) {
        return out;
      }
    }
  }

  log.debug('detectPublicSurface complete', { moduleRoot, count: out.length });
  return out;
}

/**
 * @param {string} repoRoot
 * @param {{ id: string, root: string, httpRoutes?: { path: string }[] }[]} allModules
 * @param {{ id: string, root: string, httpRoutes?: { path: string }[] }} mod
 * @returns {string[]}
 */
export function inferFlows(repoRoot, allModules, mod) {
  /** @type {string[]} */
  const flows = [];

  if (mod.httpRoutes?.length) {
    flows.push(`HTTP API handlers under \`${mod.root}/\` (${mod.httpRoutes.length} routes)`);
  }

  const entryPoints = detectEntryPoints(repoRoot, mod.root);
  if (entryPoints.some((e) => e.includes('bin/') || e.includes('cmd/'))) {
    flows.push(`CLI commands discovered under \`${mod.root}/\``);
  }
  if (entryPoints.some((e) => e.endsWith('Program.cs') || e.includes('app/'))) {
    flows.push(`Application bootstrap via entry points in \`${mod.root}/\``);
  }

  if (flows.length === 0) {
    flows.push(`Feature code and services under \`${mod.root}/\``);
  }

  log.debug('inferFlows complete', { moduleId: mod.id, flowCount: flows.length });
  return flows;
}

/**
 * @param {{ id: string, root: string }[]} allModules
 * @param {{ id: string, root: string }} mod
 * @returns {string[]}
 */
export function inferOutOfScope(allModules, mod) {
  /** @type {string[]} */
  const out = [
    'node_modules/',
    '.git/',
    'dist/',
    'build/',
    '.next/',
  ];

  for (const other of allModules) {
    if (other.id !== mod.id) {
      out.push(`${other.root}/`);
    }
  }

  return out;
}

/**
 * @param {string} repoRoot
 * @param {{ id: string, root: string, httpRoutes?: { path: string }[] }[]} allModules
 * @param {{ id: string, root: string, httpRoutes?: { path: string }[] }} mod
 * @param {{ path: string, symbols?: { name: string, kind: string, line: number }[] }[]} codeMapFiles
 */
export function enrichModule(repoRoot, allModules, mod, codeMapFiles) {
  log.debug('enrichModule start', { moduleId: mod.id, root: mod.root });

  const enrichment = {
    entryPoints: detectEntryPoints(repoRoot, mod.root),
    testRoots: detectTestRoots(repoRoot, mod.root),
    configFiles: detectConfigFiles(repoRoot),
    publicSurface: detectPublicSurface(codeMapFiles, mod.root),
    inferredFlows: inferFlows(repoRoot, allModules, mod),
    outOfScope: inferOutOfScope(allModules, mod),
  };

  log.debug('enrichModule complete', {
    moduleId: mod.id,
    entryPoints: enrichment.entryPoints.length,
    testRoots: enrichment.testRoots.length,
    publicSurface: enrichment.publicSurface.length,
  });

  return enrichment;
}
