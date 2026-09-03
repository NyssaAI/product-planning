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
  DEFAULT_CODE_MAP_OUTPUT,
  loadCodeMapConfig,
  resolveCodeMapOutput,
  resolveRepoContainedPath,
} from '../../scripts/code-map/lib/code-map-config.mjs';
import { mapCodeOutputs } from '../../scripts/map-code/generate.mjs';

/** @type {string[]} */
const tempDirs = [];

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempRepo() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'code-map-config-'));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, 'src'), { recursive: true });
  return dir;
}

test('resolveCodeMapOutput applies output, codeMapOutput, path config, then default precedence', () => {
  assert.equal(
    resolveCodeMapOutput(
      { output: 'legacy/map.json', codeMapOutput: 'new/map.json' },
      { codeMap: 'configured' }
    ),
    'legacy/map.json'
  );
  assert.equal(
    resolveCodeMapOutput({ codeMapOutput: 'new/map.json' }, { codeMap: 'configured' }),
    'new/map.json'
  );
  assert.equal(
    resolveCodeMapOutput({}, { codeMap: 'configured/maps' }),
    'configured/maps/code-map.json'
  );
  assert.equal(resolveCodeMapOutput({}, {}), DEFAULT_CODE_MAP_OUTPUT);
});

test('loadCodeMapConfig reads paths.codeMap when the project config omits output keys', () => {
  const repo = tempRepo();
  mkdirSync(path.join(repo, '.plan-product'), { recursive: true });
  writeFileSync(
    path.join(repo, '.plan-product/config.json'),
    JSON.stringify({ paths: { codeMap: 'planning/context' } }),
    'utf8'
  );
  writeFileSync(
    path.join(repo, 'plan-product.config.json'),
    JSON.stringify({ roots: ['src'] }),
    'utf8'
  );

  assert.equal(loadCodeMapConfig(repo).output, 'planning/context/code-map.json');
});

test('code-map output and roots must remain inside the repository', () => {
  const repo = tempRepo();
  assert.throws(
    () => resolveRepoContainedPath(repo, '../escaped.json', 'code-map output'),
    /must be within the project root/
  );
  writeFileSync(
    path.join(repo, 'plan-product.config.json'),
    JSON.stringify({ output: 'docs/code-map.json', roots: ['../outside'] }),
    'utf8'
  );
  assert.throws(() => loadCodeMapConfig(repo), /code-map root must be within/);
});

test('code-map containment rejects an in-repo link that resolves outside', (t) => {
  const repo = tempRepo();
  const outside = mkdtempSync(path.join(os.tmpdir(), 'code-map-config-outside-'));
  tempDirs.push(outside);
  try {
    symlinkSync(outside, path.join(repo, 'linked'), 'junction');
  } catch (error) {
    t.skip(`directory links unavailable: ${error.message}`);
    return;
  }

  assert.throws(
    () => resolveRepoContainedPath(repo, 'linked/map.json', 'code-map output'),
    /must be within the project root/
  );
});

test('map-code telemetry uses configured code-map and module-map paths', () => {
  const repo = tempRepo();
  writeFileSync(
    path.join(repo, 'plan-product.config.json'),
    JSON.stringify({
      output: 'generated/symbols.json',
      outputDir: 'generated/context',
      roots: ['src'],
    }),
    'utf8'
  );

  assert.deepEqual(mapCodeOutputs(repo), [
    'generated/symbols.json',
    'generated/context/module-map.json',
  ]);
});
