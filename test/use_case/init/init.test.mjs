import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, symlinkSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { initialize } from '../../../src/init/init.mjs';

const PLUGIN_ROOT = path.resolve(import.meta.dirname, '../../..');

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'product-planning-init-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

const configPath = root => path.join(root, '.nyssa-ai/plan-product/config.json');
const readConfig = root => JSON.parse(readFileSync(configPath(root), 'utf8'));
function setConfig(root, config) {
  mkdirSync(path.dirname(configPath(root)), { recursive: true });
  writeFileSync(configPath(root), JSON.stringify(config));
}

test('fresh install is zero-footprint by default (creates only 4 canonical docs/ files, zero .nyssa-ai/) and is idempotent', t => {
  const root = fixture(t);
  const first = initialize(root, { userHome: null });
  assert.equal(first.zeroFootprint, true);
  assert.equal(first.created.length, 4);
  assert.deepEqual(readdirSync(root).sort(), ['docs']);
  assert.equal(existsSync(path.join(root, '.nyssa-ai')), false);
  assert.deepEqual(
    readdirSync(path.join(root, 'docs')).sort(),
    ['GLOSSARY.md', 'features.md', 'product.md', 'tech-stack.md']
  );
  const second = initialize(root, { userHome: null });
  assert.deepEqual(second.created, []);
  assert.equal(existsSync(path.join(root, '.nyssa-ai')), false);
});

test('initialize supports monorepo --unit convention and user_home custom templates without writing .nyssa-ai/ into repo', t => {
  const userHome = fixture(t);
  const repoRoot = fixture(t);
  const unrelatedCwd = fixture(t);

  mkdirSync(path.join(userHome, '.nyssa-ai/plan-product/templates'), { recursive: true });
  writeFileSync(
    path.join(userHome, '.nyssa-ai/plan-product/config.json'),
    JSON.stringify({ paths: { glossary: 'docs/GLOSSARY.md', product: 'planning/product.md' } })
  );
  writeFileSync(
    path.join(userHome, '.nyssa-ai/plan-product/templates/product.md'),
    '# User Home Product Template\nCustom org heading.\n'
  );

  // Repo stays zero-footprint while honoring user_home config and custom template
  initialize(repoRoot, { userHome });
  assert.equal(existsSync(path.join(repoRoot, '.nyssa-ai')), false);
  assert.equal(
    readFileSync(path.join(repoRoot, 'planning/product.md'), 'utf8'),
    '# User Home Product Template\nCustom org heading.\n'
  );
  assert.ok(existsSync(path.join(repoRoot, 'docs/GLOSSARY.md')));

  // Opt-in repo_root sparse override beats user_home without copying stock templates
  const repoWithOverride = fixture(t);
  setConfig(repoWithOverride, { paths: { product: 'docs/custom-product.md' } });
  initialize(repoWithOverride, { userHome });
  assert.equal(
    readFileSync(path.join(repoWithOverride, 'docs/custom-product.md'), 'utf8'),
    '# User Home Product Template\nCustom org heading.\n'
  );
  assert.equal(existsSync(path.join(repoWithOverride, '.nyssa-ai/plan-product/templates')), false);

  // CLI --repo-root + --unit seeds monorepo unit docs cleanly with zero .nyssa-ai/
  const cliRepo = fixture(t);
  execFileSync(
    process.execPath,
    [path.join(PLUGIN_ROOT, 'src/init/init.mjs'), '--repo-root', cliRepo, '--unit', 'tools/crm'],
    { cwd: unrelatedCwd }
  );
  assert.ok(existsSync(path.join(cliRepo, 'tools/crm/docs/GLOSSARY.md')));
  assert.equal(existsSync(path.join(cliRepo, 'tools/crm/.nyssa-ai')), false);
  assert.equal(existsSync(path.join(cliRepo, '.nyssa-ai')), false);
});

test('opt-in writeConfig mode materializes .nyssa-ai/plan-product/ config, schema, and templates and preserves custom templates', t => {
  const root = fixture(t);
  const first = initialize(root, { userHome: null, writeConfig: true });
  assert.equal(first.zeroFootprint, false);
  assert.equal(first.created.length, 14);
  assert.deepEqual(readdirSync(root).sort(), ['.nyssa-ai', 'docs']);
  assert.deepEqual(
    readdirSync(path.join(root, '.nyssa-ai/plan-product/templates')).sort(),
    [
      'concept.md',
      'development-plan.md',
      'feature.md',
      'features.md',
      'glossary.md',
      'product.md',
      'tech-stack.md',
      'use-case.md',
    ]
  );

  const config = readConfig(root);
  config.paths.product = 'planning/vision.md';
  config.paths.productTemplate = 'formats/vision.md';
  delete config.paths.developmentPlanTemplate;
  config.structure.localExtension = { keep: true };
  setConfig(root, config);
  mkdirSync(path.join(root, 'formats'));
  writeFileSync(path.join(root, 'formats/vision.md'), '# My vision\r\nCustom shape\r\n');
  initialize(root, { userHome: null, writeConfig: true });
  assert.equal(readFileSync(path.join(root, 'planning/vision.md'), 'utf8'), '# My vision\r\nCustom shape\r\n');
  writeFileSync(path.join(root, 'planning/vision.md'), '# Audience\nVolunteer coordinators\n\n# Local notes\nSigned off\n');
  rmSync(path.join(root, '.nyssa-ai/plan-product/templates/feature.md'));
  const before = readFileSync(path.join(root, 'planning/vision.md'));
  initialize(root, { userHome: null, writeConfig: true });
  assert.deepEqual(readFileSync(path.join(root, 'planning/vision.md')), before);
  assert.equal(readConfig(root).structure.localExtension.keep, true);
  assert.ok(existsSync(path.join(root, '.nyssa-ai/plan-product/templates/feature.md')));
  assert.ok(existsSync(path.join(root, '.nyssa-ai/plan-product/templates/development-plan.md')));
});

