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
    const err = new Error(`${code}: ${relPath} not found - run map-code first`);
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
 * @param {{ projectName: string, codeMapPath: string, moduleMapPath: string, languages: string[], roots?: string[], expectations?: Array<object>, patternLibraryPath?: string | null, patternExpectationsPath?: string | null }} input.runtime
 * @param {any} input.codeMap
 * @param {any} input.moduleMap
 * @param {import('./catalog.mjs').PatternDefinition[]} input.patterns
 * @param {import('./scanner.mjs').PatternMatch[]} input.matches
 * @param {string[]} input.sourceFiles
 * @param {string[]} input.eligibleFiles
 * @param {Record<string, number>} [input.sourceLineCounts]
 * @param {Array<{ extension: string, language: string | null, count: number, reason: string }>} input.excludedFiles
 * @param {string} [input.generated]
 * @returns {PatternReport}
 */
export function buildPatternReport(input) {
  const generated = input.generated ?? new Date().toISOString();
  const modules = normalizeModules(input.moduleMap);
  const resolver = createModuleResolver(input.codeMap, modules);
  const moduleEvidence = buildModuleEvidence(
    input.eligibleFiles,
    input.matches,
    modules,
    resolver,
    input.sourceLineCounts ?? {}
  );
  const eligibleByModule = countEligibleFilesByModule(moduleEvidence);
  const eligibleByLanguage = countEligibleFilesByLanguage(input.eligibleFiles);
  const patternEntries = buildPatternEntries(
    input.patterns,
    input.matches,
    eligibleByLanguage,
    eligibleByModule,
    resolver,
    moduleEvidence,
    input.runtime.expectations ?? []
  );
  const headlineFiles = headlineCoveredFiles(input.matches);
  const coverageByConfidence = confidenceCoverage(input.matches, input.eligibleFiles.length);
  const moduleSummary = modulePatternSummary(
    moduleEvidence,
    input.patterns,
    input.runtime.expectations ?? []
  );

  return {
    schemaVersion: '1.2',
    generated,
    interpretation: 'Matches locate code that may use known patterns. Confidence describes detector evidence, not design correctness. Coverage is descriptive, not a quality score; no match does not establish that a pattern is absent.',
    project: { name: input.runtime.projectName },
    source: {
      codeMap: input.runtime.codeMapPath,
      moduleMap: input.runtime.moduleMapPath,
      outputDir: input.runtime.outputDir,
      freshness: input.runtime.freshness,
      sourceFiles: input.sourceFiles.length,
      eligibleFiles: input.eligibleFiles.length,
      eligibleLines: totalEligibleLines(moduleEvidence),
      excludedFiles: input.excludedFiles,
      languages: [...input.runtime.languages],
      roots: Array.isArray(input.runtime.roots) ? [...input.runtime.roots] : [],
      patternLibrary: input.runtime.patternLibraryPath ?? null,
      patternExpectations: input.runtime.patternExpectationsPath ?? null,
    },
    summary: {
      patternsEvaluated: input.patterns.length,
      patternsMatched: patternEntries.filter((pattern) => pattern.occurrenceCount > 0).length,
      occurrences: input.matches.length,
      coveredFiles: headlineFiles.size,
      coveragePercent: percent(headlineFiles.size, input.eligibleFiles.length),
      patternLines: totalPatternLines(moduleSummary),
      patternLinePercent: percent(
        totalPatternLines(moduleSummary),
        totalEligibleLines(moduleEvidence)
      ),
      coverageByConfidence,
      modulesWithPatternEvidence: moduleSummary.filter(
        (mod) => mod.coveredFiles > 0
      ).length,
      modulesWithoutPatternEvidence: moduleSummary.filter(
        (mod) => mod.eligibleFiles > 0 && mod.coveredFiles === 0
      ).length,
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
        description:
          typeof mod.description === 'string'
            ? mod.description
            : undefined,
        capabilities: Array.isArray(mod.capabilities)
          ? mod.capabilities.filter((entry) => typeof entry === 'string')
          : [],
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
  const byId = new Map(modules.map((mod) => [mod.id, mod]));
  for (const file of Array.isArray(codeMap?.files) ? codeMap.files : []) {
    if (typeof file?.path === 'string' && typeof file?.moduleId === 'string') {
      byFile.set(normalizeRel(file.path), byId.get(file.moduleId) ?? {
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
 * @param {Map<string, any>} moduleEvidence
 * @returns {Map<string, any>}
 */
function countEligibleFilesByModule(moduleEvidence) {
  const counts = new Map();
  for (const entry of moduleEvidence.values()) {
    if (entry.eligibleFiles === 0) {
      continue;
    }
    counts.set(entry.id, {
      id: entry.id,
      name: entry.name,
      root: entry.root,
      planningModule: entry.planningModule,
      eligibleFiles: entry.eligibleFiles,
    });
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
  resolveModule,
  moduleEvidence,
  expectations
) {
  const matchesByPattern = groupBy(matches, (match) => match.patternId);
  return patterns
    .map((pattern) => {
      const patternMatches = matchesByPattern.get(pattern.id) ?? [];
      const fileSet = new Set(patternMatches.map((match) => match.file));
      const langEligibleCount = eligibleByLanguage.get(pattern.language) ?? 0;
      const moduleEntries = moduleEntriesForPattern(
        patternMatches,
        eligibleByModule,
        resolveModule
      );
      const applicableModules = applicableModulesForPattern(
        pattern,
        moduleEvidence,
        expectations
      );
      const detectedModuleIds = new Set(moduleEntries.map((entry) => entry.id));
      const undetectedModules = isHeadlinePattern(pattern)
        ? applicableModules
            .filter((mod) => !detectedModuleIds.has(mod.id))
            .map((mod) => ({
              id: mod.id,
              name: mod.name,
              root: mod.root,
              planningModule: mod.planningModule,
              eligibleFiles: mod.eligibleFiles,
            }))
        : [];
      return {
        id: pattern.id,
        name: pattern.name,
        familyId: pattern.familyId,
        familyName: pattern.familyName,
        kind: pattern.kind,
        language: pattern.language,
        confidence: pattern.confidence,
        includeInHeadline: pattern.includeInHeadline,
        description: pattern.description,
        notes: pattern.notes,
        reviewChecks: pattern.reviewChecks ?? [],
        source: pattern.source,
        occurrenceCount: patternMatches.length,
        fileCount: fileSet.size,
        coveragePercent: percent(fileSet.size, langEligibleCount),
        applicableModuleCount: applicableModules.length,
        detectedModuleCount: moduleEntries.length,
        undetectedModuleCount: undetectedModules.length,
        modules: moduleEntries,
        undetectedModules,
        occurrences: patternMatches.map((match) => ({
          file: match.file,
          line: match.line,
          endLine: match.endLine ?? match.line,
          moduleId: resolveModule(match.file).id,
        })),
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
 * @param {import('./scanner.mjs').PatternMatch[]} matches
 * @param {Array<{ id: string, name: string, root: string, planningModule?: string }>} modules
 * @param {(file: string) => { id: string, name: string, root: string, planningModule?: string }} resolveModule
 * @returns {Map<string, any>}
 */
function buildModuleEvidence(eligibleFiles, matches, modules, resolveModule, sourceLineCounts) {
  const byModule = new Map();
  for (const mod of modules) {
    byModule.set(mod.id, newModuleEvidence(mod));
  }
  for (const file of eligibleFiles) {
    const mod = resolveModule(file);
    const entry = ensureModuleEvidence(byModule, mod);
    const language = languageForFile(file) ?? 'unknown';
    const lineCount = Math.max(0, Number(sourceLineCounts[file] ?? 0));
    entry.eligibleFiles += 1;
    entry.eligibleLines += lineCount;
    entry.eligibleFilePaths.push(file);
    entry.lineCounts.set(file, lineCount);
    entry.languages.set(language, (entry.languages.get(language) ?? 0) + 1);
  }
  for (const match of matches) {
    const mod = resolveModule(match.file);
    const entry = ensureModuleEvidence(byModule, mod);
    const patternMatches = entry.patternMatches.get(match.patternId) ?? [];
    patternMatches.push(match);
    entry.patternMatches.set(match.patternId, patternMatches);
    if (isHeadlineMatch(match)) {
      entry.headlineFiles.add(match.file);
    }
  }
  return byModule;
}

/**
 * @param {Map<string, any>} moduleEvidence
 * @param {import('./catalog.mjs').PatternDefinition[]} patterns
 * @returns {Array<object>}
 */
function modulePatternSummary(moduleEvidence, patterns, expectations) {
  return [...moduleEvidence.values()]
    .filter((entry) => entry.eligibleFiles > 0)
    .map((entry) => {
      const applicableHeadlinePatterns = patterns.filter(
        (pattern) =>
          isHeadlinePattern(pattern) &&
          (entry.languages.get(pattern.language) ?? 0) > 0 &&
          patternExpectedInModule(pattern, entry, expectations)
      );
      const patternsUsed = patternsUsedForModule(entry, patterns);
      const usedHeadlinePatternIds = new Set(
        patternsUsed
          .filter((pattern) => pattern.includeInHeadline)
          .map((pattern) => pattern.id)
      );
      const patternsNotDetected = applicableHeadlinePatterns
        .filter((pattern) => !usedHeadlinePatternIds.has(pattern.id))
        .map((pattern) => ({
          id: pattern.id,
          name: pattern.name,
          familyId: pattern.familyId,
          familyName: pattern.familyName,
          kind: pattern.kind,
          language: pattern.language,
          confidence: pattern.confidence,
          tags: pattern.tags,
        }));
      const coveredFiles = entry.headlineFiles.size;
      const coveragePercent = percent(coveredFiles, entry.eligibleFiles);
      const headlineMatches = headlineMatchesForModule(entry);
      const patternLines = countUniqueMatchedLines(headlineMatches, entry.lineCounts);
      const patternLinePercent = percent(patternLines, entry.eligibleLines);
      return {
        id: entry.id,
        name: entry.name,
        root: entry.root,
        planningModule: entry.planningModule,
        eligibleFiles: entry.eligibleFiles,
        eligibleLines: entry.eligibleLines,
        coveredFiles,
        coveragePercent,
        patternLines,
        patternLinePercent,
        languages: Object.fromEntries([...entry.languages.entries()].sort()),
        detectedPatternTypes: patternsUsed.length,
        applicablePatternTypes: applicableHeadlinePatterns.length,
        undetectedPatternTypes: patternsNotDetected.length,
        patternsUsed,
        patternsNotDetected,
        filesWithoutHeadlinePatterns: entry.eligibleFilePaths
          .filter((file) => !entry.headlineFiles.has(file))
          .sort()
          .slice(0, 10),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * @param {any} entry
 * @returns {import('./scanner.mjs').PatternMatch[]}
 */
function headlineMatchesForModule(entry) {
  return [...entry.patternMatches.values()]
    .flat()
    .filter((match) => isHeadlineMatch(match));
}

/**
 * @param {import('./scanner.mjs').PatternMatch[]} matches
 * @param {Map<string, number>} lineCounts
 * @returns {number}
 */
function countUniqueMatchedLines(matches, lineCounts) {
  const rangesByFile = new Map();
  for (const match of matches) {
    const fileLineCount = lineCounts.get(match.file) ?? 0;
    if (fileLineCount <= 0) {
      continue;
    }
    const start = clampLine(match.line, fileLineCount);
    const end = clampLine(match.endLine ?? match.line, fileLineCount);
    const ranges = rangesByFile.get(match.file) ?? [];
    ranges.push([Math.min(start, end), Math.max(start, end)]);
    rangesByFile.set(match.file, ranges);
  }

  let total = 0;
  for (const ranges of rangesByFile.values()) {
    total += countMergedRanges(ranges);
  }
  return total;
}

/**
 * @param {Array<[number, number]>} ranges
 * @returns {number}
 */
function countMergedRanges(ranges) {
  if (ranges.length === 0) {
    return 0;
  }
  const sorted = ranges
    .map(([start, end]) => [start, end])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let total = 0;
  let [currentStart, currentEnd] = sorted[0];
  for (const [start, end] of sorted.slice(1)) {
    if (start <= currentEnd + 1) {
      currentEnd = Math.max(currentEnd, end);
      continue;
    }
    total += currentEnd - currentStart + 1;
    currentStart = start;
    currentEnd = end;
  }
  total += currentEnd - currentStart + 1;
  return total;
}

/**
 * @param {number} line
 * @param {number} fileLineCount
 * @returns {number}
 */
function clampLine(line, fileLineCount) {
  return Math.max(1, Math.min(Number(line) || 1, fileLineCount));
}

/**
 * @param {Map<string, any>} moduleEvidence
 * @returns {number}
 */
function totalEligibleLines(moduleEvidence) {
  return [...moduleEvidence.values()].reduce(
    (sum, entry) => sum + (entry.eligibleLines ?? 0),
    0
  );
}

/**
 * @param {Array<{ patternLines?: number }>} modules
 * @returns {number}
 */
function totalPatternLines(modules) {
  return modules.reduce((sum, entry) => sum + (entry.patternLines ?? 0), 0);
}

/**
 * @param {any} entry
 * @param {import('./catalog.mjs').PatternDefinition[]} patterns
 * @returns {Array<object>}
 */
function patternsUsedForModule(entry, patterns) {
  const byId = new Map(patterns.map((pattern) => [pattern.id, pattern]));
  return [...entry.patternMatches.entries()]
    .map(([patternId, matches]) => {
      const pattern = byId.get(patternId);
      if (!pattern) {
        return null;
      }
      const fileSet = new Set(matches.map((match) => match.file));
      const lineCount = countUniqueMatchedLines(matches, entry.lineCounts);
      return {
        id: pattern.id,
        name: pattern.name,
        familyId: pattern.familyId,
        familyName: pattern.familyName,
        kind: pattern.kind,
        language: pattern.language,
        confidence: pattern.confidence,
        includeInHeadline: pattern.includeInHeadline,
        tags: pattern.tags,
        fileCount: fileSet.size,
        occurrenceCount: matches.length,
        lineCount,
        linePercent: percent(lineCount, entry.eligibleLines),
        examples: matches.slice(0, 5).map((match) => ({
          file: match.file,
          line: match.line,
          endLine: match.endLine,
        })),
      };
    })
    .filter((entry) => entry !== null)
    .sort(
      (a, b) =>
        b.occurrenceCount - a.occurrenceCount ||
        a.name.localeCompare(b.name)
    );
}

/**
 * @param {import('./catalog.mjs').PatternDefinition} pattern
 * @param {Map<string, any>} moduleEvidence
 */
function applicableModulesForPattern(pattern, moduleEvidence, expectations) {
  return [...moduleEvidence.values()]
    .filter((entry) => entry.eligibleFiles > 0)
    .filter((entry) => (entry.languages.get(pattern.language) ?? 0) > 0)
    .filter((entry) => patternExpectedInModule(pattern, entry, expectations))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * @param {{ id: string, name: string, root: string, planningModule?: string }} mod
 */
function newModuleEvidence(mod) {
  return {
    id: mod.id,
    name: mod.name,
    root: mod.root,
    planningModule: mod.planningModule,
    description: mod.description,
    capabilities: mod.capabilities ?? [],
    eligibleFiles: 0,
    eligibleLines: 0,
    eligibleFilePaths: [],
    lineCounts: new Map(),
    languages: new Map(),
    headlineFiles: new Set(),
    patternMatches: new Map(),
  };
}

/**
 * @param {Map<string, any>} byModule
 * @param {{ id: string, name: string, root: string, planningModule?: string }} mod
 */
function ensureModuleEvidence(byModule, mod) {
  const existing = byModule.get(mod.id);
  if (existing) {
    return existing;
  }
  const created = newModuleEvidence(mod);
  byModule.set(mod.id, created);
  return created;
}

/**
 * @param {import('./catalog.mjs').PatternDefinition} pattern
 */
function isHeadlinePattern(pattern) {
  return (
    pattern.includeInHeadline &&
    (pattern.confidence === 'high' || pattern.confidence === 'medium')
  );
}

/**
 * @param {import('./scanner.mjs').PatternMatch} match
 */
function isHeadlineMatch(match) {
  return (
    match.includeInHeadline &&
    (match.confidence === 'high' || match.confidence === 'medium')
  );
}

/**
 * @param {import('./catalog.mjs').PatternDefinition} pattern
 * @param {{ id: string, name: string, root: string, description?: string, capabilities?: string[] }} mod
 * @param {Array<object>} expectations
 * @returns {boolean}
 */
function patternExpectedInModule(pattern, mod, expectations = []) {
  if (expectations.some((expectation) => expectationMatchesPattern(expectation, mod, pattern))) {
    return true;
  }
  if (!Array.isArray(pattern.tags) || pattern.tags.length === 0) {
    return false;
  }
  return moduleTextMatchesAny(mod, pattern.tags);
}

/**
 * @param {object} expectation
 * @param {{ id: string, name: string, root: string, description?: string, capabilities?: string[] }} mod
 * @param {import('./catalog.mjs').PatternDefinition} pattern
 * @returns {boolean}
 */
function expectationMatchesPattern(expectation, mod, pattern) {
  const source = /** @type {Record<string, unknown>} */ (expectation);
  const moduleTags = Array.isArray(source.moduleTags)
    ? source.moduleTags.filter((entry) => typeof entry === 'string')
    : [];
  const expectedPatterns = Array.isArray(source.expectedPatterns)
    ? source.expectedPatterns.filter((entry) => typeof entry === 'string')
    : [];
  if (moduleTags.length === 0 || expectedPatterns.length === 0) {
    return false;
  }
  const familyOrId = pattern.familyId ?? pattern.id;
  return (
    expectedPatterns.includes(familyOrId) &&
    moduleTextMatchesAny(mod, moduleTags)
  );
}

/**
 * @param {{ id: string, name: string, root: string, description?: string, capabilities?: string[] }} mod
 * @param {string[]} terms
 * @returns {boolean}
 */
function moduleTextMatchesAny(mod, terms) {
  const haystack = [
    mod.id,
    mod.name,
    mod.root,
    mod.description,
    ...(mod.capabilities ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return terms.some((tag) => {
    const normalizedTag = tag.toLowerCase().replace(/-/g, ' ');
    return haystack.includes(normalizedTag) || haystack.includes(tag.toLowerCase());
  });
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
