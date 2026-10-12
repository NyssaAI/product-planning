import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  isInSkippedDir,
  languageForFile,
  sourceFilesInRoots,
} from '../../scripts/code-map/lib/source-files.mjs';

/** @type {string[]} */
const tempDirs = [];

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempRepo() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'code-map-source-files-'));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, 'src/real'), { recursive: true });
  writeFileSync(path.join(dir, 'src/real/index.js'), 'export const value = 1;\n');
  return dir;
}

test('isInSkippedDir matches skip directories at any depth but never the file name', () => {
  assert.equal(isInSkippedDir('src/fixtures/server.js'), true);
  assert.equal(isInSkippedDir('src/app/__fixtures__/data.ts'), true);
  assert.equal(isInSkippedDir('dist/index.js'), true);
  assert.equal(isInSkippedDir('packages/web/build/main.js'), true);
  assert.equal(isInSkippedDir('src/routes/users.ts'), false);
  assert.equal(isInSkippedDir('src/fixtures.ts'), false);
  assert.equal(isInSkippedDir('src/dist.config.ts'), false);
});

test('sourceFilesInRoots and isInSkippedDir agree on the same tree', () => {
  const repo = tempRepo();
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
  assert.deepEqual(walked, [
    'src/ok/fixtures.ts',
    'src/real/index.js',
    'src/routes/users.ts',
  ]);
  for (const file of walked) {
    assert.equal(isInSkippedDir(file), false, file);
  }
});

test('file extensions identify supported languages', () => {
  assert.equal(languageForFile('notes.txt'), null);
  assert.equal(languageForFile('main.go'), 'Go');
  assert.equal(languageForFile('app.tsx'), 'TypeScript');
});

test('source walker skips generated/vendor directories', () => {
  const repo = tempRepo();
  for (const dir of ['vendor', 'target', 'third_party', '.cache', '.turbo', '.nx']) {
    mkdirSync(path.join(repo, 'src', dir), { recursive: true });
    writeFileSync(path.join(repo, 'src', dir, 'ignored.js'), 'ignored();\n');
  }

  assert.deepEqual(sourceFilesInRoots(repo, ['src']), ['src/real/index.js']);
});

test('source walker follows a linked directory once and terminates cycles', (t) => {
  const repo = tempRepo();
  try {
    symlinkSync(path.join(repo, 'src/real'), path.join(repo, 'src/linked'), 'junction');
    symlinkSync(path.join(repo, 'src'), path.join(repo, 'src/real/back'), 'junction');
  } catch (error) {
    t.skip(`directory links unavailable: ${error.message}`);
    return;
  }

  const files = sourceFilesInRoots(repo, ['src']);
  assert.equal(files.length, 1);
  assert.match(files[0], /index\.js$/);
});

test('source walker does not follow a linked directory outside the repository', (t) => {
  const repo = tempRepo();
  const outside = mkdtempSync(path.join(os.tmpdir(), 'code-map-outside-'));
  tempDirs.push(outside);
  writeFileSync(path.join(outside, 'escaped.js'), 'escaped();\n');
  try {
    symlinkSync(outside, path.join(repo, 'src/outside'), 'junction');
  } catch (error) {
    t.skip(`directory links unavailable: ${error.message}`);
    return;
  }

  assert.deepEqual(sourceFilesInRoots(repo, ['src']), ['src/real/index.js']);
});

test('source walker does not include a linked file outside the repository', (t) => {
  const repo = tempRepo();
  const outside = mkdtempSync(path.join(os.tmpdir(), 'code-map-outside-file-'));
  tempDirs.push(outside);
  const escaped = path.join(outside, 'escaped.js');
  writeFileSync(escaped, 'escaped();\n');
  try {
    symlinkSync(escaped, path.join(repo, 'src/escaped.js'), 'file');
  } catch (error) {
    t.skip(`file links unavailable: ${error.message}`);
    return;
  }

  assert.deepEqual(sourceFilesInRoots(repo, ['src']), ['src/real/index.js']);
});

test('source walker ignores a missing root but rethrows unexpected walk errors', () => {
  const repo = tempRepo();
  writeFileSync(path.join(repo, 'not-a-directory.js'), 'export {};\n');

  assert.deepEqual(sourceFilesInRoots(repo, ['missing']), []);
  assert.throws(
    () => sourceFilesInRoots(repo, ['not-a-directory.js']),
    (error) => error?.code === 'ENOTDIR'
  );
});
