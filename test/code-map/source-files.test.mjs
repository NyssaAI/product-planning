import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  isInSkippedDir,
  languageForFile,
  sourceFilesInRoots,
} from '../../scripts/code-map/lib/source-files.mjs';

test('isInSkippedDir matches skip directories at any depth but never the file name', () => {
  assert.equal(isInSkippedDir('src/fixtures/server.js'), true);
  assert.equal(isInSkippedDir('src/app/__fixtures__/data.ts'), true);
  assert.equal(isInSkippedDir('dist/index.js'), true);
  assert.equal(isInSkippedDir('packages/web/build/main.js'), true);
  assert.equal(isInSkippedDir('src/routes/users.ts'), false);
  assert.equal(isInSkippedDir('src/fixtures.ts'), false, 'a file named like a skip dir is not skipped');
  assert.equal(isInSkippedDir('src/dist.config.ts'), false);
});

test('sourceFilesInRoots and isInSkippedDir agree on the same tree', (t) => {
  const repo = mkdtempSync(path.join(os.tmpdir(), 'pp-source-files-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  for (const file of [
    'src/routes/users.ts',
    'src/fixtures/server.js',
    'src/lib/dist/out.js',
    'src/ok/fixtures.ts',
  ]) {
    mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
    writeFileSync(path.join(repo, file), '', 'utf8');
  }
  const walked = sourceFilesInRoots(repo, ['src']);
  assert.deepEqual(walked, ['src/ok/fixtures.ts', 'src/routes/users.ts']);
  for (const file of walked) {
    assert.equal(isInSkippedDir(file), false, file);
  }
});

test('Java is not a code-map language', () => {
  assert.equal(languageForFile('Main.java'), null);
  assert.equal(languageForFile('main.go'), 'Go');
  assert.equal(languageForFile('app.tsx'), 'TypeScript');
});
