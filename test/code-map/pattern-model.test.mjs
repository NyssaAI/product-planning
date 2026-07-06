import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPatternReport } from '../../scripts/code-map/lib/patterns/model.mjs';

const runtime = {
  projectName: 'Fixture',
  codeMapPath: 'docs/code-map/code-map.json',
  moduleMapPath: 'docs/code-map/module-map.json',
  languages: ['JavaScript'],
};

const moduleMap = {
  modules: [
    {
      id: 'cli',
      name: 'CLI',
      root: 'src/cli',
      planningModule: 'docs/code-map/modules/cli.md',
      description: 'CLI entry points and command handling.',
    },
    {
      id: 'lib',
      name: 'Lib',
      root: 'src/lib',
      planningModule: 'docs/code-map/modules/lib.md',
      description: 'Shared library helpers.',
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
    sourceLineCounts: {
      'src/cli/index.mjs': 10,
      'src/lib/helpers.mjs': 10,
    },
    excludedFiles: [],
    generated: '2026-06-30T00:00:00.000Z',
  });

  assert.equal(report.source.eligibleLines, 20);
  assert.equal(report.summary.patternLines, 1);
  assert.equal(report.summary.patternLinePercent, 5);
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
          planningModule: 'docs/code-map/modules/cli.md',
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
    sourceLineCounts: {
      'src/cli/index.mjs': 4,
      'src/cli/secondary.mjs': 4,
      'src/lib/helpers.mjs': 2,
    },
    excludedFiles: [],
    generated: '2026-06-30T00:00:00.000Z',
  });

  const cli = report.modules.find((mod) => mod.id === 'cli');
  assert.equal(cli.eligibleFiles, 2);
  assert.equal(cli.eligibleLines, 8);
  assert.equal(cli.patternLines, 1);
  assert.equal(cli.patternLinePercent, 12.5);
  assert.equal(cli.coveredFiles, 1);
  assert.equal(cli.coveragePercent, 50);
});

test('buildPatternReport scopes missing pattern signals to matching module tags', () => {
  const report = buildPatternReport({
    runtime,
    codeMap: { files: [] },
    moduleMap: {
      modules: [
        {
          id: 'cli',
          name: 'CLI',
          root: 'src/cli',
          description: 'CLI entry points and command handling.',
        },
        {
          id: 'config',
          name: 'Config',
          root: 'src/config',
          description: 'Configuration loading and validation.',
        },
        {
          id: 'lib',
          name: 'Lib',
          root: 'src/lib',
          description: 'General helpers.',
        },
      ],
    },
    patterns: [
      {
        id: 'cli-parser',
        name: 'CLI parser',
        language: 'JavaScript',
        confidence: 'high',
        description: 'CLI argument parsing.',
        includeInHeadline: true,
        source: 'fixture',
        rule: {},
        tags: ['cli'],
      },
      {
        id: 'config-loader',
        name: 'Config loader',
        language: 'JavaScript',
        confidence: 'high',
        description: 'Configuration loading.',
        includeInHeadline: true,
        source: 'fixture',
        rule: {},
        tags: ['config'],
      },
    ],
    matches: [
      {
        patternId: 'cli-parser',
        patternName: 'CLI parser',
        confidence: 'high',
        includeInHeadline: true,
        language: 'JavaScript',
        file: 'src/cli/index.mjs',
        line: 1,
      },
    ],
    sourceFiles: [
      'src/cli/index.mjs',
      'src/config/load.mjs',
      'src/lib/helpers.mjs',
    ],
    eligibleFiles: [
      'src/cli/index.mjs',
      'src/config/load.mjs',
      'src/lib/helpers.mjs',
    ],
    sourceLineCounts: {
      'src/cli/index.mjs': 10,
      'src/config/load.mjs': 10,
      'src/lib/helpers.mjs': 10,
    },
    excludedFiles: [],
    generated: '2026-06-30T00:00:00.000Z',
  });

  const config = report.modules.find((mod) => mod.id === 'config');
  const lib = report.modules.find((mod) => mod.id === 'lib');
  const configPattern = report.patterns.find((pattern) => pattern.id === 'config-loader');

  assert.deepEqual(
    config.patternsNotDetected.map((pattern) => pattern.id),
    ['config-loader']
  );
  assert.deepEqual(lib.patternsNotDetected, []);
  assert.deepEqual(
    configPattern.undetectedModules.map((mod) => mod.id),
    ['config']
  );
});

test('buildPatternReport uses expectations to require canonical pattern families', () => {
  const report = buildPatternReport({
    runtime: {
      ...runtime,
      expectations: [
        {
          id: 'workflow',
          moduleTags: ['workflow'],
          expectedPatterns: ['command'],
        },
      ],
    },
    codeMap: { files: [] },
    moduleMap: {
      modules: [
        {
          id: 'workflow',
          name: 'Workflow',
          root: 'src/workflow',
          description: 'Workflow orchestration.',
        },
      ],
    },
    patterns: [
      {
        id: 'command-named-command-javascript',
        name: 'Command: named command',
        familyId: 'command',
        familyName: 'Command',
        kind: 'design-pattern',
        language: 'JavaScript',
        confidence: 'medium',
        description: 'Command signal.',
        includeInHeadline: true,
        source: 'fixture',
        rule: {},
        tags: [],
      },
    ],
    matches: [],
    sourceFiles: ['src/workflow/run.mjs'],
    eligibleFiles: ['src/workflow/run.mjs'],
    sourceLineCounts: { 'src/workflow/run.mjs': 5 },
    excludedFiles: [],
    generated: '2026-06-30T00:00:00.000Z',
  });

  const workflow = report.modules.find((mod) => mod.id === 'workflow');
  assert.deepEqual(
    workflow.patternsNotDetected.map((pattern) => pattern.familyId),
    ['command']
  );
});
