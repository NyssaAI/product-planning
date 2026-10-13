import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { discoverModules } from '../../scripts/module-map/lib/discover-modules.mjs';
import { findPluginRoot, isPlanProductPluginRoot } from '../../scripts/lib/plugin-root.mjs';

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'plan-product-discovery-review-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function json(root, file, value) {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(value));
}

test('glob discovery combines all configured patterns and deduplicates roots before assigning IDs', (t) => {
  const root = fixture(t);
  json(root, 'packages/a/package.json', { name: '@a/core' });
  json(root, 'services/b/package.json', { name: '@b/core' });
  const modules = discoverModules(root, {
    modules: { discover: 'glob', globs: ['packages/*', 'services/*', 'packages/a'], flows: {} },
  });
  assert.deepEqual(modules.map(m => [m.id, m.root]), [
    ['a-core', 'packages/a'], ['b-core', 'services/b'],
  ]);
});

test('plugin identity rejects foreign and malformed manifests and accepts supported identities', (t) => {
  const root = fixture(t);
  json(root, '.claude-plugin/plugin.json', { name: 'other-plugin' });
  assert.equal(isPlanProductPluginRoot(root), false);
  writeFileSync(path.join(root, '.claude-plugin/plugin.json'), '{broken');
  assert.equal(isPlanProductPluginRoot(root), false);
  for (const manifest of ['.claude-plugin', '.codex-plugin', '.cursor-plugin']) {
    const candidate = fixture(t);
    json(candidate, `${manifest}/plugin.json`, { name: 'plan-product' });
    assert.equal(isPlanProductPluginRoot(candidate), true, manifest);
  }
});

test('foreign Claude environment override falls back to the actual plugin', (t) => {
  const foreign = fixture(t);
  const actual = fixture(t);
  json(foreign, '.claude-plugin/plugin.json', { name: 'other-plugin' });
  json(actual, '.codex-plugin/plugin.json', { name: 'plan-product' });
  const keys = ['PLAN_PRODUCT_PLUGIN_ROOT', 'PLUGIN_ROOT', 'CLAUDE_PLUGIN_ROOT', 'CURSOR_PLUGIN_ROOT'];
  const saved = new Map(keys.map(key => [key, process.env[key]]));
  try {
    for (const key of keys) delete process.env[key];
    process.env.CLAUDE_PLUGIN_ROOT = foreign;
    assert.equal(findPluginRoot(path.join(actual, 'scripts')), actual);
    delete process.env.CLAUDE_PLUGIN_ROOT;
    assert.equal(findPluginRoot(path.join(foreign, 'scripts')), null);
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
