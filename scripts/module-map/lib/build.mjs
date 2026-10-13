import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadProjectBrief, extractConventionsFromTechStack } from './docs.mjs';
import { discoverModules, parseNavEntries } from './discover-modules.mjs';
import { buildModuleEdges } from './module-deps.mjs';
import { extractStackGraph } from './stack-graph.mjs';
import { discoverHttpRoutes } from './routes.mjs';
import { createLogger } from './logger.mjs';
import { enrichModule } from './module-enrichment.mjs';
import { ownsFile } from './module-ownership.mjs';
import { validateModuleIds } from './module-ids.mjs';

const log = createLogger({ module: 'build' });

/**
 * @param {string} root
 * @returns {string} forward-slashed, no trailing slash; '' for the repo root
 */
function normalizeRoot(root) {
  const normalized = String(root ?? '').replace(/\\/g, '/').replace(/\/$/, '');
  return normalized === '.' ? '' : normalized;
}

/**
 * @param {string} repoRoot
 */
function detectSharedRoot(repoRoot) {
  for (const rel of [
    'src/lib',
    'lib',
    'src/common',
    'common',
    'src/shared',
    'shared',
    'src',
  ]) {
    if (existsSync(path.join(repoRoot, rel))) {
      return rel;
    }
  }
  return '.';
}

/**
 * @param {string} repoRoot
 * @param {import('./config.mjs').PlanProductConfig} config
 * @param {{ path: string, symbols?: { name: string, kind: string, line: number }[] }[] | { files?: { path: string, symbols?: { name: string, kind: string, line: number }[] }[], endpoints?: object[] }} codeMapInput
 */
