import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPatternReport } from '../../scripts/code-map/lib/patterns/model.mjs';

const runtime = {
  projectName: 'Fixture',
  codeMapPath: 'docs/code-index/code-map.json',
  moduleMapPath: 'docs/code-index/module-map.json',
  languages: ['JavaScript'],
};

const moduleMap = {
  modules: [
    {
      id: 'cli',
      name: 'CLI',
      root: 'src/cli',
      planningModule: 'docs/code-index/modules/cli.md',
    },
    {
      id: 'lib',
      name: 'Lib',
      root: 'src/lib',
      planningModule: 'docs/code-index/modules/lib.md',
    },
  ],
};

test('buildPatternReport excludes intent-only from headline coverage', () => {
  const report = buildPatternReport({
    runtime,
    codeMap: { files: [] },
    moduleMap,
    patterns: [
      {
        id: 'high-pattern',
        name: 'High pattern',
        language: 'JavaScript',
        confidence: 'high',
        description: 'High-confidence pattern.',
        includeInHeadline: true,
        source: 'fixture',
        rule: {},
        tags: [],
      },
      {
        id: 'intent-signal',
        name: 'Intent signal',
        language: 'JavaScript',
        confidence: 'intent-only',
        description: 'Weak signal.',
        includeInHeadline: true,
        source: 'fixture',
        rule: {},
        tags: [],
      },
    ],
    matches: [
      {
        patternId: 'high-pattern',
        patternName: 'High pattern',
        confidence: 'high',
        includeInHeadline: true,
        language: 'JavaScript',
        file: 'src/cli/index.mjs',
        line: 1,
      },
      {
        patternId: 'intent-signal',
        patternName: 'Intent signal',
        confidence: 'intent-only',
        includeInHeadline: false,
        language: 'JavaScript',
        file: 'src/lib/helpers.mjs',
        line: 1,
      },
    ],
    sourceFiles: ['src/cli/index.mjs', 'src/lib/helpers.mjs'],
    eligibleFiles: ['src/cli/index.mjs', 'src/lib/helpers.mjs'],
    excludedFiles: [],
    generated: '2026-06-30T00:00:00.000Z',
  });

  assert.equal(report.summary.coveredFiles, 1);
  assert.equal(report.summary.coveragePercent, 50);
  assert.equal(report.summary.coverageByConfidence['intent-only'].files, 1);
  assert.equal(report.summary.coverageByConfidence['intent-only'].includedInHeadline, false);
  assert.equal(report.modules.find((mod) => mod.id === 'cli').coveragePercent, 100);
  assert.equal(report.modules.find((mod) => mod.id === 'lib').coveragePercent, 0);
});

test('buildPatternReport uses pattern-eligible module denominators, not code-map file counts', () => {
  const report = buildPatternReport({
    runtime,
    codeMap: {
      modules: [{ id: 'cli', fileCount: 1 }],
      files: [
        {
          path: 'src/cli/index.mjs',
          moduleId: 'cli',
          moduleName: 'CLI',
          moduleRoot: 'src/cli',
          planningModule: 'docs/code-index/modules/cli.md',
        },
      ],
    },
    moduleMap,
    patterns: [
      {
        id: 'high-pattern',
        name: 'High pattern',
        language: 'JavaScript',
        confidence: 'high',
        description: 'High-confidence pattern.',
        includeInHeadline: true,
        source: 'fixture',
        rule: {},
        tags: [],
      },
    ],
    matches: [
      {
        patternId: 'high-pattern',
        patternName: 'High pattern',
        confidence: 'high',
        includeInHeadline: true,
        language: 'JavaScript',
        file: 'src/cli/index.mjs',
        line: 1,
      },
    ],
    sourceFiles: [
      'src/cli/index.mjs',
      'src/cli/secondary.mjs',
      'src/lib/helpers.mjs',
    ],
    eligibleFiles: [
      'src/cli/index.mjs',
      'src/cli/secondary.mjs',
      'src/lib/helpers.mjs',
    ],
    excludedFiles: [],
    generated: '2026-06-30T00:00:00.000Z',
  });

  const cli = report.modules.find((mod) => mod.id === 'cli');
  assert.equal(cli.eligibleFiles, 2);
  assert.equal(cli.coveredFiles, 1);
  assert.equal(cli.coveragePercent, 50);
});
