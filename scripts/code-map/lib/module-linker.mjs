import path from 'node:path';
import { ownerRoot, normalizeRoot } from '../../ai-plan/lib/module-ownership.mjs';

/**
 * @typedef {object} ModuleLink
 * @property {string} id
 * @property {string} name
 * @property {string} root
 * @property {string} planningModule
 */

/**
 * Add module ownership to a code-map document and expose a flat symbol index.
 *
 * @param {{ files?: Array<{ path: string, symbols?: Array<Record<string, unknown>> }>, endpoints?: Array<Record<string, unknown>> }} codeMap
 * @param {Array<{ id: string, name?: string, root: string }>} modules
 * @param {{ outputDir: string }} options
 */
export function annotateCodeMapWithModules(codeMap, modules, options) {
  const moduleLinks = modules.map((mod) => toModuleLink(mod, options.outputDir));
  const linkByRoot = new Map(
    moduleLinks.map((mod) => [normalizeRoot(mod.root), mod])
  );
  const roots = moduleLinks.map((mod) => mod.root);
  const moduleStats = new Map(
    moduleLinks.map((mod) => [
      mod.id,
      { fileCount: 0, symbolCount: 0, endpointCount: 0 },
    ])
  );

  const files = (codeMap.files ?? []).map((file) => {
    const owner = findOwner(file.path, roots, linkByRoot);
    if (owner) {
      moduleStats.get(owner.id).fileCount += 1;
    }

    const symbols = (file.symbols ?? []).map((symbol) => {
      const annotated = owner ? addModuleFields(symbol, owner) : { ...symbol };
      if (owner) {
        moduleStats.get(owner.id).symbolCount += 1;
      }
      return annotated;
    });

    return {
      ...file,
      ...(owner ? moduleFields(owner) : {}),
      symbols,
    };
  });

  const symbols = files.flatMap((file) =>
    (file.symbols ?? []).map((symbol) => ({
      file: file.path,
      ...symbol,
    }))
  );

  const endpoints = (codeMap.endpoints ?? []).map((endpoint) => {
    const file = typeof endpoint.file === 'string' ? endpoint.file : '';
    const owner = findOwner(file, roots, linkByRoot);
    if (owner) {
      moduleStats.get(owner.id).endpointCount += 1;
      return addModuleFields(endpoint, owner);
    }
    return { ...endpoint };
  });

  return {
    ...codeMap,
    moduleCount: moduleLinks.length,
    modules: moduleLinks.map((mod) => {
      const stats = moduleStats.get(mod.id);
      return {
        id: mod.id,
        name: mod.name,
        root: mod.root,
        planningModule: mod.planningModule,
        fileCount: stats.fileCount,
        symbolCount: stats.symbolCount,
        endpointCount: stats.endpointCount,
      };
    }),
    files,
    symbols,
    endpoints,
  };
}

/**
 * @param {{ id: string, name?: string, root: string }} mod
 * @param {string} outputDir
 * @returns {ModuleLink}
 */
function toModuleLink(mod, outputDir) {
  const out = outputDir.replace(/\\/g, '/').replace(/\/$/, '');
  return {
    id: mod.id,
    name: mod.name ?? mod.id,
    root: mod.root.replace(/\\/g, '/').replace(/\/$/, ''),
    planningModule: path.posix.join(out, 'modules', `${mod.id}.md`),
  };
}

/**
 * Disjoint owner: the module whose root is the longest prefix of `filePath`.
 *
 * @param {string} filePath
 * @param {string[]} roots all module roots
 * @param {Map<string, ModuleLink>} linkByRoot normalized-root -> module link
 * @returns {ModuleLink | null}
 */
function findOwner(filePath, roots, linkByRoot) {
  const root = ownerRoot(filePath, roots);
  return root === null ? null : linkByRoot.get(normalizeRoot(root)) ?? null;
}

/**
 * @param {ModuleLink} mod
 */
function moduleFields(mod) {
  return {
    moduleId: mod.id,
    moduleName: mod.name,
    moduleRoot: mod.root,
    planningModule: mod.planningModule,
  };
}

/**
 * @template {Record<string, unknown>} T
 * @param {T} item
 * @param {ModuleLink} mod
 * @returns {T & ReturnType<typeof moduleFields>}
 */
function addModuleFields(item, mod) {
  return {
    ...item,
    ...moduleFields(mod),
  };
}
