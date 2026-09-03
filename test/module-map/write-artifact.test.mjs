import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { writeArtifactIfChanged } from '../../scripts/lib/write-artifact.mjs';

function tmpFile(t, name = 'artifact.json') {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'pp-write-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, name);
}

test('writes when the file does not exist', (t) => {
  const file = tmpFile(t);
  assert.equal(writeArtifactIfChanged(file, 'hello\n'), true);
  assert.equal(readFileSync(file, 'utf8'), 'hello\n');
});

test('skips the write when only the generation timestamp differs', (t) => {
  const file = tmpFile(t);
  const before = '{\n  "generated": "2026-08-17T19:37:03.021Z",\n  "modules": 78\n}\n';
  const after = '{\n  "generated": "2026-08-17T20:11:44.900Z",\n  "modules": 78\n}\n';

  writeFileSync(file, before, 'utf8');
  const mtimeBefore = statSync(file).mtimeMs;

  assert.equal(writeArtifactIfChanged(file, after), false);
  // The old timestamp survives: `generated` means when the content last
  // changed, not when the generator last ran.
  assert.equal(readFileSync(file, 'utf8'), before);
  assert.equal(statSync(file).mtimeMs, mtimeBefore, 'file must not be touched');
});

test('writes when real content changed alongside the timestamp', (t) => {
  const file = tmpFile(t);
  writeFileSync(
    file,
    '{\n  "generated": "2026-08-17T19:37:03.021Z",\n  "modules": 78\n}\n',
    'utf8'
  );
  const after = '{\n  "generated": "2026-08-17T20:11:44.900Z",\n  "modules": 79\n}\n';

  assert.equal(writeArtifactIfChanged(file, after), true);
  assert.equal(readFileSync(file, 'utf8'), after);
});

test('handles the markdown comment and prose timestamp forms', (t) => {
  for (const [before, after, expectWrite] of [
    [
      '<!-- plan-product:module-map generated 2026-08-17T19:26:47.572Z -->\n',
      '<!-- plan-product:module-map generated 2026-08-17T19:34:40.926Z -->\n',
      false,
    ],
    [
      'Generated: 2026-07-31T23:18:06.861Z. Regenerate with the generator.\n',
      'Generated: 2026-08-17T19:34:40.926Z. Regenerate with the generator.\n',
      false,
    ],
    [
      'Generated: 2026-07-31T23:18:06.861Z. Modules: 3.\n',
      'Generated: 2026-08-17T19:34:40.926Z. Modules: 4.\n',
      true,
    ],
  ]) {
    const file = tmpFile(t, 'doc.md');
    writeFileSync(file, before, 'utf8');
    assert.equal(writeArtifactIfChanged(file, after), expectWrite);
  }
});
