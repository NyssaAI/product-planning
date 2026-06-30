import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPatternsMarkdown } from '../../scripts/code-map/lib/patterns/render.mjs';

test('renderPatternsMarkdown emits summary, tiers, excluded files, and limitations', () => {
  const markdown = renderPatternsMarkdown({
    schemaVersion: '1.0',
    generated: '2026-06-30T00:00:00.000Z',
    project: { name: 'Fixture' },
    source: {
      codeMap: 'docs/code-index/code-map.json',
      moduleMap: 'docs/code-index/module-map.json',
      sourceFiles: 3,
      eligibleFiles: 2,
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
      coverageByConfidence: {
        high: { files: 1, percent: 50, includedInHeadline: true },
        medium: { files: 0, percent: 0, includedInHeadline: true },
        'intent-only': { files: 0, percent: 0, includedInHeadline: false },
      },
    },
    modules: [
      {
        id: 'cli',
        name: 'CLI',
        eligibleFiles: 2,
        coveredFiles: 1,
        coveragePercent: 50,
        planningModule: 'docs/code-index/modules/cli.md',
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
        modules: [
          {
            id: 'cli',
            name: 'CLI',
            fileCount: 1,
            occurrenceCount: 2,
            coveragePercent: 50,
          },
        ],
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
  assert.match(markdown, /`intent-only` \| 0 \| 0\.00% \| no/);
  assert.match(markdown, /`\.rb` \| - \| 1 \| no supported language/);
  assert.match(markdown, /Node CLI argument parser/);
  assert.match(markdown, /Pattern matches are structural evidence/);
});
