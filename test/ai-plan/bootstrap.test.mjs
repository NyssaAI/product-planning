import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
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
  const dir = mkdtempSync(path.join(tmpdir(), 'code-indexer-bootstrap-test-'));
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

test('bootstrap package scripts run installed plugin tooling instead of repo-local vendored scripts', () => {
  const root = tempRepo();

  bootstrapRepo(root, { writeScripts: true });

  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.doesNotMatch(pkg.scripts['code-map'], /node scripts\/code-map\//);
  assert.doesNotMatch(pkg.scripts['code-indexer'], /node scripts\/module-map\//);
  assert.match(pkg.scripts['code-map'], /CLAUDE_PLUGIN_ROOT|CURSOR_PLUGIN_ROOT/);
  assert.match(pkg.scripts['code-indexer'], /CLAUDE_PLUGIN_ROOT|CURSOR_PLUGIN_ROOT/);
  assert.match(pkg.scripts['code-map'], /scripts\/code-map\/generate-code-map\.mjs/);
  assert.match(pkg.scripts['code-indexer'], /scripts\/module-map\/generate\.mjs/);
});

test('bootstrap replaces known stale local code-indexer package scripts', () => {
  const root = tempRepo();
  writePackage(root, {
    name: 'fixture',
    version: '0.0.0',
    scripts: {
      'code-map': 'node scripts/code-map/generate-code-map.mjs',
      'code-indexer': 'node scripts/module-map/generate.mjs',
      test: 'node --test',
    },
  });

  bootstrapRepo(root, { writeScripts: true });

  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.doesNotMatch(pkg.scripts['code-map'], /node scripts\/code-map\//);
  assert.doesNotMatch(pkg.scripts['code-indexer'], /node scripts\/module-map\//);
  assert.match(pkg.scripts['code-map'], /CLAUDE_PLUGIN_ROOT|CURSOR_PLUGIN_ROOT/);
  assert.match(pkg.scripts['code-indexer'], /CLAUDE_PLUGIN_ROOT|CURSOR_PLUGIN_ROOT/);
  assert.equal(pkg.scripts.test, 'node --test');
});

test('bootstrap package scripts resolve plugin scripts and forward arguments', () => {
  const root = tempRepo();
  const pluginRoot = mkdtempSync(path.join(tmpdir(), 'code-indexer-plugin-root-'));
  tempDirs.push(pluginRoot);

  bootstrapRepo(root, { writeScripts: true });

  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const match = /^node -e (".*") --$/.exec(pkg.scripts['code-indexer']);
  assert.notEqual(match, null);

  const calls = [];
  let exitCode = null;
  const fakeProcess = {
    argv: ['node', '--doctor'],
    env: { CLAUDE_PLUGIN_ROOT: pluginRoot },
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
      [path.join(pluginRoot, 'scripts/module-map/generate.mjs'), '--doctor'],
      { stdio: 'inherit' },
    ],
  ]);
});
