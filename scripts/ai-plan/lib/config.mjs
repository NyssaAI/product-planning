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
 * @property {boolean} [preserveModule] When true, ai-plan does not overwrite docs/agent-plan/context/modules/<id>.md
 * @property {boolean} [preserveScope] Deprecated alias for preserveModule (read as fallback)
 */

/**
 * @typedef {object} AiPlanConfig
 * @property {string} projectName
 * @property {string} outputDir
 * @property {string} codeMapOutput
 * @property {{ product: string[], roadmap: string[], techStack: string[] }} docs
 * @property {number} briefMaxCharsPerDoc
 * @property {object} modules
 * @property {string | null} nav
 * @property {{ enabled: boolean, root: string, routeFile: string, pathPrefix: string }} apiRoutes
 * @property {string[]} conventions
 * @property {{ enabled: boolean, commands: string[], e2e: string[] }} test
 * @property {boolean} configFilePresent
 */

const DOC_KEYS = ['product', 'roadmap', 'techStack'];

/**
 * Parse + validate the `test` config field used by the pre-push test gate.
 * Malformed input is ignored (never throws): non-string command entries are
 * dropped, a non-array `commands`/`e2e` becomes `[]`, and `enabled` is only
 * `false` when explicitly set so.
 * @param {unknown} raw
 * @returns {{ enabled: boolean, commands: string[], e2e: string[] }}
 */
export function parseTestConfig(raw) {
  const test = raw && typeof raw === 'object' ? /** @type {any} */ (raw) : {};
  const strings = (val) =>
    Array.isArray(val) ? val.filter((v) => typeof v === 'string') : [];
  return {
    enabled: test.enabled === false ? false : true,
    commands: strings(test.commands),
    e2e: strings(test.e2e),
  };
}

/**
 * @param {string} repoRoot
 * @param {{ allowMissingConfig?: boolean }} [opts]
 * @returns {AiPlanConfig}
 */
export function loadAiPlanConfig(repoRoot, opts = {}) {
  const configPath = path.join(repoRoot, 'ai-plan.config.json');
  const configFilePresent = existsSync(configPath);
  const raw = configFilePresent
    ? JSON.parse(readFileSync(configPath, 'utf8'))
    : {};

  /** @type {Record<string, string[]>} */
  const docs = {};
  for (const key of DOC_KEYS) {
    const val = raw.docs?.[key];
    if (typeof val === 'string') {
      docs[key] = [val];
    } else if (Array.isArray(val)) {
      docs[key] = val;
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
      typeof raw.outputDir === 'string' ? raw.outputDir : 'docs/agent-plan/context',
    codeMapOutput:
      typeof raw.codeMapOutput === 'string'
        ? raw.codeMapOutput
        : 'docs/agent-plan/context/code-map.json',
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
    test: parseTestConfig(raw.test),
    configFilePresent,
  };
}

/**
 * @param {string} repoRoot
 * @param {import('./config.mjs').AiPlanConfig} config
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
  const codeMapPath = path.join(repoRoot, 'code-map.config.json');
  if (!existsSync(codeMapPath)) {
    writeFileSync(
      codeMapPath,
      `${JSON.stringify(
        {
          output: 'docs/agent-plan/context/code-map.json',
          roots,
        },
        null,
        2
      )}\n`,
      'utf8'
    );
  }

  const aiPlanPath = path.join(repoRoot, 'ai-plan.config.json');
  if (!existsSync(aiPlanPath)) {
    writeFileSync(
      aiPlanPath,
      `${JSON.stringify(
        {
          docs: {
            product: ['docs/product.md'],
            roadmap: ['docs/roadmap.md'],
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

  return { roots, codeMapPath, aiPlanPath };
}
