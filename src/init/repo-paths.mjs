// Responsibility: Enforce repo_root path containment, user_home -> repo_root configuration precedence, 4-step runtime_root resolution, and opt-in usage telemetry.
// Public interface:
// +-- isPathContained(repoRoot, candidate)
// +-- resolveRepoContainedPath(repoRoot, configuredPath, label)
// +-- resolveRepoRelativePath(repoRoot, configuredPath, label)
// +-- validatePlanningConfig(config, label)
// +-- resolvePlanningConfig(repoRoot, options)
// +-- resolveRuntimeRoot(repoRoot, options)
// +-- resolveUsageTelemetryDir(repoRoot, options)
// +-- isUsageTelemetryEnabled(repoRoot, options)
// `-- recordUsageEvent(repoRoot, event, options)

import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ALLOWED_TOP_LEVEL_CONFIG_KEYS = new Set([
  'version',
  'paths',
  'structure',
  'runtimeRoot',
  'telemetry',
]);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function mergeLayers(base, override) {
  if (!isObject(override)) return structuredClone(base);
  const result = isObject(base) ? structuredClone(base) : {};
  for (const [key, value] of Object.entries(override)) {
    if (isObject(value) && isObject(result[key])) {
      result[key] = mergeLayers(result[key], value);
    } else if (value !== undefined) {
      result[key] = structuredClone(value);
    }
  }
  return result;
}

