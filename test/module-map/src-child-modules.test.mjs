import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectSrcChildModules } from '../../scripts/module-map/lib/auto-detect.mjs';

test('src child module roots use forward slashes on every platform', (t) => {
  const repo = mkdtempSync(path.join(os.tmpdir(), 'pp-src-child-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  for (const file of ['src/lib/index.ts', 'src/pages/home.tsx', 'src/empty/README.md']) {
    mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
    writeFileSync(path.join(repo, file), '', 'utf8');
  }

  const roots = detectSrcChildModules(repo);
  assert.deepEqual(roots, ['src/lib', 'src/pages']);
  for (const root of roots) {
    assert.doesNotMatch(root, /\\/, root);
  }
});
