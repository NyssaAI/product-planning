import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATOR_CONFIG, resolveGeneratorConfigPath } from '../../scripts/lib/generator-config.mjs';
import { loadCodeMapConfig } from '../../scripts/code-map/lib/code-map-config.mjs';
import { loadPatternRuntimeConfig } from '../../scripts/code-map/lib/patterns/runtime-config.mjs';
import { loadPlanProductConfig, writeStarterConfigs } from '../../scripts/module-map/lib/config.mjs';
import { bootstrapRepo } from '../../scripts/module-map/lib/bootstrap.mjs';
import { pinModule, unpinModule } from '../../scripts/module-map/lib/pin.mjs';
import { findProjectRoot } from '../../scripts/module-map/lib/project-root.mjs';
import { loadUsageSettings } from '../../scripts/lib/usage.mjs';
import { captureMapInputs } from '../../scripts/lib/map-freshness.mjs';

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'pp-generator-config-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function put(root, relative, value) {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
}

test('bootstrap creates a namespaced generator config and pins stay there', t => {
  const root = fixture(t);
  bootstrapRepo(root);
  assert.ok(existsSync(path.join(root, GENERATOR_CONFIG)));
  assert.equal(existsSync(path.join(root, 'plan-product.config.json')), false);
  assert.equal(pinModule(root, 'api', [{ id: 'api', root: 'src/api', name: 'API', description: 'API' }]).ok, true);
  assert.equal(JSON.parse(readFileSync(path.join(root, GENERATOR_CONFIG))).modules.pinned[0].id, 'api');
  assert.equal(unpinModule(root, 'api').ok, true);
  assert.equal(existsSync(path.join(root, 'plan-product.config.json')), false);
});

test('all readers prefer namespaced settings and keep configured paths repo-relative', t => {
  const root = fixture(t);
  put(root, 'plan-product.config.json', { roots: ['old'], outputDir: 'old-map', usage: { enabled: true } });
  put(root, GENERATOR_CONFIG, {
    roots: ['source'], output: 'context/symbols.json', outputDir: 'context',
    modules: { minFiles: 7 }, usage: { enabled: false }, patterns: { catalogs: ['custom.json'] },
  });
  assert.deepEqual(loadCodeMapConfig(root).roots, ['source']);
  assert.equal(loadCodeMapConfig(root).output, 'context/symbols.json');
  assert.equal(loadPlanProductConfig(root).modules.minFiles, 7);
  assert.equal(loadPlanProductConfig(root).outputDir, 'context');
  assert.deepEqual(loadPatternRuntimeConfig(root).catalogs, ['custom.json']);
  assert.equal(loadUsageSettings(root, {}).enabled, false);
  mkdirSync(path.join(root, 'source/nested'), { recursive: true });
  assert.equal(findProjectRoot(path.join(root, 'source/nested')), root);
});

test('legacy configs remain editable and moving the file preserves settings', t => {
  const root = fixture(t);
  const legacy = path.join(root, 'plan-product.config.json');
  put(root, 'plan-product.config.json', { roots: ['app'], modules: { minFiles: 4 }, usage: { enabled: false } });
  writeStarterConfigs(root);
  assert.equal(existsSync(path.join(root, GENERATOR_CONFIG)), false, 'bootstrap must not shadow legacy settings with defaults');
  assert.equal(pinModule(root, 'api', [{ id: 'api', root: 'app', name: 'API', description: 'API' }]).ok, true);
  const original = readFileSync(legacy);
  mkdirSync(path.dirname(path.join(root, GENERATOR_CONFIG)), { recursive: true });
  renameSync(legacy, path.join(root, GENERATOR_CONFIG));
  assert.deepEqual(readFileSync(resolveGeneratorConfigPath(root)), original);
  assert.deepEqual(loadCodeMapConfig(root).roots, ['app']);
  assert.equal(loadUsageSettings(root, {}).enabled, false);
  assert.equal(unpinModule(root, 'api').ok, true);
  assert.equal(existsSync(legacy), false);
});

test('malformed namespaced config does not fall back to a valid legacy config', t => {
  const root = fixture(t);
  put(root, 'plan-product.config.json', { roots: ['old'] });
  put(root, GENERATOR_CONFIG, '{invalid');
  assert.throws(() => loadCodeMapConfig(root), /not valid JSON/);
  assert.throws(() => loadPlanProductConfig(root), SyntaxError);
});

test('freshness fingerprints include namespaced configuration content', t => {
  const root = fixture(t);
  put(root, GENERATOR_CONFIG, { roots: [], modules: { minFiles: 2 } });
  const before = captureMapInputs(root).fingerprint;
  put(root, GENERATOR_CONFIG, { roots: [], modules: { minFiles: 3 } });
  assert.notEqual(captureMapInputs(root).fingerprint, before);
});

test('pre-push respects namespaced opt-out over legacy opt-in', t => {
  const root = fixture(t);
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: root }).status, 0);
  put(root, '.plan-product/config.json', {});
  put(root, 'plan-product.config.json', { prePushRegenerate: true });
  put(root, GENERATOR_CONFIG, { prePushRegenerate: false });
  const result = spawnSync(process.execPath, [path.join(pluginRoot, 'scripts/module-map/pre-push-regen.mjs')], {
    cwd: root, encoding: 'utf8', env: { ...process.env, PLAN_PRODUCT_HOOK_DRY_RUN: '1' },
  });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
});

test('bootstrap and pins reject a namespaced directory linked outside the repo', t => {
  const root = fixture(t);
  const outside = fixture(t);
  symlinkSync(outside, path.join(root, '.jamaynor'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => bootstrapRepo(root), /within the project root/);
  assert.throws(() => pinModule(root, 'api', [{ id: 'api', root: 'src' }]), /within the project root/);
  assert.equal(existsSync(path.join(outside, 'plan-product')), false);
  assert.equal(existsSync(path.join(root, '.plan-product')), false, 'preflight must fail before other initialization writes');
});
