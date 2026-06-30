import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('plugin manifests share package identity and version', () => {
  const pkg = readJson('package.json');
  const codex = readJson('.codex-plugin/plugin.json');
  const claude = readJson('.claude-plugin/plugin.json');
  const cursor = readJson('.cursor-plugin/plugin.json');

  for (const manifest of [codex, claude, cursor]) {
    assert.equal(manifest.name, pkg.name);
    assert.equal(manifest.version, pkg.version);
  }

  assert.equal(codex.interface.displayName, 'Code Indexer');
  assert.equal(cursor.displayName, 'Code Indexer');
});
