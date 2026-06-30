import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { normalizeRoot, ownerRoot } from '../../../module-map/lib/module-ownership.mjs';
import { languageForFile } from '../source-files.mjs';

/**
 * @typedef {object} PatternReport
 * @property {string} schemaVersion
 * @property {string} generated
 * @property {{ name: string }} project
 * @property {object} source
 * @property {object} summary
 * @property {Array<object>} modules
 * @property {Array<object>} patterns
 */

/**
 * @param {string} repoRoot
 * @param {string} relPath
 * @param {string} code
 * @returns {any}
 */
export function loadJsonArtifact(repoRoot, relPath, code) {
  const fullPath = path.join(repoRoot, relPath);
  if (!existsSync(fullPath)) {
    const err = new Error(`${code}: ${relPath} not found - run /ci first`);
    err.code = code;
    throw err;
  }
  try {
    return JSON.parse(readFileSync(fullPath, 'utf8'));
  } catch (cause) {
    const invalidCode = { MISSING_CODE_MAP: 'INVALID_CODE_MAP', MISSING_MODULE_MAP: 'INVALID_MODULE_MAP' }[code]
      ?? code.replace('MISSING_', 'INVALID_');
    const err = new Error(`${invalidCode}: ${relPath} is not valid JSON`);
    err.code = invalidCode;
    err.cause = cause;
    throw err;
  }
}

/**
 * @param {object} input
 * @param {{ projectName: string, codeMapPath: string, moduleMapPath: string, languages: string[] }} input.runtime
 * @param {any} input.codeMap
 * @param {any} input.moduleMap
 * @param {import('./catalog.mjs').PatternDefinition[]} input.patterns
 * @param {import('./scanner.mjs').PatternMatch[]} input.matches
 * @param {string[]} input.sourceFiles
 * @param {string[]} input.eligibleFiles
 * @param {Array<{ extension: string, language: string | null, count: number, reason: string }>} input.excludedFiles
 * @param {string} [input.generated]
 * @returns {PatternReport}
 */
export function buildPatternReport(input) {
  const generated = input.generated ?? new Date().toISOString();
  const modules = normalizeModules(input.moduleMap);
  const resolver = createModuleResolver(input.codeMap, modules);
  const eligibleByModule = countEligibleFilesByModule(input.eligibleFiles, resolver);
  const eligibleByLanguage = countEligibleFilesByLanguage(input.eligibleFiles);
  const patternEntries = buildPatternEntries(
    input.patterns,
    input.matches,
    eligibleByLanguage,
    eligibleByModule,
    resolver
  );
  const headlineFiles = headlineCoveredFiles(input.matches);
  const coverageByConfidence = confidenceCoverage(input.matches, input.eligibleFiles.length);
  const moduleSummary = moduleCoverageSummary(eligibleByModule, input.matches, resolver);

  return {
    schemaVersion: '1.0',
    generated,
    project: { name: input.runtime.projectName },
    source: {
      codeMap: input.runtime.codeMapPath,
      moduleMap: input.runtime.moduleMapPath,
      sourceFiles: input.sourceFiles.length,
      eligibleFiles: input.eligibleFiles.length,
      excludedFiles: input.excludedFiles,
      languages: [...input.runtime.languages],
    },
    summary: {
      patternsEvaluated: input.patterns.length,
      patternsMatched: patternEntries.filter((pattern) => pattern.occurrenceCount > 0).length,
      occurrences: input.matches.length,
      coveredFiles: headlineFiles.size,
      coveragePercent: percent(headlineFiles.size, input.eligibleFiles.length),
      coverageByConfidence,
    },
    modules: moduleSummary,
    patterns: patternEntries,
  };
}

/**
 * @param {any} moduleMap
 * @returns {Array<{ id: string, name: string, root: string, planningModule?: string }>}
 */
function normalizeModules(moduleMap) {
  return Array.isArray(moduleMap?.modules)
    ? moduleMap.modules
        .filter((mod) => typeof mod?.id === 'string' && typeof mod?.root === 'string')
        .map((mod) => ({
          id: mod.id,
          name: typeof mod.name === 'string' ? mod.name : mod.id,
          root: normalizeRel(mod.root),
          planningModule:
            typeof mod.planningModule === 'string'
              ? normalizeRel(mod.planningModule)
              : undefined,
        }))
        .sort((a, b) => a.id.localeCompare(b.id))
    : [];
}