export function buildPlanProductModel(repoRoot, config, codeMapInput) {
  const codeMap = normalizeCodeMap(codeMapInput);
  const codeMapFiles = codeMap.files;
  log.info('buildPlanProductModel start', { repoRoot, codeMapFileCount: codeMapFiles.length });
  const brief = loadProjectBrief(repoRoot, config);
  // Extract the adapter stack graph once; module discovery and module-edge
  // derivation both consume it, so this avoids re-walking and re-parsing the
  // whole repo a second time.
  const stack = Array.isArray(codeMap.fileDependencies)
    ? {
        adapter: { id: (codeMap.coverage?.adapters ?? []).join('+') },
        graph: { files: codeMap.files, edges: codeMap.fileDependencies, diagnostics: codeMap.coverage?.diagnostics ?? [] },
      }
    : extractStackGraph(repoRoot, config);
  const modules = discoverModules(repoRoot, config, stack);
  validateModuleIds(modules);
  log.debug('buildPlanProductModel discovered modules', {
    count: modules.length,
    ids: modules.map((m) => m.id),
  });
  const nav = parseNavEntries(
    config.nav ? path.join(repoRoot, config.nav) : null
  );
  const routes = discoverHttpRoutes(repoRoot, config, modules, codeMap);

  // The auto `platform` module must exist before edges are derived, or it can
  // never appear in dependsOn/usedBy. It is skipped when its shared root is
  // already owned by a discovered module, since two modules on one root would
  // double-own every symbol under it.
  const moduleIds = new Set(modules.map((m) => m.id));
  const hasPlatformRoutes = routes.some((r) => r.moduleId === 'platform');
  if (hasPlatformRoutes && !moduleIds.has('platform')) {
    const platformRoot = detectSharedRoot(repoRoot);
    const rootOwner = modules.find(
      (m) => normalizeRoot(m.root) === normalizeRoot(platformRoot)
    );
    if (rootOwner) {
      log.warn('platform module skipped — shared root already owned', {
        root: platformRoot,
        owner: rootOwner.id,
      });
    } else {
      modules.push({
        id: 'platform',
        name: 'Platform',
        root: platformRoot,
        description: 'Shared HTTP APIs and cross-cutting libraries (auto-detected).',
        flows: config.modules.flows.platform ?? [],
        packageDependencies: [],
        exportEntries: [],
        source: 'manual',
      });
      moduleIds.add('platform');
    }
  }

  validateModuleIds(modules);
  const edges = buildModuleEdges(repoRoot, modules, config, stack);

  const navById = new Map(nav.map((n) => [n.id, n]));

  const routeModules = modules.map((mod) => {
    const modRoutes = routes.filter((r) => r.moduleId === mod.id);
    return {
      ...mod,
      httpRoutes: modRoutes.filter(r => r.kind === 'http'),
      mcpTools: modRoutes.filter(r => r.kind === 'mcp-tool'),
      mcpResources: modRoutes.filter(r => r.kind === 'mcp-resource'),
      mcpPrompts: modRoutes.filter(r => r.kind === 'mcp-prompt'),
      mcpTransports: modRoutes.filter(r => r.kind === 'mcp-transport'),
    };
  });

  const allModuleRoots = routeModules.map((mod) => mod.root);
  const enrichedModules = routeModules.map((mod) => {
    const symbols = symbolsForModule(codeMapFiles, mod.root, allModuleRoots);
    const dependents = edges
      .filter((e) => e.to === mod.id)
      .map((e) => e.from);
    const dependencies = edges
      .filter((e) => e.from === mod.id)
      .map((e) => e.to);

    const scopeRel = path
      .join(config.outputDir, 'modules', `${mod.id}.md`)
      .replace(/\\/g, '/');

    const enrichment = enrichModule(repoRoot, routeModules, mod, codeMapFiles);
    const mergedFlows = [
      ...(mod.flows ?? []),
      ...enrichment.inferredFlows.filter(
        (flow) => !(mod.flows ?? []).includes(flow)
      ),
    ].slice(0, 12);

    const dependsOn = [...new Set(dependencies)].sort();
    const inferred = enrichment.inferredCapabilities;
    // Manual config values (description, capabilities, doesNotOwn) win over
    // inferred ones. doesNotOwn falls back to dependency edges.
    const description = mod.description || inferred.description;
    const capabilities = Array.isArray(mod.capabilities)
      ? mod.capabilities
      : inferred.capabilities;
    const doesNotOwn = Array.isArray(mod.doesNotOwn)
      ? mod.doesNotOwn
      : dependsOn.length > 0
        ? dependsOn.map((dep) => `${dep} concerns → ${dep} module`)
        : inferred.doesNotOwn;

    return {
      ...mod,
      description,
      capabilities,
      doesNotOwn,
      nav: navById.get(mod.id) ?? null,
      symbolsSample: symbols.slice(0, 60),
      symbolCount: symbols.length,
      fileCount: codeMapFiles.filter(file => ownsFile(mod.root, file.path, allModuleRoots)).length,
      dependsOn,
      usedBy: [...new Set(dependents)].sort(),
      planningModule: scopeRel,
      entryPoints: enrichment.entryPoints,
      testRoots: enrichment.testRoots,
      configFiles: enrichment.configFiles,
      publicSurface: enrichment.publicSurface,
      flows: mergedFlows,
      outOfScope: enrichment.outOfScope,
    };
  });

  log.info('buildPlanProductModel complete', {
    moduleCount: enrichedModules.length,
    routeCount: routes.length,
  });

  return {
    schemaVersion: '2.0',
    generated: new Date().toISOString(),
    project: {
      name: config.projectName,
      docs: {
        product: brief.product,
        features: brief.features,
        techStack: brief.techStack,
      },
    },
    progressiveDisclosure: {
      levels: [
        {
          level: 0,
          name: 'task',
          inject: 'Your feature/bug doc and acceptance criteria',
          when: 'Always',
        },
        {
          level: 1,
          name: 'module-scope',
          inject: `${config.outputDir}/modules/<module-id>.md (one file)`,
          when: 'Module orientation helps the task',
        },
        {
          level: 2,
          name: 'product-docs',
          inject: 'docs/product.md, docs/features.md, and/or docs/tech-stack.md',
          when: 'Product intent or stack constraints matter',
        },
        {
          level: 3,
          name: 'code-map',
          inject: 'A bounded query via <PLUGIN_ROOT>/scripts/map-code/query.mjs (symbol, module, callers, or coverage)',
          when: 'Plan lists symbols; need line numbers',
        },
      ],
      index: `${config.outputDir}/index.md`,
    },
    brief: brief.excerpts,
    modules: enrichedModules,
    moduleGraph: { edges },
    coverage: codeMap.coverage ?? {},
    outputDir: config.outputDir.replace(/\\/g, '/').replace(/\/$/, ''),
    codeMap: config.codeMapOutput.replace(/\\/g, '/'),
    conventions: [
      ...config.conventions,
      ...extractConventionsFromTechStack(brief.excerpts.techStack ?? ''),
    ].filter(Boolean),
    stats: {
      moduleCount: enrichedModules.length,
      routeCount: routes.length,
      codeMapSymbols: codeMapFiles.reduce(
        (n, f) => n + (f.symbols?.length ?? 0),
        0
      ),
    },
  };
}

/**
 * Symbols a module owns under the disjoint ownership model: a file belongs to
 * the module with the longest matching root, so a parent module excludes files
 * claimed by a more specific child module (matching the code-map linker).
 *
 * @param {{ path: string, symbols?: { name: string, kind: string, line: number }[] }[]} files
 * @param {string} moduleRoot
 * @param {string[]} allModuleRoots
 */
function symbolsForModule(files, moduleRoot, allModuleRoots) {
  const out = [];
  for (const file of files) {
    const p = file.path.replace(/\\/g, '/');
    if (!ownsFile(moduleRoot, p, allModuleRoots)) {
      continue;
    }
    for (const sym of file.symbols ?? []) {
      out.push({
        file: p,
        name: sym.name,
        kind: sym.kind,
        line: sym.line,
      });
    }
  }
  return out;
}

/**
 * @param {{ path: string, symbols?: { name: string, kind: string, line: number }[] }[] | { files?: { path: string, symbols?: { name: string, kind: string, line: number }[] }[], endpoints?: object[] }} input
 * @returns {{ files: { path: string, symbols?: { name: string, kind: string, line: number }[] }[], endpoints: object[] }}
 */
function normalizeCodeMap(input) {
  if (Array.isArray(input)) {
    return { files: input, endpoints: [] };
  }
  return {
    ...input,
    files: Array.isArray(input?.files) ? input.files : [],
    endpoints: Array.isArray(input?.endpoints) ? input.endpoints : [],
  };
}
