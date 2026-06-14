import { test } from 'node:test';
import assert from 'node:assert/strict';
import { batchByArgLength } from '../../scripts/ai-plan/lib/adapters/typescript.mjs';

test('batchByArgLength keeps every batch under the length budget', () => {
  // 500 paths of ~80 chars each => ~40 KB total, must split into batches.
  const paths = Array.from(
    { length: 500 },
    (_, i) => `/repo/src/very/deeply/nested/module/segment/file-${i}.ts`
  );
  const maxLen = 24000;

  const batches = batchByArgLength(paths, maxLen);

  assert.equal(batches.length > 1, true);
  for (const batch of batches) {
    const joined = batch.reduce((n, p) => n + p.length + 1, 0);
    assert.equal(joined <= maxLen, true);
  }
  // No path is lost or duplicated.
  assert.deepEqual(batches.flat(), paths);
});

test('batchByArgLength returns a single batch when everything fits', () => {
  const paths = ['/a.ts', '/b.ts', '/c.ts'];
  const batches = batchByArgLength(paths, 24000);
  assert.deepEqual(batches, [paths]);
});

test('batchByArgLength keeps an over-long single path in its own batch', () => {
  const long = `/repo/${'x'.repeat(50)}.ts`;
  const batches = batchByArgLength([long, '/short.ts'], 10);
  // Each entry ends up isolated rather than dropped.
  assert.deepEqual(batches.flat(), [long, '/short.ts']);
  assert.equal(batches.length, 2);
});
