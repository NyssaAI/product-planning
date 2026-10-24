import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, symlinkSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initialize } from '../scripts/init.mjs';
import { migrate } from '../scripts/migrate.mjs';

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'product-planning-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
const configPath = root => path.join(root, '.nyssa-ai/plan-product/config.json');
const readConfig = root => JSON.parse(readFileSync(configPath(root), 'utf8'));
function setConfig(root, config) {
  mkdirSync(path.dirname(configPath(root)), { recursive: true });
  writeFileSync(configPath(root), JSON.stringify(config));
}

test('fresh install creates only planning assets and is idempotent', t => {
  const root = fixture(t);
  assert.equal(initialize(root).created.length, 12);
  assert.deepEqual(readdirSync(root).sort(), ['.nyssa-ai','docs']);
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
  rmSync(path.join(root, '.nyssa-ai/plan-product/templates/feature.md'));
  const before = readFileSync(path.join(root, 'planning/vision.md'));
  initialize(root);
  assert.deepEqual(readFileSync(path.join(root, 'planning/vision.md')), before);
  assert.equal(readConfig(root).structure.localExtension.keep, true);
  assert.ok(existsSync(path.join(root, '.nyssa-ai/plan-product/templates/feature.md')));
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
  for (const config of [{version: 3},{version: 1},{paths: null},{structure: []},{structure: { features: { idPattern: 42 } }}]) {
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
  assert.equal(existsSync(path.join(root, '.nyssa-ai/plan-product/schema.json')), false);
});

test('external directory junction cannot redirect initialization writes', t => {
  const root = fixture(t);
  const outside = fixture(t);
  mkdirSync(path.join(root, '.nyssa-ai'), { recursive: true });
  symlinkSync(outside, path.join(root, '.nyssa-ai/plan-product'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => initialize(root), /within the project root/);
  assert.deepEqual(readdirSync(outside), []);
});

test('partial custom feature roots feed naming patterns and inventory aliases', t => {
  const root = fixture(t);
  setConfig(root, { paths: { features: 'planning/catalog.md', featureDocs: 'planning/capabilities', concepts: 'planning/domain' } });
  initialize(root);
  const config = readConfig(root);
  assert.equal(config.structure.features.inventory, 'planning/catalog.md');
  assert.equal(config.structure.features.root, 'planning/capabilities');
  assert.equal(config.structure.features.featurePathPattern, 'planning/capabilities/f-gg.nn/feature.md');
  assert.equal(config.structure.features.useCasePathPattern, 'planning/capabilities/f-gg.nn/uc-gg.nn.uu-short-slug.md');
  assert.equal(config.structure.concepts.root, 'planning/domain');
  assert.equal(config.structure.concepts.pathPattern, 'planning/domain/c-nn-short-slug.md');
  assert.ok(existsSync(path.join(root, '.nyssa-ai/plan-product/templates/concept.md')));
});

test('file/directory conflicts fail before modifying config or creating assets', t => {
  for (const paths of [{ product: 'nested', features: 'nested/catalog.md' }, { product: 'occupied/vision.md' }, { product: '.nyssa-ai/plan-product' }]) {
    const root = fixture(t);
    setConfig(root, { paths });
    writeFileSync(path.join(root, 'occupied'), 'user file');
    const before = readFileSync(configPath(root));
    assert.throws(() => initialize(root), /collide|directory|file/);
    assert.deepEqual(readFileSync(configPath(root)), before);
    assert.equal(existsSync(path.join(root, '.nyssa-ai/plan-product/schema.json')), false);
  }
});

test('traversal characters in sub-path patterns fail before writes', t => {
  for (const pattern of ['../../escape', 'sub/dir', 'name:bad', '..']) {
    const root = fixture(t);
    setConfig(root, { structure: { features: { folderPattern: pattern } } });
    assert.throws(() => initialize(root), /traversal or separators/);
    assert.equal(existsSync(path.join(root, '.nyssa-ai/plan-product/schema.json')), false);
  }
});

test('migrate converts model v1 repositories to model v2 deterministically', t => {
  const root = fixture(t);
  const v1Config = {
    version: 1,
    paths: {
      repoRoot: '.',
      product: 'docs/product.md',
      features: 'docs/features.md',
      techStack: 'docs/tech-stack.md',
      featureDocs: 'docs/features',
      roadmap: 'docs/roadmap.md'
    },
    structure: {
      features: {
        inventory: 'docs/features.md',
        root: 'docs/features',
        idPattern: 'F-Nxx',
        folderPattern: 'f-nxx',
        featureFile: 'feature.md',
        featurePathPattern: 'docs/features/f-nxx/feature.md',
        useCaseIdPattern: 'UC-nnn',
        useCaseFilePattern: 'uc-nnn-short-slug.md',
        useCasePathPattern: 'docs/features/f-nxx/uc-nnn-short-slug.md'
      },
      roadmap: {
        file: 'docs/roadmap.md',
        idPattern: 'R-NNN'
      }
    }
  };
  mkdirSync(path.join(root, '.plan-product'), { recursive: true });
  writeFileSync(path.join(root, '.plan-product/config.json'), JSON.stringify(v1Config));
  mkdirSync(path.join(root, 'docs/features/f-101'), { recursive: true });
  writeFileSync(path.join(root, 'docs/features/f-101/feature.md'), '---\nid: F-101\nphase: 1\nstatus: planned\n---\n\n# F-101 Auth\n\n## Use Case\n- [UC-001: Login](uc-001-login.md)\n');
  writeFileSync(path.join(root, 'docs/features/f-101/uc-001-login.md'), '---\nfeature: F-101\nid: UC-001\nstatus: planned\n---\n\n# UC-001 Login\n');
  writeFileSync(path.join(root, 'docs/features.md'), '# Features\n\n| Delivery Phase | Complete |\n| --- | --- |\n\n### Phase 1 - Auth\n- [ ] F-101: [Auth](features/f-101/feature.md)\n');
  writeFileSync(path.join(root, 'docs/roadmap.md'), '# Roadmap\n\n## Slices\n- [ ] R-001: First slice — [F-101](features/f-101/feature.md)\n');

  assert.throws(() => initialize(root), /legacy/i);

  const result = migrate(root);
  assert.equal(result.configUpgraded, true);
  assert.equal(result.featuresMigrated.length, 1);
  assert.equal(result.featuresMigrated[0].newId, 'F-01.01');
  assert.equal(result.useCasesMigrated.length, 1);
  assert.equal(result.useCasesMigrated[0].newUcId, 'UC-01.01.01');

  assert.ok(existsSync(path.join(root, '.nyssa-ai/plan-product/config.json')));
  assert.equal(existsSync(path.join(root, '.plan-product')), false);
  assert.ok(existsSync(path.join(root, 'docs/features/f-01.01/feature.md')));
  assert.ok(existsSync(path.join(root, 'docs/features/f-01.01/uc-01.01.01-login.md')));
  assert.equal(existsSync(path.join(root, 'docs/features/f-101')), false);

  const featContent = readFileSync(path.join(root, 'docs/features/f-01.01/feature.md'), 'utf8');
  assert.match(featContent, /id: F-01\.01/);
  assert.match(featContent, /group: "01"/);
  assert.match(featContent, /## User Need\n\n## Use Cases/);
  assert.match(featContent, /UC-01\.01\.01/);

  const invContent = readFileSync(path.join(root, 'docs/features.md'), 'utf8');
  assert.match(invContent, /^- \[ \] F-01\.01: Auth$/m);
  assert.match(invContent, /## Feature Inventory/);
  assert.match(invContent, /\[Feature Guide: Auth\]\(features\/f-01\.01\/feature\.md\)/);

  const rdContent = readFileSync(path.join(root, 'docs/roadmap.md'), 'utf8');
  assert.match(rdContent, /## Steps/);
  assert.match(rdContent, /R-01\.01/);
  assert.match(rdContent, /F-01\.01/);

  const upgraded = initialize(root);
  assert.ok(upgraded.created.includes('.nyssa-ai/plan-product/templates/feature.md'));
  assert.deepEqual(initialize(root).created, []);
});
