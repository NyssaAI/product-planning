import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve('.');
const script = path.join(repoRoot, 'scripts/module-map/generate-module-map.mjs');
/** @type {string[]} */
const tempDirs = [];

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempProject(outputDir = 'docs/code-map') {
  const dir = mkdtempSync(path.join(tmpdir(), 'plan-product-generate-arch-'));
  tempDirs.push(dir);
  writeFileSync(
    path.join(dir, 'plan-product.config.json'),
    `${JSON.stringify(
      {
        projectName: 'Fixture',
        outputDir,
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  mkdirSync(path.join(dir, outputDir), { recursive: true });
  return dir;
}

function writeModuleMap(dir, outputDir = 'docs/code-map') {
  writeFileSync(
    path.join(dir, outputDir, 'module-map.json'),
    `${JSON.stringify(
      {
        schemaVersion: '1.0',
        generated: '2026-06-30T00:00:00.000Z',
        project: { name: 'Fixture' },
        modules: [
          {
            id: 'api',
            name: 'API',
            root: 'src/api',
            description: 'HTTP API layer.',
            capabilities: ['API handlers'],
            dependsOn: ['lib'],
            usedBy: [],
            planningModule: `${outputDir}/modules/api.md`,
          },
          {
            id: 'lib',
            name: 'Lib',
            root: 'src/lib',
            description: 'Shared library.',
            capabilities: ['Shared helpers'],
            dependsOn: [],
            usedBy: ['api'],
            planningModule: `${outputDir}/modules/lib.md`,
          },
        ],
        edges: [{ from: 'api', to: 'lib' }],
        codeMap: 'docs/code-map/code-map.json',
        stats: { moduleCount: 2, routeCount: 0 },
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}

function runArch(dir, args = ['--arch', '--json']) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: dir,
    encoding: 'utf8',
  });
}

test('--arch --json writes system-architecture.md from module-map.json', () => {
  const dir = tempProject();
  writeModuleMap(dir);

  const result = runArch(dir);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.ok, true);
  assert.deepEqual(payload.wrote, ['docs/code-map/system-architecture.md']);
  assert.equal(payload.modules, 2);
  assert.equal(payload.edges, 1);

  const arch = readFileSync(
    path.join(dir, 'docs/code-map/system-architecture.md'),
    'utf8'
  );
  assert.match(arch, /# Fixture System Architecture/);
  assert.match(arch, /## Component Tree/);
  assert.match(arch, /\|-- Lib \(lib\)/);
  assert.match(arch, /\|   \|-- depends on: -/);
  assert.match(arch, /`-- API \(api\)/);
  assert.match(arch, /    \|-- depends on: lib/);
  assert.ok(
    arch.indexOf('|-- Lib (lib)') < arch.indexOf('`-- API (api)'),
    'arch output lists zero-dependency modules before dependent modules'
  );
  assert.doesNotMatch(arch, /```mermaid/);
});

test('--arch renders configured module-map path when outputDir is custom', () => {
  const outputDir = 'build/index';
  const dir = tempProject(outputDir);
  writeModuleMap(dir, outputDir);

  const result = runArch(dir);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.deepEqual(payload.wrote, ['build/index/system-architecture.md']);

  const arch = readFileSync(
    path.join(dir, 'build/index/system-architecture.md'),
    'utf8'
  );
  assert.match(arch, /Generated from `build\/index\/module-map\.json`/);
  assert.doesNotMatch(arch, /Generated from `docs\/code-index\/module-map\.json`/);
});

test('--arch preserves existing agent-authored overview region', () => {
  const dir = tempProject();
  writeModuleMap(dir);
  writeFileSync(
    path.join(dir, 'docs/code-map/system-architecture.md'),
    [
      '# Fixture System Architecture',
      '',
      '<!-- plan-product:system-overview:start -->',
      'Agents should start with the API boundary.',
      '<!-- plan-product:system-overview:end -->',
      '',
    ].join('\n'),
    'utf8'
  );

  const result = runArch(dir);
  assert.equal(result.status, 0, result.stderr);

  const arch = readFileSync(
    path.join(dir, 'docs/code-map/system-architecture.md'),
    'utf8'
  );
  assert.match(arch, /Agents should start with the API boundary\./);
});

test('--arch --json fails with parseable JSON when module-map.json is missing', () => {
  const dir = tempProject();

  const result = runArch(dir);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.ok, false);
  assert.deepEqual(payload.wrote, []);
  assert.match(payload.errors[0], /MISSING_MODULE_MAP/);
});

test('--arch --json reports unsafe output paths as structured failures', () => {
  const dir = tempProject();
  const outside = tempProject();
  writeModuleMap(dir);
  writeFileSync(path.join(outside, 'sentinel'), 'unchanged');
  symlinkSync(outside, path.join(dir, 'docs/code-map/system-architecture.md'),
    process.platform === 'win32' ? 'junction' : 'dir');
  const result = runArch(dir);
  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.deepEqual(payload.wrote, []);
  assert.match(payload.errors[0], /ARCH_WRITE_FAILED.*within the project root/);
  assert.equal(readFileSync(path.join(outside, 'sentinel'), 'utf8'), 'unchanged');
});