/**
 * @param {any} codeMap
 * @param {Array<{ id: string, name: string, root: string, planningModule?: string }>} modules
 */
function createModuleResolver(codeMap, modules) {
  const byFile = new Map();
  for (const file of Array.isArray(codeMap?.files) ? codeMap.files : []) {
    if (typeof file?.path === 'string' && typeof file?.moduleId === 'string') {
      byFile.set(normalizeRel(file.path), {
        id: file.moduleId,
        name: typeof file.moduleName === 'string' ? file.moduleName : file.moduleId,
        root: typeof file.moduleRoot === 'string' ? normalizeRel(file.moduleRoot) : '',
        planningModule:
          typeof file.planningModule === 'string'
            ? normalizeRel(file.planningModule)
            : undefined,
      });
    }
  }
  const byRoot = new Map(modules.map((mod) => [normalizeRoot(mod.root), mod]));
  const roots = modules.map((mod) => mod.root);

  return (filePath) => {
    const file = normalizeRel(filePath);
    const direct = byFile.get(file);
    if (direct) {
      return direct;
    }
    const root = ownerRoot(file, roots);
    if (root !== null) {
      const mod = byRoot.get(normalizeRoot(root));
      if (mod) {
        return mod;
      }
    }
    return {
      id: 'unowned',
      name: 'Unowned',
      root: '',
      planningModule: undefined,
    };
  };
}

/**
 * @param {string[]} eligibleFiles
 * @returns {Map<string, number>}
 */
function countEligibleFilesByLanguage(eligibleFiles) {
  const counts = new Map();
  for (const file of eligibleFiles) {
    const lang = languageForFile(file) ?? 'unknown';
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }
  return counts;
}

/**
 * @param {string[]} eligibleFiles
 * @param {(file: string) => { id: string, name: string, root: string, planningModule?: string }} resolveModule
 */
function countEligibleFilesByModule(eligibleFiles, resolveModule) {
  const counts = new Map();
  for (const file of eligibleFiles) {
    const mod = resolveModule(file);
    const current = counts.get(mod.id) ?? {
      id: mod.id,
      name: mod.name,
      root: mod.root,
      planningModule: mod.planningModule,
      eligibleFiles: 0,
    };
    current.eligibleFiles += 1;
    counts.set(mod.id, current);
  }
  return counts;
}

/**
 * @param {import('./catalog.mjs').PatternDefinition[]} patterns
 * @param {import('./scanner.mjs').PatternMatch[]} matches
 * @param {Map<string, number>} eligibleByLanguage
 * @param {Map<string, any>} eligibleByModule
 * @param {(file: string) => { id: string, name: string, root: string, planningModule?: string }} resolveModule
 */
function buildPatternEntries(
  patterns,
  matches,
  eligibleByLanguage,
  eligibleByModule,
  resolveModule
) {
  const matchesByPattern = groupBy(matches, (match) => match.patternId);
  return patterns
    .map((pattern) => {
      const patternMatches = matchesByPattern.get(pattern.id) ?? [];
      const fileSet = new Set(patternMatches.map((match) => match.file));
      const langEligibleCount = eligibleByLanguage.get(pattern.language) ?? 0;
      return {
        id: pattern.id,
        name: pattern.name,
        language: pattern.language,
        confidence: pattern.confidence,
        includeInHeadline: pattern.includeInHeadline,
        description: pattern.description,
        source: pattern.source,
        occurrenceCount: patternMatches.length,
        fileCount: fileSet.size,
        coveragePercent: percent(fileSet.size, langEligibleCount),
        modules: moduleEntriesForPattern(patternMatches, eligibleByModule, resolveModule),
        examples: patternMatches.slice(0, 5).map((match) => ({
          file: match.file,
          line: match.line,
          moduleId: resolveModule(match.file).id,
        })),
      };
    })
    .sort((a, b) => {
      if (b.occurrenceCount !== a.occurrenceCount) {
        return b.occurrenceCount - a.occurrenceCount;
      }
      return a.id.localeCompare(b.id);
    });
}

