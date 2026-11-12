// Responsibility: Enforce repo_root path containment, user_home -> repo_root configuration precedence, and runtime_root telemetry resolution.
// Public interface:
// +-- isPathContained(repoRoot, candidate)
// +-- resolveRepoContainedPath(repoRoot, configuredPath, label)
// +-- resolveRepoRelativePath(repoRoot, configuredPath, label)
// +-- resolvePlanningConfig(repoRoot, options)
// +-- resolveRuntimeRoot(options)
// `-- resolveUsageTelemetryDir(options)

import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
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
 * (1) explicit runtimeRoot (--runtime-root) -> (2) NYSSA_RUNTIME_ROOT ->
 * (3) agent persona cwd containing SOUL.md + IDENTITY.md ->
 * (4) configured runtimeRoot (user_home -> repo_root) or default .nyssa-ai/plan-product/runtime/.
 */
export function resolveRuntimeRoot(options = {}) {
  if (typeof options.runtimeRoot === 'string' && options.runtimeRoot.trim()) {
    return path.resolve(options.runtimeRoot.trim());
  }
  const env = options.env ?? process.env;
  if (typeof env.NYSSA_RUNTIME_ROOT === 'string' && env.NYSSA_RUNTIME_ROOT.trim()) {
    return path.resolve(env.NYSSA_RUNTIME_ROOT.trim());
  }
  const cwd = path.resolve(options.cwd ?? process.cwd());
  if (existsSync(path.join(cwd, 'SOUL.md')) && existsSync(path.join(cwd, 'IDENTITY.md'))) {
    return cwd;
  }
  const userHome = path.resolve(options.userHome ?? os.homedir());
  const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : null;
  // Check repo_root override first (Layer #2), then user_home base (Layer #1).
  for (const candidateBase of [
    repoRoot ? path.join(repoRoot, '.nyssa-ai/plan-product/config.json') : null,
    path.join(userHome, '.nyssa-ai/plan-product/config.json'),
  ]) {
    if (candidateBase && existsSync(candidateBase)) {
      try {
        const parsed = JSON.parse(readFileSync(candidateBase, 'utf8'));
        if (typeof parsed.runtimeRoot === 'string' && parsed.runtimeRoot.trim()) {
          return path.isAbsolute(parsed.runtimeRoot)
            ? path.resolve(parsed.runtimeRoot)
            : path.resolve(path.dirname(path.dirname(path.dirname(candidateBase))), parsed.runtimeRoot);
        }
      } catch {
        // Fall through to default runtime_root directory when config is unreadable.
      }
    }
  }
  if (repoRoot && existsSync(path.join(repoRoot, '.nyssa-ai/plan-product'))) {
    return path.join(repoRoot, '.nyssa-ai/plan-product/runtime');
  }
  return path.join(userHome, '.nyssa-ai/plan-product/runtime');
}

/**
 * Resolve the mutable usage telemetry directory inside runtime_root (.nyssa-ai/plan-product/runtime/usage/).
 */
export function resolveUsageTelemetryDir(options = {}) {
  const rtRoot = resolveRuntimeRoot(options);
  return path.basename(rtRoot) === 'runtime'
    ? path.join(rtRoot, 'usage')
    : path.join(rtRoot, '.nyssa-ai/plan-product/runtime/usage');
}
