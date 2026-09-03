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
import vm from 'node:vm';
import { bootstrapRepo } from '../../scripts/module-map/lib/bootstrap.mjs';

/** @type {string[]} */
const tempDirs = [];

function tempRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'plan-product-bootstrap-test-'));
  tempDirs.push(dir);
  writePackage(dir, { name: 'fixture', version: '0.0.0' });
  return dir;
}

function writePackage(root, pkg) {
  writeFileSync(
    path.join(root, 'package.json'),
    `${JSON.stringify(pkg, null, 2)}\n`,
    'utf8'
  );
}

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('bootstrap package scripts use plan-product command names', () => {
  const root = tempRepo();

  bootstrapRepo(root, { writeScripts: true });

  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.equal(pkg.scripts['code-map'], undefined);
  assert.equal(pkg.scripts['plan-product'], undefined);
  assert.match(pkg.scripts['map-code'], /PLAN_PRODUCT_PLUGIN_ROOT/);
  assert.match(pkg.scripts['map-code'], /scripts\/map-code\/generate\.mjs/);
  assert.doesNotMatch(pkg.scripts['map-code'], /scripts\/module-map\/generate\.mjs/);
  assert.match(pkg.scripts['map-architecture'], /--arch/);
  assert.match(pkg.scripts['map-architecture'], /generate-module-map\.mjs/);
  assert.match(pkg.scripts['find-code-patterns'], /generate-patterns\.mjs/);
  for (const relPath of [
    '.plan-product/config.json',
    '.plan-product/schema.json',
    '.plan-product/templates/product.md',
    '.plan-product/templates/features.md',
    '.plan-product/templates/tech-stack.md',
    '.plan-product/templates/feature.md',
    '.plan-product/templates/use-case.md',
    '.plan-product/templates/roadmap.md',
    '.plan-product/templates/pattern-library.json',
    '.plan-product/templates/pattern-expectations.json',
  ]) {
    assert.equal(existsSync(path.join(root, relPath)), true, relPath);
  }
  assert.equal(
    existsSync(path.join(root, 'docs/roadmap.md')),
    false,
    'bootstrap must not scaffold docs/roadmap.md — plan-roadmap creates it'
  );
  assert.equal(
    existsSync(path.join(root, '.plan-product/patterns/library.json')),
    true
  );
  assert.equal(
    existsSync(path.join(root, '.plan-product/patterns/expectations.json')),
    true
  );
  assert.equal(
    readFileSync(path.join(root, 'docs/product.md'), 'utf8').trimEnd(),
    readFileSync('.plan-product/templates/product.md', 'utf8').trimEnd()
  );
  assert.equal(
    readFileSync(path.join(root, 'docs/features.md'), 'utf8').trimEnd(),
    readFileSync('.plan-product/templates/features.md', 'utf8').trimEnd()
  );
  assert.equal(
    readFileSync(path.join(root, 'docs/tech-stack.md'), 'utf8').trimEnd(),
    readFileSync('.plan-product/templates/tech-stack.md', 'utf8').trimEnd()
  );
});

test('bootstrap removes known stale local plan-product package scripts', () => {
  const root = tempRepo();
  writePackage(root, {
    name: 'fixture',
    version: '0.0.0',
    scripts: {
      'code-map': 'node scripts/code-map/generate-code-map.mjs',
      'plan-product': 'node scripts/module-map/generate.mjs',
      'map-architecture': 'node scripts/module-map/generate.mjs --arch',
      test: 'node --test',
    },
  });

  bootstrapRepo(root, { writeScripts: true });

  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.equal(pkg.scripts['code-map'], undefined);
  assert.equal(pkg.scripts['plan-product'], undefined);
  assert.match(pkg.scripts['map-code'], /PLAN_PRODUCT_PLUGIN_ROOT/);
  assert.match(pkg.scripts['map-architecture'], /PLAN_PRODUCT_PLUGIN_ROOT/);
  assert.match(pkg.scripts['map-architecture'], /generate-module-map\.mjs/);
  assert.equal(pkg.scripts.test, 'node --test');
});

test('bootstrap fails clearly instead of creating an empty project manifest', () => {
  const root = tempRepo();

  assert.throws(
    () => bootstrapRepo(root, { withProjectManifest: true }),
    /jamaynor\.project\.json.*(?:missing|not found)/i
  );

  assert.equal(existsSync(path.join(root, 'jamaynor.project.json')), false);
});

test('map-architecture package script resolves plugin root and forwards arguments', () => {
  const root = tempRepo();
  const pluginRoot = mkdtempSync(path.join(tmpdir(), 'plan-product-plugin-root-'));
  tempDirs.push(pluginRoot);

  bootstrapRepo(root, { writeScripts: true });

  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const match = /^node -e (".*") --$/.exec(pkg.scripts['map-architecture']);
  assert.notEqual(match, null);

  const calls = [];
  let exitCode = null;
  const fakeProcess = {
    argv: ['node', '--json'],
    env: { PLAN_PRODUCT_PLUGIN_ROOT: pluginRoot },
    execPath: 'node',
    exit(code) {
      exitCode = code;
    },
  };

  vm.runInNewContext(JSON.parse(match[1]), {
    console,
    process: fakeProcess,
    require(specifier) {
      if (specifier === 'node:path') {
        return path;
      }
      if (specifier === 'node:child_process') {
        return {
          spawnSync(...args) {
            calls.push(args);
            return { status: 0 };
          },
        };
      }
      throw new Error(`unexpected require: ${specifier}`);
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    [
      'node',
      [path.join(pluginRoot, 'scripts/module-map/generate-module-map.mjs'), '--arch', '--json'],
      { stdio: 'inherit' },
    ],
  ]);
});
