import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { loadCodeMapConfig } from '../code-map-config.mjs';
import { loadCodeIndexerConfig } from '../../../module-map/lib/config.mjs';

/**
 * @typedef {object} PatternRuntimeConfig
 * @property {string} projectName
 * @property {string} outputDir
 * @property {string} codeMapPath
 * @property {string} moduleMapPath
 * @property {string[]} roots
 * @property {string[]} languages
 * @property {string[]} catalogs
 * @property {string[]} warnings
 */

/**
 * @param {string} repoRoot
 * @returns {PatternRuntimeConfig}
 */
export function loadPatternRuntimeConfig(repoRoot) {
  const indexer = loadCodeIndexerConfig(repoRoot);
  const codeMap = loadCodeMapConfig(repoRoot);
  const raw = readRawConfig(repoRoot);
  const catalogs = Array.isArray(raw.patterns?.catalogs)
    ? raw.patterns.catalogs.filter((entry) => typeof entry === 'string')
    : [];

  return {
    projectName: indexer.projectName,
    outputDir: normalizeRel(indexer.outputDir),
    codeMapPath: normalizeRel(codeMap.output),
    moduleMapPath: normalizeRel(path.posix.join(normalizeRel(indexer.outputDir), 'module-map.json')),
    roots: [...codeMap.roots],
    languages: [...codeMap.languages],
    catalogs,
    warnings: moduleMapCodeMapWarning(repoRoot, indexer.outputDir, codeMap.output),
  };
}

/**
 * @param {string} repoRoot
 * @returns {Record<string, any>}
 */
function readRawConfig(repoRoot) {
  const configPath = path.join(repoRoot, 'code-indexer.config.json');
  if (!existsSync(configPath)) {
    return {};
  }
  return JSON.parse(readFileSync(configPath, 'utf8'));
}

/**
 * @param {string} repoRoot
 * @param {string} outputDir
 * @param {string} codeMapPath
 * @returns {string[]}
 */
function moduleMapCodeMapWarning(repoRoot, outputDir, codeMapPath) {
  const moduleMapPath = path.join(repoRoot, outputDir, 'module-map.json');
  if (!existsSync(moduleMapPath)) {
    return [];
  }
  try {
    const moduleMap = JSON.parse(readFileSync(moduleMapPath, 'utf8'));
    if (
      typeof moduleMap.codeMap === 'string' &&
      normalizeRel(moduleMap.codeMap) !== normalizeRel(codeMapPath)
    ) {
      return [
        `CODE_MAP_PATH_MISMATCH: module-map.json references ${normalizeRel(moduleMap.codeMap)} but code-map config writes ${normalizeRel(codeMapPath)}`,
      ];
    }
  } catch {
    return [];
  }
  return [];
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeRel(value) {
  return String(value ?? '').replace(/\\/g, '/').replace(/\/$/, '');
}
