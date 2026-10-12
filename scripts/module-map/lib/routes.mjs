import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  extractEndpoints,
  nextRouteSegment,
} from '../../lib/endpoint-extractor.mjs';

const HTTP_METHODS = new Set([
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS',
]);

/**
 * @typedef {{ kind: string, path?: string, methods: string[], method?: string, name?: string, file: string, line?: number, moduleId: string }} HttpRoute
 */

/**
 * @param {string} repoRoot
 * @param {import('./config.mjs').PlanProductConfig} config
 * @param {import('./discover-modules.mjs').ModuleDef[]} modules
 * @param {{ files?: { path: string, symbols?: { name: string }[] }[], endpoints?: object[] } | { path: string, symbols?: { name: string }[] }[]} codeMapInput
 * @returns {HttpRoute[]}
 */
export function discoverHttpRoutes(repoRoot, config, modules, codeMapInput) {
  const codeMapFiles = Array.isArray(codeMapInput)
    ? codeMapInput
    : codeMapInput.files ?? [];
  const providedEndpoints = Array.isArray(codeMapInput)
    ? []
    : codeMapInput.endpoints ?? [];
  // When the code-map carries no endpoints (e.g. plan-product ran without a fresh
  // code-map pass), recover C#/FastAPI/MCP/Next.js endpoints by scanning the
  // code-map's own file list with the same endpoint extractor code-map uses.
  // This reuses the already-enumerated source files rather than re-walking the
  // tree, so non-Next.js endpoints survive without a full code-map run.
  const endpoints =
    providedEndpoints.length > 0
      ? providedEndpoints
      : extractEndpoints(
          repoRoot,
          codeMapFiles.map((file) => file.path)
        );
  const endpointRoutes = discoverEndpointRoutes(modules, endpoints);
  if (!config.apiRoutes.enabled) {
    return endpointRoutes;
  }

  const apiRoot = path.join(repoRoot, config.apiRoutes.root);
  const routeFileName = config.apiRoutes.routeFile;
  const routeFiles = [];
  walkFiles(apiRoot, routeFileName, config.apiRoutes.root, routeFiles);
  // A generated inventory is authoritative; route fallback must not expand it.
  if (!Array.isArray(codeMapInput) && codeMapInput.schemaVersion === '2.0') {
    const allowed = new Set(codeMapFiles.map(file => file.path));
    for (let i = routeFiles.length - 1; i >= 0; i--) {
      if (!allowed.has(path.relative(repoRoot, routeFiles[i]).replace(/\\/g, '/'))) routeFiles.splice(i, 1);
    }
  }

  const methodsByFile = new Map();
  const routeFilePaths = new Set(
    routeFiles.map((file) => path.relative(repoRoot, file).replace(/\\/g, '/'))
  );
  for (const file of codeMapFiles) {
    const rel = file.path.replace(/\\/g, '/');
    if (!routeFilePaths.has(rel)) {
      continue;
    }
    const methods = (file.symbols ?? [])
      .map((s) => s.name)
      .filter((n) => HTTP_METHODS.has(n));
    if (methods.length > 0) {
      methodsByFile.set(rel, [...new Set(methods)].sort());
    }
  }

  const moduleIds = new Set(modules.map((m) => m.id));

  const fileRoutes = routeFiles
    .map((abs) => {
      const rel = path.relative(repoRoot, abs).replace(/\\/g, '/');
      const apiPath = filePathToApiRoute(
        rel,
        routeFileName,
        config.apiRoutes.pathPrefix,
        config.apiRoutes.root
      );
      return {
        kind: 'http',
        path: apiPath,
        methods: methodsByFile.get(rel) ?? [],
        file: rel,
        moduleId: attributeRoute(rel, apiPath, modules, moduleIds),
      };
    })
    .flatMap(route => {
      const covered = endpointRoutes.filter(endpoint => endpoint.kind === route.kind && endpoint.file === route.file && endpoint.path === route.path);
      if (covered.length === 0) return [route];
      const methods = route.methods.filter(method => !covered.some(endpoint => endpoint.methods.includes(method)));
      return methods.length > 0 ? [{ ...route, methods }] : [];
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  return dedupeRoutes([...endpointRoutes, ...fileRoutes]);
}

/**
 * @param {import('./discover-modules.mjs').ModuleDef[]} modules
 * @param {object[]} endpoints
 * @returns {HttpRoute[]}
 */
function discoverEndpointRoutes(modules, endpoints) {
  const moduleIds = new Set(modules.map((m) => m.id));
  const normalized = [];

  for (const endpoint of endpoints) {
    const item = /** @type {{ kind?: string, method?: string, path?: string, name?: string, file?: string, line?: number }} */ (endpoint);
    if (!item.kind || !item.file) {
      continue;
    }
    normalized.push({
      ...item,
      kind: item.kind,
      path: item.path,
      methods: item.method ? [item.method] : [],
      method: item.method,
      name: item.name,
      file: item.file,
      line: item.line,
      moduleId: attributeRoute(item.file, item.path, modules, moduleIds),
    });
  }

  return normalized.sort(
    (a, b) =>
      a.moduleId.localeCompare(b.moduleId) ||
      (a.kind ?? '').localeCompare(b.kind ?? '') ||
      (a.path ?? a.name ?? '').localeCompare(b.path ?? b.name ?? '') ||
      a.file.localeCompare(b.file)
  );
}

/**
 * @param {HttpRoute[]} routes
 * @returns {HttpRoute[]}
 */
function dedupeRoutes(routes) {
  const byKey = new Map();
  for (const route of routes) {
    const key = [
      route.kind,
      route.methods.join(','),
      route.path ?? '',
      route.name ?? '',
      route.pathExpression ?? '',
      route.nameExpression ?? '',
      route.file,
      route.line ?? '',
    ].join('\0');
    if (!byKey.has(key)) {
      byKey.set(key, route);
    }
  }
  return [...byKey.values()].sort(
    (a, b) =>
      a.moduleId.localeCompare(b.moduleId) ||
      (a.kind ?? '').localeCompare(b.kind ?? '') ||
      (a.path ?? a.name ?? '').localeCompare(b.path ?? b.name ?? '') ||
      a.file.localeCompare(b.file)
  );
}

/**
 * Attribute one route/endpoint to a module.
 *
 * Priority:
 *  1. Path ownership — the file lives inside a module's own root, so the route
 *     is defined in that module's tree (unchanged legacy behavior).
 *  2. API-path segment — a thin route handler in a shared app/api tree (e.g.
 *     Next.js `src/app/api/<feature>/**`) is attributed to the feature module
 *     its URL segment names, by module id or package-name leaf, with
 *     singular/plural tolerance (`/api/updates` -> `update`).
 *  3. `platform` — a genuinely shared app/host route with no feature owner.
 *
 * Steps 2-3 only run when no module root contains the file, so an endpoint
 * defined inside a module keeps its path-based owner. The URL segment is used
 * rather than the handler's imports on purpose: a shared route (e.g.
 * `/api/health`) often imports a feature to inspect it, which would falsely
 * pull the route into that feature. The segment names the route's owner; a
 * missed attribution (left in `platform`) is safer than a false one.
 *
 * @param {string} file
 * @param {string | undefined} apiPath
 * @param {import('./discover-modules.mjs').ModuleDef[]} modules
 * @param {Set<string>} moduleIds
 * @returns {string}
 */
function attributeRoute(file, apiPath, modules, moduleIds) {
  const normalized = String(file ?? '').replace(/\\/g, '/');
  const owner = longestRootOwner(normalized, modules);
  if (owner) {
    return owner.id;
  }
  const viaSegment = moduleFromApiSegment(apiPath, modules, moduleIds);
  if (viaSegment) {
    return viaSegment;
  }
  return 'platform';
}

/**
 * The module whose root is the longest prefix containing `file`, or null.
 *
 * @param {string} file forward-slashed path
 * @param {import('./discover-modules.mjs').ModuleDef[]} modules
 * @returns {import('./discover-modules.mjs').ModuleDef | null}
 */
function longestRootOwner(file, modules) {
  return (
    modules
      .filter((mod) => {
        const root = mod.root.replace(/\\/g, '/').replace(/\/$/, '');
        if (root === '.' || root === '') {
          return true;
        }
        return file === root || file.startsWith(`${root}/`);
      })
      .sort((a, b) => b.root.length - a.root.length)[0] ?? null
  );
}

/**
 * Map an API path's feature segment (`/api/<feature>` or `/<feature>`) to a
 * module by id or package-name leaf, tolerating a plural URL segment for a
 * singular module (`/api/updates` -> `update`).
 *
 * @param {string | undefined} apiPath
 * @param {import('./discover-modules.mjs').ModuleDef[]} modules
 * @param {Set<string>} moduleIds
 * @returns {string | null}
 */
function moduleFromApiSegment(apiPath, modules, moduleIds) {
  if (!apiPath) {
    return null;
  }
  const segs = String(apiPath).split('/').filter(Boolean);
  const seg = segs[0] === 'api' ? segs[1] : segs[0];
  if (!seg) {
    return null;
  }
  const candidates = [seg];
  if (seg.length > 1 && seg.endsWith('s')) {
    candidates.push(seg.slice(0, -1));
  }
  for (const candidate of candidates) {
    if (moduleIds.has(candidate)) {
      return candidate;
    }
    for (const mod of modules) {
      const leaf = String(mod.name ?? '').split('/').pop();
      if (leaf && leaf === candidate) {
        return mod.id;
      }
    }
  }
  return null;
}

/**
 * @param {string} dir
 * @param {string} routeFileName
 * @param {string} apiRoot
 * @param {string[]} acc
 */
function walkFiles(dir, routeFileName, apiRoot, acc) {
  if (!existsSync(dir)) {
    return;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, routeFileName, apiRoot, acc);
    } else if (isRouteFile(entry.name, routeFileName, apiRoot)) {
      acc.push(full);
    }
  }
}

