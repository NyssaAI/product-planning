import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  discoverModules,
  packageIdCandidates,
} from '../../scripts/module-map/lib/discover-modules.mjs';

const CONFIG = /** @type {any} */ ({
  projectName: 'test',
  modules: { discover: 'workspaces', flows: {}, manual: [] },
});

/**
 * @param {import('node:test').TestContext} t
 * @param {Record<string, string | undefined>} packages relDir -> package name
 */
function workspaceRepo(t, packages) {
  const repo = mkdtempSync(path.join(os.tmpdir(), 'pp-ws-ids-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ name: 'root', workspaces: ['packages/*', 'apps/*'] })
  );
  for (const [relDir, name] of Object.entries(packages)) {
    mkdirSync(path.join(repo, relDir), { recursive: true });
    writeFileSync(
      path.join(repo, relDir, 'package.json'),
      JSON.stringify(name ? { name } : {})
    );
  }
  return repo;
}

test('packageIdCandidates prefers the unscoped name, then scope-name, then the directory', () => {
  assert.deepEqual(packageIdCandidates('@acme/core', 'packages/core'), ['core', 'acme-core', 'packages-core']);
  assert.deepEqual(packageIdCandidates('web', 'apps/web'), ['web', 'apps-web']);
  assert.deepEqual(packageIdCandidates(undefined, 'packages/tools'), ['tools', 'packages-tools']);
  assert.deepEqual(packageIdCandidates('@scope', 'packages/x'), ['scope', 'packages-x']);
});

test('a lone scoped package keeps its unscoped id', (t) => {
  const repo = workspaceRepo(t, { 'packages/core': '@acme/core', 'apps/web': 'web' });
  const ids = discoverModules(repo, CONFIG).map((m) => [m.id, m.root]);
  assert.deepEqual(ids, [
    ['core', 'packages/core'],
    ['web', 'apps/web'],
  ]);
});

test('colliding scoped packages become scope-name and keep their edges apart', (t) => {
  const repo = workspaceRepo(t, {
    'packages/a': '@a/core',
    'packages/b': '@b/core',
    'apps/web': 'web',
  });
  const modules = discoverModules(repo, CONFIG);
  assert.deepEqual(
    modules.map((m) => [m.id, m.name, m.root]),
    [
      ['a-core', '@a/core', 'packages/a'],
      ['b-core', '@b/core', 'packages/b'],
      ['web', 'web', 'apps/web'],
    ]
  );
  assert.equal(new Set(modules.map((m) => m.id)).size, modules.length);
});

test('exhausted candidates fall back to a numeric suffix', (t) => {
  const repo = workspaceRepo(t, {
    'packages/one': 'same',
    'packages/two': 'same',
    'apps/same': undefined,
  });
  const ids = discoverModules(repo, CONFIG).map((m) => m.id);
  assert.equal(new Set(ids).size, 3, `ids must be unique: ${ids.join(', ')}`);
  assert.deepEqual(ids, ['apps-same', 'packages-one', 'packages-two']);
});
