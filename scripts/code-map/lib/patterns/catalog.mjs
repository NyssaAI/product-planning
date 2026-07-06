import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUPPORTED_LANGUAGES } from '../code-map-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILTIN_CATALOG_DIR = path.resolve(__dirname, '../../patterns');
const CONFIDENCE_TIERS = new Set(['high', 'medium', 'intent-only']);
const SUPPORTED_LANGUAGE_SET = new Set(SUPPORTED_LANGUAGES);
const REGEX_RULE_KINDS_BY_LANGUAGE = {
  JavaScript: [
    'identifier',
    'property_identifier',
    'member_expression',
    'call_expression',
    'method_definition',
    'class_declaration',
    'function_declaration',
  ],
  TypeScript: [
    'identifier',
    'property_identifier',
    'member_expression',
    'call_expression',
    'method_definition',
    'class_declaration',
    'function_declaration',
  ],
  CSharp: [
    'identifier',
    'member_access_expression',
    'invocation_expression',
    'method_declaration',
    'class_declaration',
  ],
  Java: [
    'identifier',
    'field_access',
    'method_invocation',
    'method_declaration',
    'class_declaration',
  ],
  Python: [
    'identifier',
    'attribute',
    'call',
    'function_definition',
    'class_definition',
  ],
  Go: [
    'identifier',
    'type_identifier',
    'field_identifier',
    'selector_expression',
    'function_declaration',
    'method_declaration',
  ],
};

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
 * @property {string | undefined} familyId
 * @property {string | undefined} familyName
 * @property {string | undefined} familyIntent
 * @property {string | undefined} kind
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

    const entries = entriesFromCatalog(raw);
    if (!entries) {
      throw patternCatalogError(
        `INVALID_PATTERN_CATALOG: ${rel} must contain a patterns or families array`,
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
 * @param {unknown} raw
 * @returns {unknown[] | null}
 */
function entriesFromCatalog(raw) {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (Array.isArray(raw?.patterns)) {
    return raw.patterns;
  }
  if (Array.isArray(raw?.families)) {
    return raw.families.flatMap((family, familyIndex) =>
      detectorsFromFamily(family, familyIndex)
    );
  }
  return null;
}

/**
 * @param {unknown} input
 * @param {number} familyIndex
 * @returns {Record<string, unknown>[]}
 */
function detectorsFromFamily(input, familyIndex) {
  const family =
    input && typeof input === 'object'
      ? /** @type {Record<string, unknown>} */ (input)
      : {};
  const familyId = typeof family.id === 'string' ? family.id : `family-${familyIndex + 1}`;
  const familyName = typeof family.name === 'string' ? family.name : familyId;
  const familyTags = Array.isArray(family.tags)
    ? family.tags.filter((entry) => typeof entry === 'string')
    : [];
  const base = {
    familyId,
    familyName,
    familyIntent: typeof family.intent === 'string' ? family.intent : undefined,
    kind: typeof family.kind === 'string' ? family.kind : undefined,
  };

  /** @type {Record<string, unknown>[]} */
  const detectors = [];
  if (Array.isArray(family.detectors)) {
    for (const detector of family.detectors) {
      detectors.push(
        ...normalizeFamilyDetector(detector, {
          ...base,
          familyTags,
        })
      );
    }
  }
  if (family.languages && typeof family.languages === 'object' && !Array.isArray(family.languages)) {
    for (const [language, languageDetectors] of Object.entries(family.languages)) {
      if (!Array.isArray(languageDetectors)) {
        continue;
      }
      for (const detector of languageDetectors) {
        detectors.push(
          ...normalizeFamilyDetector(detector, {
            ...base,
            familyTags,
            language,
          })
        );
      }
    }
  }
  return detectors;
}

/**
 * @param {unknown} input
 * @param {{ familyId: string, familyName: string, familyIntent?: string, kind?: string, familyTags: string[], language?: string }} context
 * @returns {Record<string, unknown>[]}
 */
function normalizeFamilyDetector(input, context) {
  const detector =
    input && typeof input === 'object'
      ? /** @type {Record<string, unknown>} */ (input)
      : {};
  const detectorId =
    typeof detector.id === 'string' ? detector.id : 'detector';
  const languages = Array.isArray(detector.languages)
    ? detector.languages.filter((entry) => typeof entry === 'string')
    : typeof detector.language === 'string'
      ? [detector.language]
      : typeof context.language === 'string'
        ? [context.language]
        : [];
  const tags = [
    context.familyId,
    ...(context.kind ? [context.kind] : []),
    ...context.familyTags,
    ...(Array.isArray(detector.tags)
      ? detector.tags.filter((entry) => typeof entry === 'string')
      : []),
  ];
  return languages.map((language) => ({
    id: `${context.familyId}-${detectorId}-${language.toLowerCase()}`,
    name:
      typeof detector.name === 'string'
        ? `${context.familyName}: ${detector.name}`
        : context.familyName,
    language,
    confidence: detector.confidence,
    description:
      typeof detector.description === 'string'
        ? detector.description
        : context.familyIntent,
    rule: detector.rule,
    includeInHeadline: detector.includeInHeadline,
    tags,
    notes: detector.notes,
    familyId: context.familyId,
    familyName: context.familyName,
    familyIntent: context.familyIntent,
    kind: context.kind,
  }));
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
  const rule = normalizeRule(
    /** @type {Record<string, unknown>} */ (source.rule),
    language
  );

  return {
    id,
    name: requireString(source.name, at, 'name'),
    language,
    confidence: /** @type {'high' | 'medium' | 'intent-only'} */ (confidence),
    description: requireString(source.description, at, 'description'),
    rule,
    includeInHeadline: source.includeInHeadline === false ? false : true,
    source: context.source,
    tags: Array.isArray(source.tags)
      ? source.tags.filter((entry) => typeof entry === 'string')
      : [],
    familyId: typeof source.familyId === 'string' ? source.familyId : undefined,
    familyName: typeof source.familyName === 'string' ? source.familyName : undefined,
    familyIntent: typeof source.familyIntent === 'string' ? source.familyIntent : undefined,
    kind: typeof source.kind === 'string' ? source.kind : undefined,
    notes: typeof source.notes === 'string' ? source.notes : undefined,
  };
}

/**
 * @param {Record<string, unknown>} rule
 * @param {string} language
 * @returns {Record<string, unknown>}
 */
function normalizeRule(rule, language) {
  const keys = Object.keys(rule);
  if (keys.length === 1 && typeof rule.regex === 'string') {
    return regexRuleForLanguage(language, rule.regex);
  }
  return rule;
}

/**
 * @param {string} language
 * @param {string} regex
 * @returns {Record<string, unknown>}
 */
function regexRuleForLanguage(language, regex) {
  const kinds = REGEX_RULE_KINDS_BY_LANGUAGE[language] ?? ['identifier'];
  if (kinds.length === 1) {
    return { kind: kinds[0], regex };
  }
  return {
    any: kinds.map((kind) => ({ kind, regex })),
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
