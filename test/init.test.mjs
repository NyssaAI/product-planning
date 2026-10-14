import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, symlinkSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initialize } from '../scripts/init.mjs';

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'product-planning-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
const configPath = root => path.join(root, '.plan-product/config.json');
const readConfig = root => JSON.parse(readFileSync(configPath(root), 'utf8'));
function setConfig(root, config) {
  mkdirSync(path.dirname(configPath(root)), { recursive: true });
  writeFileSync(configPath(root), JSON.stringify(config));
}

test('fresh install creates only planning assets and is idempotent', t => {
  const root = fixture(t);
  assert.equal(initialize(root).created.length, 11);
  assert.deepEqual(readdirSync(root).sort(), ['.plan-product','docs']);
  assert.deepEqual(readdirSync(path.join(root, 'docs')).sort(), ['features.md','product.md','tech-stack.md']);
  const before = readFileSync(configPath(root));
  assert.deepEqual(initialize(root).created, []);
  assert.deepEqual(readFileSync(configPath(root)), before);
});

test('custom paths, custom templates and documents survive repair byte for byte', t => {
  const root = fixture(t);
  initialize(root);
  const config = readConfig(root);
  config.paths.product = 'planning/vision.md';
  config.paths.productTemplate = 'formats/vision.md';
  delete config.paths.roadmapTemplate;
  config.structure.localExtension = { keep: true };
  setConfig(root, config);
  mkdirSync(path.join(root, 'formats'));
  writeFileSync(path.join(root, 'formats/vision.md'), '# My vision\r\nCustom shape\r\n');
  initialize(root);
  assert.equal(readFileSync(path.join(root, 'planning/vision.md'), 'utf8'), '# My vision\r\nCustom shape\r\n');
  writeFileSync(path.join(root, 'planning/vision.md'), '# Audience\nVolunteer coordinators\n\n# Local notes\nSigned off\n');
  rmSync(path.join(root, '.plan-product/templates/feature.md'));
  const before = readFileSync(path.join(root, 'planning/vision.md'));
  initialize(root);
  assert.deepEqual(readFileSync(path.join(root, 'planning/vision.md')), before);
  assert.equal(readConfig(root).structure.localExtension.keep, true);
  assert.ok(existsSync(path.join(root, '.plan-product/templates/feature.md')));
});

test('missing configured template is restored at its configured path', t => {
  const root = fixture(t);
  setConfig(root, { paths: { product: 'planning/vision.md', productTemplate: 'formats/vision.md' } });
  initialize(root);
  assert.ok(existsSync(path.join(root, 'formats/vision.md')));
  assert.deepEqual(readFileSync(path.join(root, 'formats/vision.md')), readFileSync(path.join(root, 'planning/vision.md')));
});

test('invalid config and escaping paths fail before creating any document', t => {
  for (const value of ['../escape.md', '..\\escape.md', 'C:/escape.md', '/escape.md']) {
    const root = fixture(t);
    setConfig(root, { paths: { product: value } });
    const before = readFileSync(configPath(root));
    assert.throws(() => initialize(root), /root|relative/);
    assert.deepEqual(readFileSync(configPath(root)), before);
    assert.equal(existsSync(path.join(root, 'docs')), false);
  }
  for (const config of [{version: 2},{paths: null},{structure: []},{structure: { features: { idPattern: 42 } }}]) {
    const root = fixture(t);
    setConfig(root, config);
    assert.throws(() => initialize(root));
    assert.equal(existsSync(path.join(root, 'docs')), false);
  }
});

test('colliding outputs fail before writes', t => {
  const root = fixture(t);
  setConfig(root, { paths: { product: 'same.md', features: 'same.md' } });
  assert.throws(() => initialize(root), /collide/);
  assert.equal(existsSync(path.join(root, '.plan-product/schema.json')), false);
});

test('external directory junction cannot redirect initialization writes', t => {
  const root = fixture(t);
  const outside = fixture(t);
  symlinkSync(outside, path.join(root, '.plan-product'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => initialize(root), /within the project root/);
  assert.deepEqual(readdirSync(outside), []);
});

test('partial custom feature roots feed naming patterns and inventory aliases', t => {
  const root = fixture(t);
  setConfig(root, { paths: { features: 'planning/catalog.md', featureDocs: 'planning/capabilities' } });
  initialize(root);
  const config = readConfig(root);
  assert.equal(config.structure.features.inventory, 'planning/catalog.md');
  assert.equal(config.structure.features.root, 'planning/capabilities');
  assert.equal(config.structure.features.featurePathPattern, 'planning/capabilities/f-nxx/feature.md');
  assert.equal(config.structure.features.useCasePathPattern, 'planning/capabilities/f-nxx/uc-nnn-short-slug.md');
});

test('file/directory conflicts fail before modifying config or creating assets', t => {
  for (const paths of [{ product: 'nested', features: 'nested/catalog.md' }, { product: 'occupied/vision.md' }, { product: '.plan-product' }]) {
    const root = fixture(t);
    setConfig(root, { paths });
    writeFileSync(path.join(root, 'occupied'), 'user file');
    const before = readFileSync(configPath(root));
    assert.throws(() => initialize(root), /collide|directory|file/);
    assert.deepEqual(readFileSync(configPath(root)), before);
    assert.equal(existsSync(path.join(root, '.plan-product/schema.json')), false);
  }
});
