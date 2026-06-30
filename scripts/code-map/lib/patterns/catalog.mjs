import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUPPORTED_LANGUAGES } from '../code-map-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILTIN_CATALOG_DIR = path.resolve(__dirname, '../../patterns');
const CONFIDENCE_TIERS = new Set(['high', 'medium', 'intent-only']);
const SUPPORTED_LANGUAGE_SET = new Set(SUPPORTED_LANGUAGES);

/**
 * @typedef {object} PatternDefinition
 * @property {string} id
 * @property {string} name
 * @property {string} language
 * @property {'high' | 'medium' | 'intent-only'} confidence
 * @property {string} description
 * @property {Record<string, unknown>} rule
 * @property {boolean} includeInHeadline
 * @property {string} source
 * @property {string[]} tags
 * @property {string | undefined} notes
 */

/**
 * @param {string} repoRoot
 * @param {{ catalogs?: string[] }} config
 * @returns {{ patterns: PatternDefinition[], warnings: string[] }}
 */
export function loadPatternCatalogs(repoRoot, config = {}) {
  const warnings = [];
  const normalizedRoot = path.resolve(repoRoot);
  const catalogPaths = [
    ...builtinCatalogPaths(),
    ...(config.catalogs ?? []).map((relPath) => {
      const resolved = path.resolve(repoRoot, relPath);
      if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path.sep)) {
        throw patternCatalogError(
          `INVALID_PATTERN_CATALOG: catalog path must be within the project root`,
          'INVALID_PATTERN_CATALOG'
        );
      }
      return resolved;
    }),
  ];
  /** @type {PatternDefinition[]} */
  const patterns = [];

  for (const catalogPath of catalogPaths) {
    const rel = toRelative(repoRoot, catalogPath);
    if (!existsSync(catalogPath)) {
      throw patternCatalogError(
        `MISSING_PATTERN_CATALOG: ${rel} not found`,
        'MISSING_PATTERN_CATALOG'
      );
    }
    let raw;
    try {
      raw = JSON.parse(readFileSync(catalogPath, 'utf8'));
    } catch (cause) {
      const err = patternCatalogError(
        `INVALID_PATTERN_CATALOG: ${rel} is not valid JSON`,
        'INVALID_PATTERN_CATALOG'
      );
      err.cause = cause;
      throw err;
    }

    const entries = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.patterns)
        ? raw.patterns
        : null;
    if (!entries) {
      throw patternCatalogError(
        `INVALID_PATTERN_CATALOG: ${rel} must contain a patterns array`,
        'INVALID_PATTERN_CATALOG'
      );
    }
    if (entries.length === 0) {
      warnings.push(`EMPTY_PATTERN_CATALOG: ${rel} contains no patterns`);
      continue;
    }
    patterns.push(
      ...entries.map((entry, index) =>
        normalizePattern(entry, {
          source: rel,
          index,
        })
      )
    );
  }

  const deduped = validateDuplicateIds(patterns, warnings);
  return {
    patterns: deduped.sort((a, b) => a.id.localeCompare(b.id)),
    warnings,
  };
}

/**
 * @returns {string[]}
 */
function builtinCatalogPaths() {
  if (!existsSync(BUILTIN_CATALOG_DIR)) {
    return [];
  }
  return readdirSync(BUILTIN_CATALOG_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => path.join(BUILTIN_CATALOG_DIR, file));
}

/**
 * @param {unknown} input
 * @param {{ source: string, index: number }} context
 * @returns {PatternDefinition}
 */
function normalizePattern(input, context) {
  const source =
    input && typeof input === 'object'
      ? /** @type {Record<string, unknown>} */ (input)
      : {};
  const at = `${context.source}#${context.index + 1}`;
  const id = requireString(source.id, at, 'id');
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    throw patternCatalogError(
      `INVALID_PATTERN_CATALOG: ${at} id must be a lowercase slug`,
      'INVALID_PATTERN_CATALOG'
    );
  }
  const language = requireString(source.language, at, 'language');
  if (!SUPPORTED_LANGUAGE_SET.has(language)) {
    throw patternCatalogError(
      `INVALID_PATTERN_CATALOG: ${at} uses unsupported language ${language}`,
      'INVALID_PATTERN_CATALOG'
    );
  }
  const confidence = requireString(source.confidence, at, 'confidence');
  if (!CONFIDENCE_TIERS.has(confidence)) {
    throw patternCatalogError(
      `INVALID_PATTERN_CATALOG: ${at} confidence must be high, medium, or intent-only`,
      'INVALID_PATTERN_CATALOG'
    );
  }
  if (!source.rule || typeof source.rule !== 'object' || Array.isArray(source.rule)) {
    throw patternCatalogError(
      `INVALID_PATTERN_CATALOG: ${at} must include a rule object`,
      'INVALID_PATTERN_CATALOG'
    );
  }

  return {
    id,
    name: requireString(source.name, at, 'name'),
    language,
    confidence: /** @type {'high' | 'medium' | 'intent-only'} */ (confidence),
    description: requireString(source.description, at, 'description'),
    rule: /** @type {Record<string, unknown>} */ (source.rule),
    includeInHeadline: source.includeInHeadline === false ? false : true,
    source: context.source,
    tags: Array.isArray(source.tags)
      ? source.tags.filter((entry) => typeof entry === 'string')
      : [],
    notes: typeof source.notes === 'string' ? source.notes : undefined,
  };
}

/**
 * @param {unknown} value
 * @param {string} at
 * @param {string} field
 * @returns {string}
 */
function requireString(value, at, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw patternCatalogError(
      `INVALID_PATTERN_CATALOG: ${at} missing ${field}`,
      'INVALID_PATTERN_CATALOG'
    );
  }
  return value;
}

/**
 * @param {PatternDefinition[]} patterns
 * @param {string[]} warnings
 * @returns {PatternDefinition[]}
 */
function validateDuplicateIds(patterns, warnings) {
  /** @type {Map<string, number>} */
  const seen = new Map();
  /** @type {PatternDefinition[]} */
  const result = [];
  for (const pattern of patterns) {
    const existingIdx = seen.get(pattern.id);
    if (existingIdx !== undefined) {
      const existing = result[existingIdx];
      if (existing.source === pattern.source) {
        throw patternCatalogError(
          `INVALID_PATTERN_CATALOG: duplicate pattern id ${pattern.id} in ${existing.source}`,
          'INVALID_PATTERN_CATALOG'
        );
      }
      warnings.push(
        `OVERRIDDEN_PATTERN: pattern id "${pattern.id}" from ${existing.source} overridden by ${pattern.source}`
      );
      result[existingIdx] = pattern;
    } else {
      seen.set(pattern.id, result.length);
      result.push(pattern);
    }
  }
  return result;
}

/**
 * @param {string} message
 * @param {string} code
 */
function patternCatalogError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * @param {string} repoRoot
 * @param {string} fullPath
 * @returns {string}
 */
function toRelative(repoRoot, fullPath) {
  const rel = path.relative(repoRoot, fullPath).replace(/\\/g, '/');
  return rel.startsWith('..') ? fullPath.replace(/\\/g, '/') : rel;
}