test('missing configured template is restored at its configured path when writeConfig is true', t => {
  const root = fixture(t);
  setConfig(root, { paths: { product: 'planning/vision.md', productTemplate: 'formats/vision.md' } });
  initialize(root, { userHome: null, writeConfig: true });
  assert.ok(existsSync(path.join(root, 'formats/vision.md')));
  assert.deepEqual(readFileSync(path.join(root, 'formats/vision.md')), readFileSync(path.join(root, 'planning/vision.md')));
});

test('invalid config, legacy roadmap keys, and escaping paths fail before creating any document', t => {
  for (const value of ['../escape.md', '..\\escape.md', 'C:/escape.md', '/escape.md']) {
    const root = fixture(t);
    setConfig(root, { paths: { product: value } });
    const before = readFileSync(configPath(root));
    assert.throws(() => initialize(root, { userHome: null }), /repo_root|repo-relative/);
    assert.deepEqual(readFileSync(configPath(root)), before);
    assert.equal(existsSync(path.join(root, 'docs')), false);
  }
  for (const config of [
    { version: 3 },
    { version: 1 },
    { paths: { roadmap: 'docs/roadmap.md' } },
    { paths: null },
    { structure: [] },
    { structure: { features: { idPattern: 42 } } },
  ]) {
    const root = fixture(t);
    setConfig(root, config);
    assert.throws(() => initialize(root, { userHome: null }));
    assert.equal(existsSync(path.join(root, 'docs')), false);
  }
});

test('colliding outputs, external junctions, file/directory conflicts, and traversal patterns fail safely', t => {
  {
    const root = fixture(t);
    setConfig(root, { paths: { product: 'same.md', features: 'same.md' } });
    assert.throws(() => initialize(root, { userHome: null }), /collide/);
    assert.equal(existsSync(path.join(root, '.nyssa-ai/plan-product/schema.json')), false);
  }
  {
    const root = fixture(t);
    const outside = fixture(t);
    mkdirSync(path.join(root, '.nyssa-ai'), { recursive: true });
    symlinkSync(outside, path.join(root, '.nyssa-ai/plan-product'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => initialize(root, { userHome: null }), /within repo_root/);
    assert.deepEqual(readdirSync(outside), []);
  }
  for (const paths of [
    { product: 'nested', features: 'nested/catalog.md' },
    { product: 'occupied/vision.md' },
    { product: '.nyssa-ai/plan-product' },
  ]) {
    const root = fixture(t);
    setConfig(root, { paths });
    writeFileSync(path.join(root, 'occupied'), 'user file');
    const before = readFileSync(configPath(root));
    assert.throws(() => initialize(root, { userHome: null }), /collide|directory|file/);
    assert.deepEqual(readFileSync(configPath(root)), before);
    assert.equal(existsSync(path.join(root, '.nyssa-ai/plan-product/schema.json')), false);
  }
  for (const pattern of ['../../escape', 'sub/dir', 'name:bad', '..']) {
    const root = fixture(t);
    setConfig(root, { structure: { features: { folderPattern: pattern } } });
    assert.throws(() => initialize(root, { userHome: null }), /traversal or separators/);
    assert.equal(existsSync(path.join(root, '.nyssa-ai/plan-product/schema.json')), false);
  }
});

test('partial custom feature, concept, and developmentPlan paths synchronize aliases when writeConfig is true', t => {
  const root = fixture(t);
  setConfig(root, {
    paths: {
      features: 'planning/catalog.md',
      featureDocs: 'planning/capabilities',
      concepts: 'planning/domain',
      developmentPlan: 'planning/plans/development-plan.md',
    },
  });
  initialize(root, { userHome: null, writeConfig: true });
  const config = readConfig(root);
  assert.equal(config.structure.features.inventory, 'planning/catalog.md');
  assert.equal(config.structure.features.root, 'planning/capabilities');
  assert.equal(config.structure.features.featurePathPattern, 'planning/capabilities/f-gg.nn/feature.md');
  assert.equal(config.structure.features.useCasePathPattern, 'planning/capabilities/f-gg.nn/uc-gg.nn.uu-short-slug.md');
  assert.equal(config.structure.concepts.root, 'planning/domain');
  assert.equal(config.structure.concepts.pathPattern, 'planning/domain/c-nn-short-slug.md');
  assert.equal(config.structure.developmentPlan.file, 'planning/plans/development-plan.md');
  assert.equal(config.structure.developmentPlan.idPattern, 'DP-pp.ss');
});
