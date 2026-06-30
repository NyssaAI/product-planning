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
  const dir = mkdtempSync(path.join(tmpdir(), 'code-indexer-pattern-scan-'));
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
  assert.equal(matches[0].confidence, 'high');
});