function readOptionalJsonObject(filePath) {
  if (!filePath || !existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isPersonaWorkspace(dirPath) {
  return existsSync(path.join(dirPath, 'SOUL.md')) && existsSync(path.join(dirPath, 'IDENTITY.md'));
}

function normalizeRuntimeArgs(repoRoot = null, options = {}) {
  if (isObject(repoRoot)) {
    return {
      repoRoot: typeof repoRoot.repoRoot === 'string' && repoRoot.repoRoot.trim()
        ? path.resolve(repoRoot.repoRoot.trim())
        : null,
      options: repoRoot,
    };
  }
  const normalizedOptions = isObject(options) ? options : {};
  const candidateRepo = typeof repoRoot === 'string' && repoRoot.trim()
    ? repoRoot.trim()
    : typeof normalizedOptions.repoRoot === 'string' && normalizedOptions.repoRoot.trim()
      ? normalizedOptions.repoRoot.trim()
      : null;
  return {
    repoRoot: candidateRepo ? path.resolve(candidateRepo) : null,
    options: normalizedOptions,
  };
}

/**
 * Check whether a candidate path stays lexically inside repoRoot.
 */
export function isPathContained(repoRoot, candidate) {
  const relative = path.relative(repoRoot, candidate);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  );
}

/**
 * Resolve a configured path and reject escapes outside repo_root before or after symlink resolution.
 */
export function resolveRepoContainedPath(repoRoot, configuredPath, label) {
  if (typeof configuredPath !== 'string' || configuredPath.trim() === '') {
    throw new Error(`${label} must be a non-empty path within repo_root`);
  }
  const resolvedRoot = path.resolve(repoRoot);
  const resolved = path.resolve(resolvedRoot, configuredPath);
  if (!isPathContained(resolvedRoot, resolved)) {
    throw new Error(`${label} must be within repo_root: ${configuredPath}`);
  }
  const realRoot = realpathSync(resolvedRoot);
  let existingAncestor = resolved;
  // lstat sees dangling links so later writes cannot follow a link outside repo_root.
  while (!lstatSync(existingAncestor, { throwIfNoEntry: false })) {
    const parent = path.dirname(existingAncestor);
    if (parent === existingAncestor) {
      break;
    }
    existingAncestor = parent;
  }
  let realAncestor;
  try {
    realAncestor = realpathSync(existingAncestor);
  } catch (error) {
    throw new Error(`${label} cannot resolve a path within repo_root: ${configuredPath}`, { cause: error });
  }
  const realTarget = path.resolve(
    realAncestor,
    path.relative(existingAncestor, resolved)
  );
  if (!isPathContained(realRoot, realTarget)) {
    throw new Error(`${label} must be within repo_root: ${configuredPath}`);
  }
  return resolved;
}

/**
 * Validate a configured path and return its normalized repo-relative forward-slash form.
 */
export function resolveRepoRelativePath(repoRoot, configuredPath, label) {
  const resolved = resolveRepoContainedPath(repoRoot, configuredPath, label);
  return path.relative(path.resolve(repoRoot), resolved).replace(/\\/g, '/');
}

/**
 * Validate top-level and optional runtimeRoot / telemetry properties of a plan-product config layer.
 */
export function validatePlanningConfig(config, label = 'config') {
  if (!isObject(config)) {
    throw new Error(`${label} must be an object`);
  }
  for (const key of Object.keys(config)) {
    if (!ALLOWED_TOP_LEVEL_CONFIG_KEYS.has(key)) {
      throw new Error(`${label}.${key} is not a supported configuration property`);
    }
  }
  if ('paths' in config && config.paths !== undefined) {
    if (!isObject(config.paths)) {
      throw new Error(`${label}.paths must be an object`);
    }
    for (const [pathKey, pathVal] of Object.entries(config.paths)) {
      if (typeof pathVal !== 'string') {
        throw new Error(`${label}.paths.${pathKey} must be a string`);
      }
    }
  }
  if ('structure' in config && config.structure !== undefined && !isObject(config.structure)) {
    throw new Error(`${label}.structure must be an object`);
  }
  if ('runtimeRoot' in config && config.runtimeRoot !== undefined) {
    if (
      config.runtimeRoot !== null &&
      (typeof config.runtimeRoot !== 'string' || config.runtimeRoot.trim().length === 0)
    ) {
      throw new Error(`${label}.runtimeRoot must be null or a non-empty string`);
    }
  }
  if ('telemetry' in config && config.telemetry !== undefined) {
    if (!isObject(config.telemetry)) {
      throw new Error(`${label}.telemetry must be an object`);
    }
    for (const key of Object.keys(config.telemetry)) {
      if (key !== 'enabled') {
        throw new Error(`${label}.telemetry.${key} is not a supported telemetry property`);
      }
    }
    if ('enabled' in config.telemetry && config.telemetry.enabled !== undefined && typeof config.telemetry.enabled !== 'boolean') {
      throw new Error(`${label}.telemetry.enabled must be a boolean`);
    }
  }
  return config;
}

/**
 * Resolve effective plan-product configuration in order:
 * bundled plugin_root defaults -> user_home (Layer #1) -> repo_root (Layer #2 override).
 */
export function resolvePlanningConfig(repoRoot, options = {}) {
  const resolvedRepoRoot = path.resolve(repoRoot);
  const pluginRoot = options.pluginRoot ? path.resolve(options.pluginRoot) : PLUGIN_ROOT;
  const userHome = options.userHome === null
    ? null
    : path.resolve(options.userHome ?? os.homedir());

  const bundledDefaults = JSON.parse(
    readFileSync(path.join(pluginRoot, 'skills/plan-product/assets/config.json'), 'utf8')
  );
  const userConfigPath = userHome
    ? path.join(userHome, '.nyssa-ai/plan-product/config.json')
    : null;
  const userConfig = userConfigPath && existsSync(userConfigPath)
    ? JSON.parse(readFileSync(userConfigPath, 'utf8'))
    : {};
  const repoConfigPath = path.join(resolvedRepoRoot, '.nyssa-ai/plan-product/config.json');
  const repoConfig = existsSync(repoConfigPath)
    ? JSON.parse(readFileSync(repoConfigPath, 'utf8'))
    : {};

  // Layer #1: user_home base defaults -> Layer #2: repo_root overrides.
  return mergeLayers(mergeLayers(bundledDefaults, userConfig), repoConfig);
}

/**
 * Resolve runtime_root following the 4-step NyssaAI precedence contract:
 * (1) explicit runtimeRoot (--runtime-root) ->
 * (2) NYSSA_RUNTIME_ROOT (namespaced to .nyssa-ai/plan-product/runtime when pointing at a persona root) ->
 * (3) agent persona cwd containing SOUL.md + IDENTITY.md (<cwd>/.nyssa-ai/plan-product/runtime) ->
 * (4) configured runtimeRoot (user_home -> repo_root) or default .nyssa-ai/plan-product/runtime/.
 */
export function resolveRuntimeRoot(repoRoot = null, options = {}) {
  const normalized = normalizeRuntimeArgs(repoRoot, options);
  const resolvedRepoRoot = normalized.repoRoot;
  const opts = normalized.options;

  if (typeof opts.runtimeRoot === 'string' && opts.runtimeRoot.trim()) {
    return path.resolve(opts.runtimeRoot.trim());
  }

  const env = opts.env ?? process.env;
  if (typeof env.NYSSA_RUNTIME_ROOT === 'string' && env.NYSSA_RUNTIME_ROOT.trim()) {
    const envDir = path.resolve(env.NYSSA_RUNTIME_ROOT.trim());
    return isPersonaWorkspace(envDir)
      ? path.join(envDir, '.nyssa-ai', 'plan-product', 'runtime')
      : envDir;
  }

  const cwd = path.resolve(opts.cwd ?? process.cwd());
  if (isPersonaWorkspace(cwd)) {
    return path.resolve(cwd, '.nyssa-ai', 'plan-product', 'runtime');
  }

  const userHome = opts.userHome === null
    ? null
    : path.resolve(opts.userHome ?? os.homedir());
  const userConfig = userHome
    ? readOptionalJsonObject(path.join(userHome, '.nyssa-ai/plan-product/config.json'))
    : null;
  const repoConfig = resolvedRepoRoot
    ? readOptionalJsonObject(path.join(resolvedRepoRoot, '.nyssa-ai/plan-product/config.json'))
    : null;

  if (isObject(opts.config) && 'runtimeRoot' in opts.config) {
    if (typeof opts.config.runtimeRoot === 'string' && opts.config.runtimeRoot.trim()) {
      const baseDir = resolvedRepoRoot ?? userHome ?? cwd;
      return path.resolve(baseDir, opts.config.runtimeRoot.trim());
    }
  } else if (repoConfig && 'runtimeRoot' in repoConfig) {
    if (typeof repoConfig.runtimeRoot === 'string' && repoConfig.runtimeRoot.trim()) {
      return path.resolve(resolvedRepoRoot, repoConfig.runtimeRoot.trim());
    }
  } else if (userConfig && typeof userConfig.runtimeRoot === 'string' && userConfig.runtimeRoot.trim()) {
    return path.resolve(userHome, userConfig.runtimeRoot.trim());
  }

  if (
    resolvedRepoRoot &&
    statSync(path.join(resolvedRepoRoot, '.nyssa-ai/plan-product'), { throwIfNoEntry: false })?.isDirectory()
  ) {
    return path.resolve(resolvedRepoRoot, '.nyssa-ai', 'plan-product', 'runtime');
  }
  const fallbackHome = userHome ?? path.resolve(os.homedir());
  return path.resolve(fallbackHome, '.nyssa-ai', 'plan-product', 'runtime');
}

/**
 * Resolve the mutable usage telemetry directory inside runtime_root (<runtime_root>/usage).
 */
export function resolveUsageTelemetryDir(repoRoot = null, options = {}) {
  return path.join(resolveRuntimeRoot(repoRoot, options), 'usage');
}

/**
 * Return true only when opt-in usage telemetry is explicitly enabled via layered user_home -> repo_root config.json.
 */
export function isUsageTelemetryEnabled(repoRoot = null, options = {}) {
  const normalized = normalizeRuntimeArgs(repoRoot, options);
  const resolvedRepoRoot = normalized.repoRoot;
  const opts = normalized.options;

  if (isObject(opts.config)) {
    return isObject(opts.config.telemetry) && opts.config.telemetry.enabled === true;
  }

  const userHome = opts.userHome === null
    ? null
    : path.resolve(opts.userHome ?? os.homedir());
  const userConfig = userHome
    ? readOptionalJsonObject(path.join(userHome, '.nyssa-ai/plan-product/config.json')) ?? {}
    : {};
  const repoConfig = resolvedRepoRoot
    ? readOptionalJsonObject(path.join(resolvedRepoRoot, '.nyssa-ai/plan-product/config.json')) ?? {}
    : {};
  const merged = mergeLayers(userConfig, repoConfig);
  return isObject(merged.telemetry) && merged.telemetry.enabled === true;
}

/**
 * Append a JSON Lines usage event to <runtime_root>/usage/events.jsonl when telemetry.enabled === true;
 * otherwise return null as a pure no-op without creating any directories or files on disk.
 */
export function recordUsageEvent(repoRoot, event, options = {}) {
  if (!isUsageTelemetryEnabled(repoRoot, options)) {
    return null;
  }
  const usageDir = resolveUsageTelemetryDir(repoRoot, options);
  mkdirSync(usageDir, { recursive: true });
  const eventsPath = path.join(usageDir, 'events.jsonl');
  appendFileSync(eventsPath, `${JSON.stringify(event)}\n`, 'utf8');
  return eventsPath;
}