/**
 * @param {string} name
 * @param {string} configuredName
 * @param {string} apiRoot
 */
function isRouteFile(name, configuredName, apiRoot) {
  const normalizedRoot = apiRoot.replace(/\\/g, '/');
  if (/(?:^|\/)app\/api$/.test(normalizedRoot)) {
    return /^route\.(?:js|ts|jsx|tsx)$/.test(name);
  }
  if (/(?:^|\/)pages\/api$/.test(normalizedRoot)) {
    return /\.(?:js|ts|jsx|tsx)$/.test(name) && !name.endsWith('.d.ts');
  }
  return name === configuredName;
}

/**
 * @param {string} relPath
 * @param {string} routeFileName
 * @param {string} pathPrefix
 * @param {string} apiRoot
 */
function filePathToApiRoute(relPath, routeFileName, pathPrefix, apiRoot) {
  const normalizedRoot = apiRoot.replace(/\\/g, '/');
  const pagesRouter = /(?:^|\/)pages\/api$/.test(normalizedRoot);
  let route = pagesRouter
    ? relPath.replace(/\.(?:js|ts|jsx|tsx)$/, '').replace(/\/index$/, '')
    : relPath.replace(/\/route\.(?:js|ts|jsx|tsx)$/, '');
  if (!pagesRouter && route === relPath) {
    const escaped = routeFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    route = relPath.replace(new RegExp(`/${escaped}$`), '');
  }
  if (pathPrefix) {
    const prefix = pathPrefix.replace(/\\/g, '/');
    if (route.startsWith(`${prefix}/`)) {
      route = route.slice(prefix.length);
    }
  }
  // Use the single Next.js path translator from endpoint-extractor so route
  // groups `(group)`, parallel-route slots `@slot`, and the full dynamic-segment
  // family (`[param]`, `[...param]`, `[[...param]]`) translate consistently.
  const segments = route
    .split('/')
    .filter(Boolean)
    .filter((seg) => !/^\(.*\)$/.test(seg))
    .filter((seg) => !seg.startsWith('@'))
    .map(nextRouteSegment);
  return `/${segments.join('/')}`.replace(/\/+$/, '') || '/';
}
