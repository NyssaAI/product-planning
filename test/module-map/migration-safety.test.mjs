import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { bootstrapRepo } from '../../scripts/module-map/lib/bootstrap.mjs';
import { runMigrate } from '../../scripts/module-map/lib/migrate.mjs';

function fixture(t) {
  const base = mkdtempSync(path.join(tmpdir(), 'init-safety-'));
  const root = path.join(base, 'repo');
  const outside = path.join(base, 'outside');
  mkdirSync(root); mkdirSync(outside);
  t.after(() => rmSync(base, { recursive: true, force: true }));
  return { root, outside };
}
for (const relative of ['.plan-product/templates', '.claude', 'docs']) {
  test(`bootstrap rejects external junction ${relative} before writes`, (t) => {
    const { root, outside } = fixture(t);
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    symlinkSync(outside, path.join(root, relative), 'junction');
    writeFileSync(path.join(outside, 'settings.json'), '{}');
    assert.throws(() => bootstrapRepo(root, { writeScripts: true }), /within the project root/);
    assert.equal(existsSync(path.join(root, 'plan-product.config.json')), false);
    assert.equal(readFileSync(path.join(outside, 'settings.json'), 'utf8'), '{}');
    assert.equal(existsSync(path.join(outside, 'product.md')), false);
  });
}
for (const relative of ['docs/code-map/context', 'docs/code-map/context/scopes', 'docs/code-map/modules']) {
  test(`migration rejects external junction ${relative} before moves`, (t) => {
    const { root, outside } = fixture(t);
    mkdirSync(path.join(root, 'docs/code-map/context'), { recursive: true });
    if (relative.endsWith('/context')) rmSync(path.join(root, relative), { recursive: true });
    symlinkSync(outside, path.join(root, relative), 'junction');
    writeFileSync(path.join(outside, 'INDEX.md'), 'CODE_MAP.json');
    writeFileSync(path.join(root, 'docs/code-map/CODE_MAP.json'), '{}');
    assert.throws(() => runMigrate(root), /within the project root/);
    assert.equal(readFileSync(path.join(outside, 'INDEX.md'), 'utf8'), 'CODE_MAP.json');
    assert.equal(existsSync(path.join(root, 'docs/code-map/CODE_MAP.json')), true);
    assert.equal(existsSync(path.join(root, 'docs/features.md')), false);
  });
}
test('migration preserves existing targets and remains idempotent', (t) => {
  const { root } = fixture(t);
  mkdirSync(path.join(root, 'docs/code-map/context/scopes'), { recursive: true });
  writeFileSync(path.join(root, 'docs/code-map/context/INDEX.md'), 'CODE_MAP.json scopes/x.md');
  writeFileSync(path.join(root, 'docs/code-map/context/scopes/x.md'), 'user module');
  writeFileSync(path.join(root, 'docs/features.md'), 'user features');
  runMigrate(root);
  assert.equal(readFileSync(path.join(root, 'docs/code-map/index.md'), 'utf8'), 'code-map.json modules/x.md');
  assert.equal(readFileSync(path.join(root, 'docs/features.md'), 'utf8'), 'user features');
  assert.equal(runMigrate(root).every(a => a.kind === 'skipped'), true);
});
for (const relative of ['package.json', '.claude/settings.json', 'plan-product.config.json']) {
  test(`bootstrap rejects external file symlink ${relative}`, (t) => {
    const { root, outside } = fixture(t);
    const file = path.join(outside, 'data.json');
    writeFileSync(file, '{}');
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    if (!fileSymlink(t, file, path.join(root, relative))) return;
    assert.throws(() => bootstrapRepo(root, { writeScripts: true }), /within the project root/);
    assert.equal(readFileSync(file, 'utf8'), '{}');
    assert.equal(existsSync(path.join(root, '.plan-product')), false);
  });
}
for (const name of ['index.md', 'module-map.json']) {
  test(`migration rejects external patch target ${name} before moves`, (t) => {
    const { root, outside } = fixture(t);
    const file = path.join(outside, name);
    writeFileSync(file, 'scopes/ CODE_MAP.json "planningScope"');
    mkdirSync(path.join(root, 'docs/code-map'), { recursive: true });
    if (!fileSymlink(t, file, path.join(root, 'docs/code-map', name))) return;
    assert.throws(() => runMigrate(root), /within the project root/);
    assert.equal(readFileSync(file, 'utf8'), 'scopes/ CODE_MAP.json "planningScope"');
  });
}

function fileSymlink(t, target, link) {
  try { symlinkSync(target, link, 'file'); return true; }
  catch (error) {
    if (error.code !== 'EPERM' || process.platform !== 'win32') throw error;
    t.skip('Windows file symlinks require developer mode or elevation');
    return false;
  }
}
