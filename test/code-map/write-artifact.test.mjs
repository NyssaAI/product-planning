import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeArtifactIfChanged } from '../../scripts/lib/write-artifact.mjs';

test('atomic artifact write removes its same-directory temp file after failure', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'code-map-write-failure-'));
  try {
    const directoryTarget = path.join(dir, 'artifact.json');
    mkdirSync(directoryTarget);

    assert.throws(() => writeArtifactIfChanged(directoryTarget, 'content\n'));
    assert.deepEqual(readdirSync(dir), ['artifact.json']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
