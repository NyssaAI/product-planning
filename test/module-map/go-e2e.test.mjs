import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve('.');
const codeMapScript = path.join(repoRoot, 'scripts/code-map/generate-code-map.mjs');
const moduleMapScript = path.join(
  repoRoot,
  'scripts/module-map/generate-module-map.mjs'
);
const fixtureRoot = path.join(
  repoRoot,
  'test/module-map-adapters/fixtures/go-repo'
);

/** @type {string[]} */
const tempDirs = [];

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempGoProject() {
  const dir = mkdtempSync(path.join(tmpdir(), 'plan-product-go-e2e-'));
  tempDirs.push(dir);
  cpSync(fixtureRoot, dir, { recursive: true });
  writeFileSync(
    path.join(dir, 'plan-product.config.json'),
    `${JSON.stringify(
      {
        projectName: 'GoFixture',
        // vendor is deliberately a scan root: the hygiene filter, not the
        // walk configuration, must keep vendored files out of the artifacts.
        roots: ['cmd', 'internal', 'pkg', 'vendor'],
        // The fixture's packages are tiny; lower the cohesion thresholds so
        // discovery exercises the package-level path a real repo would take.
        modules: { minFiles: 1, maxFiles: 4 },
        usage: { enabled: false },
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  mkdirSync(path.join(dir, 'docs'), { recursive: true });
  for (const [name, title] of [
    ['product.md', '# Product'],
    ['features.md', '# Features'],
    ['tech-stack.md', '# Tech Stack'],
  ]) {
    writeFileSync(path.join(dir, 'docs', name), `${title}\n\nGo fixture.\n`, 'utf8');
  }
  return dir;
}

function runNode(script, cwd) {
  return spawnSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 170_000,
  });
}

function readCodeMap(dir) {
  const doc = JSON.parse(
    readFileSync(path.join(dir, 'docs/code-map/code-map.json'), 'utf8')
  );
  delete doc.generated;
  return doc;
}

test('map-code end-to-end on a Go repo produces clean Go artifacts', () => {
  const dir = tempGoProject();

  const first = runNode(codeMapScript, dir);
  assert.equal(first.status, 0, first.stderr);
  const doc = readCodeMap(dir);

  const service = doc.files.find(
    (file) => file.path === 'internal/orders/service.go'
  );
  assert.notEqual(service, undefined);
  assert.deepEqual(
    service.symbols.map((symbol) => `${symbol.kind}:${symbol.name}`),
    ['struct:Service', 'function:CreateOrder', 'method:Create']
  );

  const paths = doc.files.map((file) => file.path);
  assert.equal(paths.some((p) => p.startsWith('vendor/')), false);
  assert.equal(paths.includes('internal/orders/orders.pb.go'), false);
  assert.equal(paths.includes('internal/orders/service_test.go'), false);

  const endpointKeys = doc.endpoints.map(
    (endpoint) => `${endpoint.method ?? ''}:${endpoint.path ?? endpoint.name}`
  );
  assert.equal(endpointKeys.includes('GET:/health'), true);
  assert.equal(
    doc.endpoints.some((endpoint) => endpoint.path === '/vendored'),
    false
  );

  const second = runNode(codeMapScript, dir);
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(readCodeMap(dir), doc);
});

test('module-map generation on a Go repo derives package-level modules', () => {
  const dir = tempGoProject();
  const result = runNode(moduleMapScript, dir);
  assert.equal(result.status, 0, result.stderr);

  const moduleMap = JSON.parse(
    readFileSync(path.join(dir, 'docs/code-map/module-map.json'), 'utf8')
  );
  const roots = moduleMap.modules.map((mod) => mod.root);
  assert.equal(roots.includes('internal/orders'), true);
  assert.equal(roots.some((root) => root.startsWith('vendor')), false);
  assert.equal(roots.some((root) => root.startsWith('tools')), false);
});
