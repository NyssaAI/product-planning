import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPatternsMarkdown } from '../../scripts/code-map/lib/patterns/render.mjs';

test('renderPatternsMarkdown emits summary, tiers, excluded files, and limitations', () => {
  const markdown = renderPatternsMarkdown({
    schemaVersion: '1.1',
    generated: '2026-06-30T00:00:00.000Z',
    project: { name: 'Fixture' },
    source: {
      codeMap: 'docs/code-map/code-map.json',
      moduleMap: 'docs/code-map/module-map.json',
      sourceFiles: 3,
      eligibleFiles: 2,
      eligibleLines: 20,
      excludedFiles: [
        {
          extension: '.rb',
          language: null,
          count: 1,
          reason: 'no supported language',
        },
      ],
      languages: ['JavaScript'],
    },
    summary: {
      patternsEvaluated: 1,
      patternsMatched: 1,
      occurrences: 2,
      coveredFiles: 1,
      coveragePercent: 50,
      patternLines: 4,
      patternLinePercent: 20,
      coverageByConfidence: {
        high: { files: 1, percent: 50, includedInHeadline: true },
        medium: { files: 0, percent: 0, includedInHeadline: true },
        'intent-only': { files: 0, percent: 0, includedInHeadline: false },
      },
      moduleSignals: { 'mixed-pattern-evidence': 1 },
      modulesWithPatternEvidence: 1,
      modulesWithoutPatternEvidence: 0,
    },
    modules: [
      {
        id: 'cli',
        name: 'CLI',
        root: 'src',
        eligibleFiles: 2,
        eligibleLines: 20,
        coveredFiles: 1,
        coveragePercent: 50,
        patternLines: 4,
        patternLinePercent: 20,
        signal: 'mixed-pattern-evidence',
        detectedPatternTypes: 1,
        applicablePatternTypes: 2,
        undetectedPatternTypes: 1,
        patternsUsed: [
          {
            id: 'node-cli-argv-parser',
            name: 'Node CLI argument parser',
            language: 'JavaScript',
            confidence: 'high',
            includeInHeadline: true,
            tags: ['cli'],
            fileCount: 1,
            occurrenceCount: 2,
            lineCount: 4,
            linePercent: 20,
            examples: [{ file: 'src/cli.mjs', line: 1 }],
          },
        ],
        patternsNotDetected: [
          {
            id: 'node-json-config-loader',
            name: 'JSON config loader',
            language: 'JavaScript',
            confidence: 'high',
            tags: ['config'],
          },
        ],
        filesWithoutHeadlinePatterns: ['src/other.mjs'],
        planningModule: 'docs/code-map/modules/cli.md',
      },
    ],
    patterns: [
      {
        id: 'node-cli-argv-parser',
        name: 'Node CLI argument parser',
        language: 'JavaScript',
        confidence: 'high',
        includeInHeadline: true,
        description: 'Reads process.argv.',
        occurrenceCount: 2,
        fileCount: 1,
        coveragePercent: 50,
        applicableModuleCount: 1,
        detectedModuleCount: 1,
        undetectedModuleCount: 0,
        modules: [
          {
            id: 'cli',
            name: 'CLI',
            fileCount: 1,
            occurrenceCount: 2,
            coveragePercent: 50,
          },
        ],
        undetectedModules: [],
        examples: [
          {
            file: 'src/cli.mjs',
            line: 1,
            moduleId: 'cli',
          },
        ],
      },
    ],
  });

  assert.match(markdown, /# Fixture Code Patterns/);
  assert.match(markdown, /Pattern-eligible files \| 2/);
  assert.match(markdown, /Pattern-eligible source lines \| 20/);
  assert.match(markdown, /Pattern line coverage \| 20\.00%/);
  assert.match(markdown, /Modules with pattern evidence \| 1/);
  assert.match(markdown, /Module Pattern Signals/);
  assert.match(markdown, /Pattern line coverage: 20\.00% \(4\/20 lines\)/);
  assert.match(markdown, /Expected headline patterns not detected/);
  assert.match(markdown, /`intent-only` \| 0 \| 0\.00% \| no/);
  assert.match(markdown, /`\.rb` \| - \| 1 \| no supported language/);
  assert.match(markdown, /Node CLI argument parser/);
  assert.match(markdown, /Pattern matches are structural evidence/);
});
