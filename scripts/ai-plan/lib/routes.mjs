import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

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
 * @typedef {{ path: string, methods: string[], file: string, moduleId: string }} HttpRoute
 */

/**
 * @param {string} repoRoot
 * @param {import('./config.mjs').AiPlanConfig} config
 * @param {import('./discover-modules.mjs').ModuleDef[]} modules
 * @param {{ path: string, symbols?: { name: string }[] }[]} codeMapFiles
 * @returns {HttpRoute[]}
 */
export function discoverHttpRoutes(repoRoot, config, modules, codeMapFiles) {
  if (!config.apiRoutes.enabled) {
    return [];
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

  return routeFiles
    .map((abs) => {
      const rel = path.relative(repoRoot, abs).replace(/\\/g, '/');
      const apiPath = filePathToApiRoute(
        rel,
        routeFileName,
        config.apiRoutes.pathPrefix
      );
      return {
        path: apiPath,
        methods: methodsByFile.get(rel) ?? [],
        file: rel,
        moduleId: moduleIdFromApiPath(apiPath, moduleIds),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
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
  route = route.replace(/\[([^\]]+)\]/g, ':$1');
  return route || '/';
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
