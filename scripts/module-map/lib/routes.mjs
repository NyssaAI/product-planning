import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  extractEndpoints,
  nextRouteSegment,
} from '../../code-map/lib/endpoint-extractor.mjs';

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
 * @param {import('./config.mjs').AiPlanConfig} config
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
  // When the code-map carries no endpoints (e.g. ai-plan ran without a fresh
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
  walkFiles(apiRoot, routeFileName, routeFiles);

  const methodsByFile = new Map();
  for (const file of codeMapFiles) {
    const rel = file.path.replace(/\\/g, '/');
    if (!rel.endsWith(`/${routeFileName}`)) {
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

  const legacyRoutes = routeFiles
    .map((abs) => {
      const rel = path.relative(repoRoot, abs).replace(/\\/g, '/');
      const apiPath = filePathToApiRoute(
        rel,
        routeFileName,
        config.apiRoutes.pathPrefix
      );
      return {
        kind: 'http',
        path: apiPath,
        methods: methodsByFile.get(rel) ?? [],
        file: rel,
        moduleId: moduleIdFromApiPath(apiPath, moduleIds),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  return dedupeRoutes([...endpointRoutes, ...legacyRoutes]);
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
      kind: item.kind,
      path: item.path,
      methods: item.method ? [item.method] : [],
      method: item.method,
      name: item.name,
      file: item.file,
      line: item.line,
      moduleId: moduleIdFromFile(item.file, modules, moduleIds),
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
      route.file,
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
 * @param {string} file
 * @param {import('./discover-modules.mjs').ModuleDef[]} modules
 * @param {Set<string>} moduleIds
 * @returns {string}
 */
function moduleIdFromFile(file, modules, moduleIds) {
  const normalized = file.replace(/\\/g, '/');
  const owner = modules
    .filter((mod) => {
      const root = mod.root.replace(/\\/g, '/').replace(/\/$/, '');
      if (root === '.' || root === '') {
        return true;
      }
      return normalized === root || normalized.startsWith(`${root}/`);
    })
    .sort((a, b) => b.root.length - a.root.length)[0];
  if (owner) {
    return owner.id;
  }
  const fromPath = moduleIdFromApiPath(normalized, moduleIds);
  return moduleIds.has(fromPath) ? fromPath : 'platform';
}

/**
 * @param {string} dir
 * @param {string} routeFileName
 * @param {string[]} acc
 */
function walkFiles(dir, routeFileName, acc) {
  if (!existsSync(dir)) {
    return;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, routeFileName, acc);
    } else if (entry.name === routeFileName) {
      acc.push(full);
    }
  }
}

/**
 * @param {string} relPath
 * @param {string} routeFileName
 * @param {string} pathPrefix
 */
function filePathToApiRoute(relPath, routeFileName, pathPrefix) {
  let route = relPath.replace(new RegExp(`/${routeFileName}$`), '');
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

/**
 * @param {string} apiPath
 * @param {Set<string>} moduleIds
 */
function moduleIdFromApiPath(apiPath, moduleIds) {
  const segment = apiPath.split('/').filter(Boolean)[1];
  if (segment && moduleIds.has(segment)) {
    return segment;
  }
  return 'platform';
}
