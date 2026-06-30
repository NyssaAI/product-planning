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
import { loadPatternRuntimeConfig } from '../../scripts/code-map/lib/patterns/runtime-config.mjs';

/** @type {string[]} */
const tempDirs = [];

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loadPatternRuntimeConfig resolves split code-map and module-map config', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'code-indexer-pattern-config-'));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, 'build/index'), { recursive: true });
  writeFileSync(
    path.join(dir, 'package.json'),
    '{"name":"fixture"}\n',
    'utf8'
  );
  writeFileSync(
    path.join(dir, 'code-indexer.config.json'),
    `${JSON.stringify(
      {
        projectName: 'Fixture',
        output: 'build/code-map.json',
        outputDir: 'build/index',
        roots: ['app'],
        languages: ['JavaScript'],
        patterns: { catalogs: ['code-indexer.patterns.json'] },
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  writeFileSync(
    path.join(dir, 'build/index/module-map.json'),
    `${JSON.stringify({ codeMap: 'docs/code-index/code-map.json' })}\n`,
    'utf8'
  );

  const config = loadPatternRuntimeConfig(dir);

  assert.equal(config.projectName, 'Fixture');
  assert.equal(config.outputDir, 'build/index');
  assert.equal(config.codeMapPath, 'build/code-map.json');
  assert.equal(config.moduleMapPath, 'build/index/module-map.json');
  assert.deepEqual(config.roots, ['app']);
  assert.deepEqual(config.languages, ['JavaScript']);
  assert.deepEqual(config.catalogs, ['code-indexer.patterns.json']);
  assert.match(config.warnings[0], /CODE_MAP_PATH_MISMATCH/);
});
