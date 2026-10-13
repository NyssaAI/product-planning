import { lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';

/**
 * @param {string} root
 * @param {string} candidate
 * @returns {boolean}
 */
export function isPathContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  );
}

/**
 * Resolve a configured path and reject escapes from the repository. Existing
 * paths are checked after symlink/junction resolution as well as lexically.
 *
 * @param {string} repoRoot
 * @param {string} configuredPath
 * @param {string} label
 * @returns {string} absolute contained path
 */
export function resolveRepoContainedPath(repoRoot, configuredPath, label) {
  if (typeof configuredPath !== 'string' || configuredPath.trim() === '') {
    throw new Error(`${label} must be a non-empty path within the project root`);
  }
  const root = path.resolve(repoRoot);
  const resolved = path.resolve(root, configuredPath);
  if (!isPathContained(root, resolved)) {
    throw new Error(`${label} must be within the project root: ${configuredPath}`);
  }
  const realRoot = realpathSync(root);
  let existingAncestor = resolved;
  // lstat sees dangling links. Treating them as absent lets later writes follow
  // the link and create its missing target outside the repository.
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
    throw new Error(`${label} cannot resolve a path within the project root: ${configuredPath}`, { cause: error });
  }
  const realTarget = path.resolve(
    realAncestor,
    path.relative(existingAncestor, resolved)
  );
  if (!isPathContained(realRoot, realTarget)) {
    throw new Error(`${label} must be within the project root: ${configuredPath}`);
  }
  return resolved;
}

/**
 * Validate a configured path and return its normalized repo-relative form.
 *
 * @param {string} repoRoot
 * @param {string} configuredPath
 * @param {string} label
 * @returns {string} repo-relative path with forward slashes
 */
export function resolveRepoRelativePath(repoRoot, configuredPath, label) {
  const resolved = resolveRepoContainedPath(repoRoot, configuredPath, label);
  return path.relative(path.resolve(repoRoot), resolved).replace(/\\/g, '/');
}
