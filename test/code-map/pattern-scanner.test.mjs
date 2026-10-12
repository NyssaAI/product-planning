import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { loadPatternCatalogs } from '../../scripts/code-map/lib/patterns/catalog.mjs';
import {
  partitionPatternEligibleFiles,
  runPatternScan,
} from '../../scripts/code-map/lib/patterns/scanner.mjs';

/** @type {string[]} */
const tempDirs = [];

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('partitionPatternEligibleFiles excludes unsupported and disabled files', () => {
  const result = partitionPatternEligibleFiles(
    ['src/cli.mjs', 'src/app.ts', 'src/tool.rb', 'src/Program.cs'],
    [
      {
        id: 'node-cli-argv-parser',
        language: 'JavaScript',
      },
    ],
    ['JavaScript', 'TypeScript']
  );

  assert.deepEqual(result.eligibleFiles, ['src/cli.mjs']);
  assert.deepEqual(
    result.excludedFiles.map((entry) => ({
      extension: entry.extension,
      language: entry.language,
      count: entry.count,
      reason: entry.reason,
    })),
    [
      {
        extension: '.cs',
        language: 'CSharp',
        count: 1,
        reason: 'language disabled by config',
      },
      {
        extension: '.ts',
        language: 'TypeScript',
        count: 1,
        reason: 'no enabled pattern catalog',
      },
      {
        extension: '.rb',
        language: null,
        count: 1,
        reason: 'no supported language',
      },
    ]
  );
});

test('runPatternScan returns structural matches with pattern metadata', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'plan-product-pattern-scan-'));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, 'src'), { recursive: true });
  writeFileSync(
    path.join(dir, 'package.json'),
    '{"name":"fixture"}\n',
    'utf8'
  );
  writeFileSync(
    path.join(dir, 'src/cli.mjs'),
    'const args = process.argv.slice(2);\n',
    'utf8'
  );
  const patterns = [
    {
      id: 'node-cli-argv-parser',
      name: 'Node CLI argument parser',
      language: 'JavaScript',
      confidence: 'high',
      description: 'Reads process.argv.',
      rule: { pattern: 'process.argv.slice($$$)' },
      includeInHeadline: true,
      source: 'fixture',
      tags: [],
    },
  ];

  const matches = runPatternScan(dir, patterns, ['src/cli.mjs']);

  assert.equal(matches.length, 1);
  assert.equal(matches[0].patternId, 'node-cli-argv-parser');
  assert.equal(matches[0].file, 'src/cli.mjs');
  assert.equal(matches[0].line, 1);
  assert.equal(matches[0].endLine, 1);
  assert.equal(matches[0].lineCount, 1);
  assert.equal(matches[0].confidence, 'high');
});

test('runPatternScan supports regex-only catalog detectors', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'plan-product-pattern-scan-'));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, 'src'), { recursive: true });
  writeFileSync(
    path.join(dir, 'package.json'),
    '{"name":"fixture"}\n',
    'utf8'
  );
  writeFileSync(
    path.join(dir, 'src/service.mjs'),
    'class UserService {}\n',
    'utf8'
  );
  const patterns = [
    {
      id: 'named-service',
      name: 'Named service',
      language: 'JavaScript',
      confidence: 'medium',
      description: 'Names indicate services.',
      rule: { regex: '\\b[A-Za-z0-9_]*Service\\b' },
      includeInHeadline: true,
      source: 'fixture',
      tags: [],
    },
  ];

  const matches = runPatternScan(dir, patterns, ['src/service.mjs']);

  assert.equal(matches.length, 1);
  assert.equal(matches[0].patternId, 'named-service');
  assert.equal(matches[0].file, 'src/service.mjs');
});

test('name detectors match identifiers, not enclosing bodies, comments, or string examples', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'plan-product-pattern-names-'));
  tempDirs.push(dir);
  writeFileSync(path.join(dir, 'names.json'), JSON.stringify({ patterns: [{
    id: 'named-factory', name: 'Factory name', language: 'JavaScript',
    confidence: 'intent-only', description: 'A possible factory.',
    rule: { regex: 'Factory' },
  }] }));
  writeFileSync(path.join(dir, 'source.mjs'), [
    'function example() {',
    '  // FakeFactory is documentation.',
    '  const text = "FakeFactory";',
    '  return text;',
    '}',
    'function OrderFactory() { return {}; }',
  ].join('\n'));
  const patterns = loadPatternCatalogs(dir, { catalogs: ['names.json'] }).patterns
    .filter((pattern) => pattern.id === 'named-factory');
  const matches = runPatternScan(dir, patterns, ['source.mjs']);
  assert.deepEqual(matches.map(({ line, endLine }) => ({ line, endLine })), [{ line: 6, endLine: 6 }]);
});

test('scanner failure rejects partial JSON instead of treating it as a complete report', (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'plan-product-pattern-failure-'));
  tempDirs.push(dir);
  writeFileSync(path.join(dir, 'source.mjs'), 'const value = 1;');
  const patterns = [{ id: 'values', name: 'Values', language: 'JavaScript', confidence: 'high', rule: { kind: 'lexical_declaration' } }];
  const mocked = t.mock.method(childProcess, 'spawnSync', () => ({ status: 2, stdout: '[]', stderr: 'injected scanner failure' }));
  syncBuiltinESMExports();
  try {
    assert.throws(() => runPatternScan(dir, patterns, ['source.mjs']), /AST_GREP_FAILED.*injected scanner failure/);
  } finally {
    mocked.mock.restore();
    syncBuiltinESMExports();
  }
});
