import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  isExcludedGoFile,
  readGoModulePath,
  readGoWorkMembers,
} from '../../scripts/lib/go-mod.mjs';

/** @type {string[]} */
const tempDirs = [];

function repo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'go-mod-test-'));
  tempDirs.push(dir);
  return dir;
}

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('readGoWorkMembers parses block, single-line, comment, and dot entries', () => {
  const dir = repo();
  writeFileSync(
    path.join(dir, 'go.work'),
    `go 1.22

use (
	./svc-a
	./svc-b // payments
)

use ./tools/cli
use .
use ../outside
`,
    'utf8'
  );

  assert.deepEqual(readGoWorkMembers(dir), ['svc-a', 'svc-b', 'tools/cli', '']);
});

test('readGoWorkMembers reads every use block, not only the first', () => {
  const dir = repo();
  writeFileSync(
    path.join(dir, 'go.work'),
    `use (
	./svc-a
)

use (
	./svc-b
)
`,
    'utf8'
  );

  assert.deepEqual(readGoWorkMembers(dir), ['svc-a', 'svc-b']);
});

test('readGoModulePath reads module lines, tolerates a BOM, and handles absence', () => {
  const dir = repo();
  writeFileSync(path.join(dir, 'go.mod'), 'module example.com/root\n\ngo 1.22\n', 'utf8');
  mkdirSync(path.join(dir, 'svc'), { recursive: true });
  writeFileSync(
    path.join(dir, 'svc', 'go.mod'),
    '﻿module example.com/svc\n',
    'utf8'
  );

  assert.equal(readGoModulePath(dir, ''), 'example.com/root');
  assert.equal(readGoModulePath(dir, 'svc'), 'example.com/svc');
  assert.equal(readGoModulePath(dir, 'missing'), null);
});

test('isExcludedGoFile is the single shared exclusion policy', () => {
  assert.equal(isExcludedGoFile('vendor/x/y.go'), true);
  assert.equal(isExcludedGoFile('a/testdata/x.go'), true);
  assert.equal(isExcludedGoFile('a/b_test.go'), true);
  assert.equal(isExcludedGoFile('a/b.pb.go'), true);
  assert.equal(isExcludedGoFile('a/b.go'), false);
});
