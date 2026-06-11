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

/** Kinds ranked for the Public API table — routes and classes first. */
const PUBLIC_SURFACE_KIND_RANK = {
  route: 0,
  class: 1,
  interface: 1,
  function: 2,
  'async-function': 2,
  'py-function': 2,
  'default-function': 2,
};

/**
 * @param {{ path: string, symbols?: { name: string, kind: string, line: number, signature?: string, summary?: string }[] }[]} codeMapFiles
 * @param {string} moduleRoot
 * @returns {{ file: string, name: string, kind: string, signature?: string, summary?: string }[]}
 */
export function detectPublicSurface(codeMapFiles, moduleRoot) {
  const root = moduleRoot.replace(/\\/g, '/');
  // A module rooted at the repo top ('.') owns every file.
  const prefix = root === '.' || root === './' ? '' : `${root}/`;
  /** @type {{ file: string, name: string, kind: string, signature?: string, summary?: string }[]} */
  const out = [];

  for (const file of codeMapFiles) {
    const p = file.path.replace(/\\/g, '/');
    if (!p.startsWith(prefix)) {
      continue;
    }
    for (const sym of file.symbols ?? []) {
      out.push({
        file: p,
        name: sym.name,
        kind: sym.kind,
        signature: sym.signature,
        summary: sym.summary,
      });
    }
  }

  out.sort(
    (a, b) =>
      (PUBLIC_SURFACE_KIND_RANK[a.kind] ?? 3) -
      (PUBLIC_SURFACE_KIND_RANK[b.kind] ?? 3)
  );

  log.debug('detectPublicSurface complete', { moduleRoot, count: out.length });
  return out.slice(0, 30);
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

/** @type {Record<string, string>} */
const DOMAIN_HINTS = {
  auth: 'authentication and session concerns',
  user: 'user accounts and profiles',
  billing: 'billing and payment processing',
  payment: 'payment processing',
  order: 'order management',
  notification: 'notifications and messaging',
  admin: 'administrative operations',
  api: 'HTTP API surface',
  web: 'web UI',
  ui: 'user interface components',
  core: 'core domain logic',
  shared: 'shared utilities and cross-cutting helpers',
  platform: 'shared platform services',
};

/**
 * Infers a prose description, capability bullets, and does-not-own entries
 * from a module's name, routes, entry points, and dependency edges. Manual
 * config values take precedence over these in build.mjs.
 *
 * @param {string} repoRoot
 * @param {{ id: string, root: string, httpRoutes?: { path: string, methods?: string[] }[], dependsOn?: string[] }} mod
 * @param {{ entryPoints: string[] }} enrichment
 * @returns {{ description: string, capabilities: string[], doesNotOwn: string[] }}
 */
export function inferCapabilities(repoRoot, mod, enrichment) {
  /** @type {string[]} */
  const capabilities = [];
  /** @type {string[]} */
  const sentences = [];

  const domainWord = Object.keys(DOMAIN_HINTS).find((word) =>
    mod.id.toLowerCase().includes(word)
  );
  if (domainWord) {
    sentences.push(
      `Owns ${DOMAIN_HINTS[domainWord]} for this application.`
    );
  }

  const routes = mod.httpRoutes ?? [];
  if (routes.length > 0) {
    const methods = [
      ...new Set(routes.flatMap((r) => r.methods ?? [])),
    ].filter(Boolean);
    const methodText = methods.length > 0 ? `${methods.join('/')} ` : '';
    const samplePaths = routes
      .slice(0, 3)
      .map((r) => `\`${r.path}\``)
      .join(', ');
    sentences.push(
      `Serves ${routes.length} HTTP ${methodText}route${routes.length === 1 ? '' : 's'} including ${samplePaths}.`
    );
    capabilities.push(
      `HTTP endpoints under \`${mod.root}/\` (${routes.length} routes)`
    );
  }

  const entryPoints = enrichment.entryPoints ?? [];
  if (entryPoints.some((e) => e.includes('bin/') || e.includes('cmd/'))) {
    capabilities.push(`CLI commands (entry points under \`${mod.root}/\`)`);
  }
  if (
    entryPoints.some((e) => e.endsWith('Program.cs') || e.endsWith('main.py') || e.endsWith('main.ts') || e.endsWith('index.ts'))
  ) {
    capabilities.push('Application bootstrap and startup wiring');
  }

  if (sentences.length === 0) {
    sentences.push(
      `Application module providing ${mod.id} functionality under \`${mod.root}/\`.`
    );
  }
  if (capabilities.length === 0) {
    capabilities.push(`Feature code and services under \`${mod.root}/\``);
  }

  const doesNotOwn = (mod.dependsOn ?? []).map(
    (dep) => `${dep} concerns → ${dep} module`
  );

  return {
    description: sentences.join(' '),
    capabilities,
    doesNotOwn,
  };
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

  const entryPoints = detectEntryPoints(repoRoot, mod.root);
  const enrichment = {
    entryPoints,
    testRoots: detectTestRoots(repoRoot, mod.root),
    configFiles: detectConfigFiles(repoRoot),
    publicSurface: detectPublicSurface(codeMapFiles, mod.root),
    inferredFlows: inferFlows(repoRoot, allModules, mod),
    outOfScope: inferOutOfScope(allModules, mod),
    inferredCapabilities: inferCapabilities(repoRoot, mod, { entryPoints }),
  };

  log.debug('enrichModule complete', {
    moduleId: mod.id,
    entryPoints: enrichment.entryPoints.length,
    testRoots: enrichment.testRoots.length,
    publicSurface: enrichment.publicSurface.length,
  });

  return enrichment;
}
