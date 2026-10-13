import { resolveGeneratorConfigPath } from '../../../lib/generator-config.mjs';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { loadCodeMapConfig } from '../code-map-config.mjs';
import { loadPlanProductConfig } from '../../../module-map/lib/config.mjs';

/**
 * @typedef {object} PatternRuntimeConfig
 * @property {string} projectName
 * @property {string} outputDir
 * @property {string} codeMapPath
 * @property {string} moduleMapPath
 * @property {string[]} roots
 * @property {string[]} languages
 * @property {string[]} catalogs
 * @property {string | null} patternLibraryPath
 * @property {string | null} patternExpectationsPath
 * @property {Array<object>} expectations
 * @property {string[]} warnings
 */

/**
 * @param {string} repoRoot
 * @returns {PatternRuntimeConfig}
 */
export function loadPatternRuntimeConfig(repoRoot) {
  const planProduct = loadPlanProductConfig(repoRoot);
  const codeMap = loadCodeMapConfig(repoRoot);
  const raw = readRawConfig(repoRoot);
  const pathConfig = readPlanProductPathConfig(repoRoot);
  const patternLibraryPath = planProductPatternPath(
    pathConfig,
    'patternLibrary',
    'library',
    '.plan-product/patterns/library.json'
  );
  const patternExpectationsPath = planProductPatternPath(
    pathConfig,
    'patternExpectations',
    'expectations',
    '.plan-product/patterns/expectations.json'
  );
  const planProductCatalogs = existsSync(path.join(repoRoot, patternLibraryPath))
    ? [patternLibraryPath]
    : [];
  const catalogs = Array.isArray(raw.patterns?.catalogs)
    ? raw.patterns.catalogs.filter((entry) => typeof entry === 'string')
    : [];
  const expectations = loadExpectations(repoRoot, patternExpectationsPath);

  return {
    projectName: planProduct.projectName,
    outputDir: normalizeRel(planProduct.outputDir),
    codeMapPath: normalizeRel(codeMap.output),
    moduleMapPath: normalizeRel(path.posix.join(normalizeRel(planProduct.outputDir), 'module-map.json')),
    roots: [...codeMap.roots],
    languages: [...codeMap.languages],
    catalogs: [...planProductCatalogs, ...catalogs],
    patternLibraryPath: planProductCatalogs.length > 0 ? patternLibraryPath : null,
    patternExpectationsPath: expectations.length > 0 ? patternExpectationsPath : null,
    expectations,
    warnings: moduleMapCodeMapWarning(repoRoot, planProduct.outputDir, codeMap.output),
  };
}

/**
 * @param {string} repoRoot
 * @returns {Record<string, any>}
 */
function readRawConfig(repoRoot) {
  const configPath = resolveGeneratorConfigPath(repoRoot);
  if (!existsSync(configPath)) {
    return {};
  }
  return JSON.parse(readFileSync(configPath, 'utf8'));
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
  return JSON.parse(readFileSync(configPath, 'utf8'));
}

/**
 * @param {Record<string, any> | null} config
 * @param {string} pathKey
 * @param {string} structureKey
 * @param {string} fallback
 * @returns {string}
 */
function planProductPatternPath(config, pathKey, structureKey, fallback) {
  const paths = config?.paths ?? {};
  const patterns = config?.structure?.patterns ?? {};
  const value =
    typeof paths[pathKey] === 'string'
      ? paths[pathKey]
      : typeof patterns[structureKey] === 'string'
        ? patterns[structureKey]
        : fallback;
  return normalizeRel(value);
}

/**
 * @param {string} repoRoot
 * @param {string} relPath
 * @returns {Array<object>}
 */
function loadExpectations(repoRoot, relPath) {
  const fullPath = path.join(repoRoot, relPath);
  if (!existsSync(fullPath)) {
    return [];
  }
  const raw = JSON.parse(readFileSync(fullPath, 'utf8'));
  return Array.isArray(raw?.expectations)
    ? raw.expectations.filter((entry) => entry && typeof entry === 'object')
    : [];
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
