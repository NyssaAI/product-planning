import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_DOC_CANDIDATES,
  detectApiRoutes,
  detectCodeMapRoots,
  readProjectName,
} from './auto-detect.mjs';

/**
 * @typedef {object} ManualModule
 * @property {string} id
 * @property {string} [name]
 * @property {string} root
 * @property {string} [description] Prose responsibility statement — overrides the inferred one
 * @property {string[]} [capabilities] Capability bullets — override the inferred ones
 * @property {string[]} [doesNotOwn] "{capability} → {module} module" entries — override the inferred ones
 * @property {string[]} [flows]
 * @property {boolean} [preserveModule] When true, code-map generation does not overwrite docs/code-map/modules/<id>.md
 * @property {boolean} [preserveScope] Deprecated alias for preserveModule (read as fallback)
 */

/**
 * @typedef {object} PlanProductConfig
 * @property {string} projectName
 * @property {string} outputDir
 * @property {string} codeMapOutput
 * @property {{ product: string[], features: string[], techStack: string[] }} docs
 * @property {number} briefMaxCharsPerDoc
 * @property {object} modules
 * @property {string | null} nav
 * @property {{ enabled: boolean, root: string, routeFile: string, pathPrefix: string }} apiRoutes
 * @property {string[]} conventions
 * @property {boolean} configFilePresent
 */

const DOC_KEYS = ['product', 'features', 'techStack'];

/**
 * @param {string} repoRoot
 * @param {{ allowMissingConfig?: boolean }} [opts]
 * @returns {PlanProductConfig}
 */
export function loadPlanProductConfig(repoRoot, opts = {}) {
  const configPath = path.join(repoRoot, 'plan-product.config.json');
  const configFilePresent = existsSync(configPath);
  const raw = configFilePresent
    ? JSON.parse(readFileSync(configPath, 'utf8'))
    : {};
  const planProductPathConfig = readPlanProductPathConfig(repoRoot);
  const planProductPaths = planProductPathConfig?.paths ?? {};
  const defaultOutputDir =
    typeof planProductPaths.codeMap === 'string'
      ? planProductPaths.codeMap
      : 'docs/code-map';

  /** @type {Record<string, string[]>} */
  const docs = {};
  for (const key of DOC_KEYS) {
    const val = raw.docs?.[key];
    if (typeof val === 'string') {
      docs[key] = [val];
    } else if (Array.isArray(val)) {
      docs[key] = val;
    } else if (typeof planProductDocPath(planProductPaths, key) === 'string') {
      docs[key] = [planProductDocPath(planProductPaths, key)];
    } else {
      docs[key] = [...DEFAULT_DOC_CANDIDATES[key]];
    }
  }

  const apiDetected = detectApiRoutes(repoRoot);
  const apiRaw = raw.apiRoutes ?? {};

  return {
    projectName:
      typeof raw.projectName === 'string'
        ? raw.projectName
        : readProjectName(repoRoot),
    outputDir:
      typeof raw.outputDir === 'string' ? raw.outputDir : defaultOutputDir,
    codeMapOutput:
      typeof raw.codeMapOutput === 'string'
        ? raw.codeMapOutput
        : typeof raw.output === 'string'
          ? raw.output
          : path.posix.join(defaultOutputDir.replace(/\\/g, '/').replace(/\/$/, ''), 'code-map.json'),
    docs,
    briefMaxCharsPerDoc:
      typeof raw.briefMaxCharsPerDoc === 'number'
        ? raw.briefMaxCharsPerDoc
        : 1200,
    modules: {
      discover: raw.modules?.discover ?? 'auto',
      manual: Array.isArray(raw.modules?.manual) ? raw.modules.manual : [],
      pinned: Array.isArray(raw.modules?.pinned) ? raw.modules.pinned : [],
      globs: Array.isArray(raw.modules?.globs) ? raw.modules.globs : [],
      flows:
        raw.modules?.flows && typeof raw.modules.flows === 'object'
          ? raw.modules.flows
          : {},
      adapter:
        typeof raw.modules?.adapter === 'string'
          ? raw.modules.adapter
          : undefined,
      minFiles:
        typeof raw.modules?.minFiles === 'number'
          ? raw.modules.minFiles
          : undefined,
      maxFiles:
        typeof raw.modules?.maxFiles === 'number'
          ? raw.modules.maxFiles
          : undefined,
    },
    nav: typeof raw.nav === 'string' ? raw.nav : null,
    apiRoutes: {
      enabled:
        apiRaw.enabled === false ? false : apiDetected.enabled,
      root:
        typeof apiRaw.root === 'string' ? apiRaw.root : apiDetected.root,
      routeFile:
        typeof apiRaw.routeFile === 'string'
          ? apiRaw.routeFile
          : apiDetected.routeFile,
      pathPrefix: apiDetected.pathPrefix,
    },
    conventions: Array.isArray(raw.conventions) ? raw.conventions : [],
    configFilePresent,
  };
}

/**
 * @param {string} repoRoot
 * @param {import('./config.mjs').PlanProductConfig} config
 * @returns {{ missing: string[], resolved: Record<string, string | null> }}
 */
export function validateRequiredDocs(repoRoot, config) {
  /** @type {string[]} */
  const missing = [];
  /** @type {Record<string, string | null>} */
  const resolved = {};

  for (const key of DOC_KEYS) {
    const path = resolveDocPath(repoRoot, config.docs[key]);
    resolved[key] = path;
    if (!path) {
      missing.push(key);
    }
  }

  return { missing, resolved };
}

/**
 * @param {string} repoRoot
 * @param {string[]} candidates
 * @returns {string | null}
 */
export function resolveDocPath(repoRoot, candidates) {
  for (const rel of candidates) {
    const full = path.join(repoRoot, rel);
    if (existsSync(full)) {
      return rel.replace(/\\/g, '/');
    }
  }
  return null;
}

/**
 * @param {string} repoRoot
 */
export function writeStarterConfigs(repoRoot) {
  const roots = detectCodeMapRoots(repoRoot);
  const configPath = path.join(repoRoot, 'plan-product.config.json');
  if (!existsSync(configPath)) {
    writeFileSync(
      configPath,
      `${JSON.stringify(
        {
          output: 'docs/code-map/code-map.json',
          outputDir: 'docs/code-map',
          codeMapOutput: 'docs/code-map/code-map.json',
          roots,
          docs: {
            product: ['docs/product.md'],
            features: ['docs/features.md'],
            techStack: ['docs/tech-stack.md'],
          },
          modules: { discover: 'auto' },
        },
        null,
        2
      )}\n`,
      'utf8'
    );
  }

  return { roots, configPath };
}

/**
 * @param {string} repoRoot
 * @returns {Record<string, any> | null}
 */
function readPlanProductPathConfig(repoRoot) {
  const configPath = path.join(repoRoot, '.plan-product', 'config.json');
  if (!existsSync(configPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, any>} paths
 * @param {string} key
 * @returns {string | undefined}
 */
function planProductDocPath(paths, key) {
  if (key === 'techStack') {
    return typeof paths.techStack === 'string' ? paths.techStack : undefined;
  }
  if (key === 'features') {
    return typeof paths.features === 'string' ? paths.features : undefined;
  }
  return typeof paths[key] === 'string' ? paths[key] : undefined;
}
