import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const LANGUAGE_GLOBS = {
  TypeScript: ['*.ts', '*.tsx', '*.mts', '*.cts'],
  JavaScript: ['*.js', '*.jsx', '*.mjs', '*.cjs'],
  CSharp: ['*.cs'],
  Python: ['*.py'],
  Go: ['*.go'],
};

/**
 * @param {import('./catalog.mjs').PatternDefinition[]} patterns
 * @returns {{ dir: string, configPath: string }}
 */
export function writeTempAstGrepConfig(patterns) {
  const dir = mkdtempSync(path.join(tmpdir(), 'plan-product-patterns-'));
  try {
    const rulesDir = path.join(dir, 'rules');
    mkdirSync(rulesDir, { recursive: true });

    for (const pattern of patterns) {
      writeFileSync(
        path.join(rulesDir, `${pattern.id}.yml`),
        renderRule(pattern),
        'utf8'
      );
    }

    const languages = [...new Set(patterns.map((pattern) => pattern.language))]
      .filter((language) => LANGUAGE_GLOBS[language])
      .sort();
    const config = {
      ruleDirs: ['rules'],
      languageGlobs: Object.fromEntries(
        languages.map((language) => [language, LANGUAGE_GLOBS[language]])
      ),
    };
    const configPath = path.join(dir, 'sgconfig.yml');
    writeFileSync(configPath, yaml(config), 'utf8');

    return { dir, configPath };
  } catch (err) {
    rmSync(dir, { recursive: true, force: true });
    throw err;
  }
}

/**
 * @param {{ dir: string }} tempConfig
 */
export function cleanupTempAstGrepConfig(tempConfig) {
  rmSync(tempConfig.dir, { recursive: true, force: true });
}

/**
 * @param {import('./catalog.mjs').PatternDefinition} pattern
 * @returns {string}
 */
function renderRule(pattern) {
  return yaml({
    id: pattern.id,
    message: pattern.name,
    severity: 'info',
    language: pattern.language,
    metadata: {
      patternId: pattern.id,
      patternName: pattern.name,
      confidence: pattern.confidence,
      includeInHeadline: String(pattern.includeInHeadline),
      familyId: pattern.familyId ?? '',
      familyName: pattern.familyName ?? '',
      patternKind: pattern.kind ?? '',
    },
    rule: astGrepRule(pattern.rule),
  });
}

/**
 * ast-grep requires a concrete node kind. Catalog regex detectors are intended
 * as broad name-based evidence, so scan identifiers when they do not provide a
 * structural kind or pattern of their own.
 *
 * @param {Record<string, unknown>} rule
 * @returns {Record<string, unknown>}
 */
function astGrepRule(rule) {
  if (
    rule &&
    typeof rule === 'object' &&
    typeof rule.regex === 'string' &&
    !rule.kind &&
    !rule.pattern &&
    !rule.all &&
    !rule.any &&
    !rule.inside &&
    !rule.has
  ) {
    return { kind: 'identifier', regex: rule.regex };
  }
  return rule;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function yaml(value) {
  return `${yamlValue(value, 0).join('\n')}\n`;
}

/**
 * @param {unknown} value
 * @param {number} indent
 * @returns {string[]}
 */
function yamlValue(value, indent) {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (isScalar(entry)) {
        return [`${pad}- ${formatScalar(entry)}`];
      }
      return [`${pad}-`, ...yamlValue(entry, indent + 2)];
    });
  }
  if (value && typeof value === 'object') {
    return Object.entries(/** @type {Record<string, unknown>} */ (value)).flatMap(
      ([key, entry]) => {
        const qKey = quoteYamlKey(key);
        if (isScalar(entry)) {
          return [`${pad}${qKey}: ${formatScalar(entry)}`];
        }
        return [`${pad}${qKey}:`, ...yamlValue(entry, indent + 2)];
      }
    );
  }
  return [`${pad}${formatScalar(value)}`];
}

/**
 * @param {string} key
 * @returns {string}
 */
function quoteYamlKey(key) {
  if (/[:{}\[\]#&*!|>'"%@`,\s]/.test(key)) {
    return JSON.stringify(key);
  }
  return key;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isScalar(value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatScalar(value) {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(String(value));
}
