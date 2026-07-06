import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  loadUsageSettings,
  readUsageEvents,
  recordUsageEvent,
  writeEffectivenessReport,
} from '../../scripts/lib/usage.mjs';

const repoRoot = path.resolve('.');
const moduleMapScript = path.join(
  repoRoot,
  'scripts/module-map/generate-module-map.mjs'
);
/** @type {string[]} */
const tempDirs = [];

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempRepo(config = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'plan-product-usage-test-'));
  tempDirs.push(dir);
  writeFileSync(
    path.join(dir, 'plan-product.config.json'),
    `${JSON.stringify(config, null, 2)}\n`,
    'utf8'
  );
  return dir;
}

test('recordUsageEvent writes local JSONL and report summarizes command health', () => {
  const dir = tempRepo({
    usage: {
      enabled: true,
      events: '.plan-product/usage/events.jsonl',
      effectivenessReport: 'docs/code-map/effectiveness.md',
    },
  });

  recordUsageEvent(
    dir,
    {
      command: 'map-code',
      status: 'ok',
      durationMs: 125,
      summary: 'map-code completed',
      warnings: [],
      errors: [],
    },
    { now: new Date('2026-07-06T10:00:00.000Z') }
  );
  recordUsageEvent(
    dir,
    {
      command: 'map-code',
      status: 'error',
      durationMs: 250,
      summary: 'map-code failed',
      warnings: ['CODE_MAP_STALE'],
      errors: ['boom'],
    },
    { now: new Date('2026-07-06T10:01:00.000Z') }
  );

  const usage = readUsageEvents(dir);
  assert.equal(usage.events.length, 2);
  assert.equal(usage.invalidLines, 0);

  const result = writeEffectivenessReport(dir, {
    doctorReport: {
      ok: true,
      checks: [{ id: 'required-docs', status: 'pass', message: 'Docs ok' }],
    },
    now: new Date('2026-07-06T10:02:00.000Z'),
  });
  assert.equal(result.ok, true);
  assert.equal(result.wrote, 'docs/code-map/effectiveness.md');

  const report = readFileSync(
    path.join(dir, 'docs/code-map/effectiveness.md'),
    'utf8'
  );
  assert.match(report, /Usage events: 2/);
  assert.match(report, /\| `map-code` \| 2 \| 1 \| 1 \| 1 \|/);
  assert.match(report, /This report uses local command usage events/);
  assert.match(report, /does not include provenance/);
});

test('usage capture can be disabled in config and re-enabled by env', () => {
  const dir = tempRepo({
    usage: {
      enabled: false,
      events: '.plan-product/usage/events.jsonl',
    },
  });

  const skipped = recordUsageEvent(dir, {
    command: 'doctor',
    status: 'ok',
  });
  assert.equal(skipped.recorded, false);
  assert.equal(skipped.skipped, true);
  assert.equal(existsSync(path.join(dir, '.plan-product/usage/events.jsonl')), false);

  const settings = loadUsageSettings(dir, { PLAN_PRODUCT_USAGE: '1' });
  const recorded = recordUsageEvent(
    dir,
    {
      command: 'doctor',
      status: 'ok',
    },
    { settings }
  );
  assert.equal(recorded.recorded, true);
  assert.equal(readUsageEvents(dir, { settings }).events.length, 1);
});

test('generate-module-map --help is read-only and does not record usage', () => {
  const dir = tempRepo({
    usage: {
      enabled: true,
      events: '.plan-product/usage/events.jsonl',
    },
  });

  const result = spawnSync(process.execPath, [moduleMapScript, '--help'], {
    cwd: dir,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Usage: generate-module-map/);
  assert.equal(existsSync(path.join(dir, '.plan-product/usage/events.jsonl')), false);
  assert.equal(existsSync(path.join(dir, 'docs/code-map/module-map.json')), false);
});

test('--effectiveness --json writes a markdown effectiveness report', () => {
  const dir = tempRepo({
    projectName: 'Fixture',
    outputDir: 'docs/code-map',
    usage: {
      enabled: true,
      events: '.plan-product/usage/events.jsonl',
      effectivenessReport: 'docs/code-map/effectiveness.md',
    },
  });

  const result = spawnSync(process.execPath, [moduleMapScript, '--effectiveness', '--json'], {
    cwd: dir,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.ok, true);
  assert.equal(payload.wrote, 'docs/code-map/effectiveness.md');
  assert.equal(
    existsSync(path.join(dir, 'docs/code-map/effectiveness.md')),
    true
  );
});
