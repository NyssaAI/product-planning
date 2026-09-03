import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve('.');
const script = path.join(repoRoot, 'scripts/code-map/generate-code-map.mjs');
/** @type {string[]} */
const tempDirs = [];

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempProject(overrides = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'generate-code-map-'));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, 'src/app/api/items'), { recursive: true });
  const config = {
    output: 'artifacts/code-map.json',
    roots: ['src'],
    languages: ['TypeScript'],
    modules: {
      discover: 'manual',
      manual: [{ id: 'src', name: 'Source', root: 'src' }],
    },
    ...overrides,
  };
  writeFileSync(
    path.join(dir, 'plan-product.config.json'),
    `${JSON.stringify(config, null, 2)}\n`,
    'utf8'
  );
  writeFileSync(
    path.join(dir, 'src/app/api/items/route.tsx'),
    '/** Items endpoint. */\nexport async function GET() { return Response.json([]); }\n',
    'utf8'
  );
  writeFileSync(
    path.join(dir, 'src/ignored.py'),
    '@app.get("/ignored")\ndef ignored():\n    return {}\n',
    'utf8'
  );
  return dir;
}

function run(dir, args = []) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: dir,
    encoding: 'utf8',
  });
}

test('configured languages filter symbols and endpoint input while route TSX symbols keep route kind', () => {
  const dir = tempProject();
  const result = run(dir);
  assert.equal(result.status, 0, result.stderr);
  const document = JSON.parse(
    readFileSync(path.join(dir, 'artifacts/code-map.json'), 'utf8')
  );

  assert.deepEqual(document.languages, ['TypeScript']);
  assert.deepEqual(document.files.map((file) => file.path), [
    'src/app/api/items/route.tsx',
  ]);
  assert.equal(document.files[0].symbols[0].kind, 'route');
  assert.equal(
    document.endpoints.some((endpoint) => endpoint.file === 'src/ignored.py'),
    false
  );
});

test('omitting languages keeps every supported language enabled', () => {
  const dir = tempProject({ languages: undefined });
  const configPath = path.join(dir, 'plan-product.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  delete config.languages;
  writeFileSync(configPath, JSON.stringify(config), 'utf8');

  const result = run(dir);
  assert.equal(result.status, 0, result.stderr);
  const document = JSON.parse(
    readFileSync(path.join(dir, 'artifacts/code-map.json'), 'utf8')
  );
  assert.equal(
    document.files.some((file) => file.path === 'src/ignored.py'),
    true
  );
});

test('module discovery errors warn and still produce an unlinked code map', () => {
  const dir = tempProject({
    modules: {
      discover: 'manual',
      manual: [{ id: 'broken' }],
    },
  });
  const result = run(dir);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /module context unavailable/);
  const document = JSON.parse(
    readFileSync(path.join(dir, 'artifacts/code-map.json'), 'utf8')
  );
  assert.equal(document.files[0].moduleId, undefined);
});

test('the output override requires a value and rejects repository escapes', () => {
  const dir = tempProject();
  const missing = run(dir, ['-o']);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /-o requires a path within the project root/);

  const escaped = run(dir, ['--output', '../escaped.json']);
  assert.notEqual(escaped.status, 0);
  assert.match(escaped.stderr, /must be within the project root/);
});
