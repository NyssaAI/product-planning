import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseTestConfig, loadAiPlanConfig } from '../../scripts/module-map/lib/config.mjs';

test('parseTestConfig: absent → enabled with empty lists', () => {
  assert.deepEqual(parseTestConfig(undefined), {
    enabled: true,
    commands: [],
    e2e: [],
  });
});

test('parseTestConfig: enabled:false disables, lists empty', () => {
  assert.deepEqual(parseTestConfig({ enabled: false }), {
    enabled: false,
    commands: [],
    e2e: [],
  });
});

test('parseTestConfig: commands and e2e preserved verbatim', () => {
  assert.deepEqual(parseTestConfig({ commands: ['npm test', 'dotnet test'], e2e: ['npx playwright test'] }), {
    enabled: true,
    commands: ['npm test', 'dotnet test'],
    e2e: ['npx playwright test'],
  });
});

test('parseTestConfig: non-string entries dropped, non-array → []', () => {
  assert.deepEqual(parseTestConfig({ commands: [1, 'x', null, 'y'], e2e: 'nope' }), {
    enabled: true,
    commands: ['x', 'y'],
    e2e: [],
  });
});

test('loadAiPlanConfig: surfaces the parsed test field', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'aiplan-test-cfg-'));
  try {
    writeFileSync(
      path.join(dir, 'code-indexer.config.json'),
      JSON.stringify({ test: { commands: ['pytest'], enabled: true } })
    );
    const config = loadAiPlanConfig(dir);
    assert.deepEqual(config.test, { enabled: true, commands: ['pytest'], e2e: [] });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