/**
 * @param {import('./scanner.mjs').PatternMatch[]} matches
 * @param {Map<string, any>} eligibleByModule
 * @param {(file: string) => { id: string, name: string, root: string, planningModule?: string }} resolveModule
 */
function moduleEntriesForPattern(matches, eligibleByModule, resolveModule) {
  const byModule = new Map();
  for (const match of matches) {
    const mod = resolveModule(match.file);
    const current =
      byModule.get(mod.id) ?? {
        id: mod.id,
        name: mod.name,
        root: mod.root,
        planningModule: mod.planningModule,
        occurrenceCount: 0,
        files: new Set(),
      };
    current.occurrenceCount += 1;
    current.files.add(match.file);
    byModule.set(mod.id, current);
  }

  return [...byModule.values()]
    .map((entry) => {
      const denominator = eligibleByModule.get(entry.id)?.eligibleFiles ?? 0;
      return {
        id: entry.id,
        name: entry.name,
        root: entry.root,
        planningModule: entry.planningModule,
        fileCount: entry.files.size,
        occurrenceCount: entry.occurrenceCount,
        coveragePercent: percent(entry.files.size, denominator),
      };
    })
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount || a.id.localeCompare(b.id));
}

/**
 * @param {Map<string, any>} eligibleByModule
 * @param {import('./scanner.mjs').PatternMatch[]} matches
 * @param {(file: string) => { id: string, name: string, root: string, planningModule?: string }} resolveModule
 */
function moduleCoverageSummary(eligibleByModule, matches, resolveModule) {
  const matchedFilesByModule = new Map();
  for (const match of matches) {
    if (match.confidence === 'intent-only' || !match.includeInHeadline) {
      continue;
    }
    const mod = resolveModule(match.file);
    const files = matchedFilesByModule.get(mod.id) ?? new Set();
    files.add(match.file);
    matchedFilesByModule.set(mod.id, files);
  }
  return [...eligibleByModule.values()]
    .map((entry) => {
      const files = matchedFilesByModule.get(entry.id) ?? new Set();
      return {
        id: entry.id,
        name: entry.name,
        root: entry.root,
        planningModule: entry.planningModule,
        eligibleFiles: entry.eligibleFiles,
        coveredFiles: files.size,
        coveragePercent: percent(files.size, entry.eligibleFiles),
      };
    })
    .sort((a, b) => b.coveragePercent - a.coveragePercent || a.id.localeCompare(b.id));
}

/**
 * @param {import('./scanner.mjs').PatternMatch[]} matches
 * @returns {Set<string>}
 */
function headlineCoveredFiles(matches) {
  return new Set(
    matches
      .filter(
        (match) =>
          match.includeInHeadline &&
          (match.confidence === 'high' || match.confidence === 'medium')
      )
      .map((match) => match.file)
  );
}

/**
 * @param {import('./scanner.mjs').PatternMatch[]} matches
 * @param {number} denominator
 */
function confidenceCoverage(matches, denominator) {
  return Object.fromEntries(
    ['high', 'medium', 'intent-only'].map((confidence) => {
      const tierMatches = matches.filter((match) => match.confidence === confidence);
      const files = new Set(tierMatches.map((match) => match.file));
      const includedInHeadline =
        confidence !== 'intent-only' && tierMatches.some((match) => match.includeInHeadline);
      return [
        confidence,
        {
          files: files.size,
          percent: percent(files.size, denominator),
          includedInHeadline,
        },
      ];
    })
  );
}

/**
 * @template T
 * @param {T[]} values
 * @param {(value: T) => string} keyFn
 * @returns {Map<string, T[]>}
 */
function groupBy(values, keyFn) {
  const groups = new Map();
  for (const value of values) {
    const key = keyFn(value);
    const group = groups.get(key) ?? [];
    group.push(value);
    groups.set(key, group);
  }
  return groups;
}

/**
 * @param {number} numerator
 * @param {number} denominator
 * @returns {number}
 */
function percent(numerator, denominator) {
  return denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeRel(value) {
  return String(value ?? '').replace(/\\/g, '/').replace(/\/$/, '');
}
