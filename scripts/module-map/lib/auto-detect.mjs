import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** @type {readonly string[]} */
export const DEFAULT_DOC_CANDIDATES = {
  product: [
    'docs/product.md',
    'product.md',
    'PRODUCT.md',
    'doc/product.md',
  ],
  features: [
    'docs/features.md',
    'features.md',
    'FEATURES.md',
  ],
  techStack: [
    'docs/tech-stack.md',
    'tech-stack.md',
    'docs/techstack.md',
    'TECH-STACK.md',
  ],
};

/** @type {readonly string[]} */
const CODE_ROOT_CANDIDATES = [
  'src',
  'lib',
  'app',
  'apps',
  'packages',
  'services',
  'cmd',
  'internal',
  'api',
  'server',
  'client',
  'core',
  'test',
];

/** @type {readonly { root: string, routeFile?: string, pathPrefix: string, router?: 'app' | 'pages' }[]} */
const API_ROUTE_CANDIDATES = [
  { root: 'src/app/api', pathPrefix: 'src/app', router: 'app' },
  { root: 'app/api', pathPrefix: 'app', router: 'app' },
  { root: 'src/pages/api', pathPrefix: 'src/pages', router: 'pages' },
  { root: 'pages/api', pathPrefix: 'pages', router: 'pages' },
  { root: 'routes', routeFile: 'index.js', pathPrefix: '' },
  { root: 'src/routes', routeFile: 'index.js', pathPrefix: 'src' },
];

/** @type {readonly string[]} */
export const MODULE_GLOB_CANDIDATES = [
  'packages/*',
  'apps/*',
  'libs/*',
  'modules/*',
  'services/*',
];

/**
 * @param {string} repoRoot
 */
export function readProjectName(repoRoot) {
  const pkgPath = path.join(repoRoot, 'package.json');
  if (!existsSync(pkgPath)) {
    return path.basename(repoRoot);
  }
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (typeof pkg.name === 'string' && pkg.name && !pkg.name.startsWith('@scope/')) {
      return pkg.name;
    }
  } catch {
    /* ignore */
  }
  return path.basename(repoRoot);
}

/**
 * @param {string} repoRoot
 * @returns {string[]}
 */
export function detectCodeMapRoots(repoRoot) {
  const roots = CODE_ROOT_CANDIDATES.filter((dir) => {
    const full = path.join(repoRoot, dir);
    return existsSync(full) && hasSourceFiles(full);
  });

  if (roots.length > 0) {
    return roots;
  }

  if (hasSourceFiles(repoRoot)) {
    return ['.'];
  }

  return ['src'];
}

/**
 * @param {string} repoRoot
 */
export function detectApiRoutes(repoRoot) {
  for (const candidate of API_ROUTE_CANDIDATES) {
    const full = path.join(repoRoot, candidate.root);
    const routeFile = findApiRouteFile(full, candidate);
    if (routeFile) {
      return {
        enabled: true,
        root: candidate.root,
        routeFile,
        pathPrefix: candidate.pathPrefix,
      };
    }
  }
  return { enabled: false, root: '', routeFile: 'route.js', pathPrefix: '' };
}

/**
 * Return an actual matching route filename below a candidate root. Merely
 * having the directory is not enough: empty App Router roots must not mask a
 * later Pages Router candidate.
 *
 * @param {string} root
 * @param {{ routeFile?: string, router?: 'app' | 'pages' }} candidate
 * @returns {string | null}
 */
function findApiRouteFile(root, candidate) {
  if (!existsSync(root)) {
    return null;
  }
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        stack.push(path.join(current, entry.name));
        continue;
      }
      if (
        (candidate.router === 'app' && /^route\.(?:js|ts|jsx|tsx)$/.test(entry.name)) ||
        (candidate.router === 'pages' && /\.(?:js|ts|jsx|tsx)$/.test(entry.name)) ||
        (!candidate.router && entry.name === candidate.routeFile)
      ) {
        return entry.name;
      }
    }
  }
  return null;
}

/**
 * @param {string} dir
 */
function hasSourceFiles(dir) {
  if (!existsSync(dir)) {
    return false;
  }
  const stack = [dir];
  let checked = 0;
  while (stack.length > 0 && checked < 500) {
    const current = stack.pop();
    checked += 1;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      const full = path.join(current, entry.name);
      // Languages with ast-grep rules/adapters (Rust removed: no rules exist).
      if (entry.isFile() && /\.(m?[jt]sx?|cs|py|go)$/i.test(entry.name)) {
        return true;
      }
      if (entry.isDirectory()) {
        stack.push(full);
      }
    }
  }
  return false;
}

/**
 * @param {string} repoRoot
 * @returns {string[]}
 */
export function detectSrcChildModules(repoRoot) {
  const srcDir = path.join(repoRoot, 'src');
  if (!existsSync(srcDir)) {
    return [];
  }

  const skip = new Set([
    'node_modules',
    '__tests__',
    '__mocks__',
    'fixtures',
    'testdata',
  ]);

  return readdirSync(srcDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !skip.has(e.name) && !e.name.startsWith('.'))
    .map((e) => `src/${e.name}`)
    .filter((rel) => hasSourceFiles(path.join(repoRoot, rel)));
}
