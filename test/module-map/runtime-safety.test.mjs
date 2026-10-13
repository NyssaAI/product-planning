import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordUsageEvent, writeEffectivenessReport } from '../../scripts/lib/usage.mjs';
import { resolveRepoContainedPath } from '../../scripts/lib/repo-paths.mjs';
import { pinModule, unpinModule } from '../../scripts/module-map/lib/pin.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const generator = path.join(root, 'scripts/module-map/generate-module-map.mjs');
const installer = path.join(root, 'scripts/module-map/install-git-hook.mjs');
function scratch(t) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'pp-runtime-review-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function run(script, cwd, args = []) {
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });
}
function configure(dir, modules) {
  writeFileSync(path.join(dir, 'plan-product.config.json'), JSON.stringify({ roots: [], modules }));
}
for (const [name, modules] of [
  ['manual traversal', { discover: 'manual', manual: [{ id: '../../../victim', root: 'src' }] }],
  ['pinned traversal', { discover: 'manual', pinned: [{ id: '../../../victim', root: 'src' }] }],
  ['backslash traversal', { discover: 'manual', manual: [{ id: '..\\..\\..\\victim', root: 'src' }] }],
  ['duplicate ids', { discover: 'manual', manual: [{ id: 'same', root: 'a' }, { id: 'same', root: 'b' }] }],
  ['case collisions', { discover: 'manual', manual: [{ id: 'Core', root: 'a' }, { id: 'core', root: 'b' }] }],
]) test(`module generator rejects ${name} before writing artifacts`, t => {
  const dir = scratch(t); configure(dir, modules);
  writeFileSync(path.join(dir, 'victim.md'), 'user document');
  const result = run(generator, dir, ['--json']);
  assert.notEqual(result.status, 0, result.stdout);
  assert.equal(readFileSync(path.join(dir, 'victim.md'), 'utf8'), 'user document');
  assert.equal(existsSync(path.join(dir, 'docs/code-map/index.md')), false);
});
test('module generator rejects module output directory junction outside repository', t => {
  const parent = scratch(t), dir = path.join(parent, 'repo'), outside = path.join(parent, 'outside');
  mkdirSync(path.join(dir, 'docs/code-map'), { recursive: true }); mkdirSync(outside);
  symlinkSync(outside, path.join(dir, 'docs/code-map/modules'), process.platform === 'win32' ? 'junction' : 'dir');
  configure(dir, { discover: 'manual', manual: [{ id: 'safe', root: 'src' }] });
  const result = run(generator, dir, ['--json']);
  assert.notEqual(result.status, 0, result.stdout);
  assert.equal(existsSync(path.join(outside, 'safe.md')), false);
  assert.equal(existsSync(path.join(dir, 'docs/code-map/index.md')), false);
});
test('hook installer help and unknown options do not create hooks', t => {
  const dir = scratch(t); assert.equal(spawnSync('git', ['init', '-q'], { cwd: dir }).status, 0);
  const help = run(installer, dir, ['--help']); assert.equal(help.status, 0); assert.match(help.stdout, /Usage:/);
  const bad = run(installer, dir, ['--not-an-option']); assert.notEqual(bad.status, 0);
  assert.equal(existsSync(path.join(dir, '.git/hooks/pre-push')), false);
});
test('hook installer creates a missing configured hooks directory', t => {
  const dir = scratch(t); assert.equal(spawnSync('git', ['init', '-q'], { cwd: dir }).status, 0);
  assert.equal(spawnSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: dir }).status, 0);
  const result = run(installer, dir); assert.equal(result.status, 0, result.stderr);
  assert.ok(existsSync(path.join(dir, '.githooks/pre-push')));
});
test('installed hook treats shell metacharacters in plugin directory literally', t => {
  const shell = process.platform === 'win32' ? 'C:/Program Files/Git/bin/sh.exe' : '/bin/sh';
  if (!existsSync(shell)) return t.skip('POSIX shell unavailable');
  const dir = scratch(t); assert.equal(spawnSync('git', ['init', '-q'], { cwd: dir }).status, 0);
  const plugin = path.join(dir, "plugin space $(touch SENTINEL) `touch BACKTICK` 'quoted'"); mkdirSync(plugin);
  copyFileSync(installer, path.join(plugin, 'install.mjs'));
  writeFileSync(path.join(plugin, 'pre-push-regen.mjs'), "import {writeFileSync} from 'node:fs'; writeFileSync('CALLED', 'yes');\n");
  const install = run(path.join(plugin, 'install.mjs'), dir); assert.equal(install.status, 0, install.stderr);
  const result = spawnSync(shell, [path.join(dir, '.git/hooks/pre-push')], { cwd: dir, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(path.join(dir, 'SENTINEL')), false);
  assert.equal(existsSync(path.join(dir, 'BACKTICK')), false);
  assert.equal(readFileSync(path.join(dir, 'CALLED'), 'utf8'), 'yes');
});
test('usage ledger and report cannot write through an external junction', t => {
  const parent = scratch(t), dir = path.join(parent, 'repo'), outside = path.join(parent, 'outside');
  mkdirSync(dir); mkdirSync(outside);
  symlinkSync(outside, path.join(dir, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  const result = recordUsageEvent(dir, { command: 'test' }, { settings: { enabled: true, eventsPath: 'linked/events.jsonl' } });
  assert.equal(result.recorded, false);
  assert.equal(existsSync(path.join(outside, 'events.jsonl')), false);
  assert.equal(existsSync(path.join(outside, '.gitignore')), false);
  writeFileSync(path.join(dir, 'plan-product.config.json'), JSON.stringify({ usage: { effectivenessReport: 'linked/report.md' } }));
  assert.throws(() => writeEffectivenessReport(dir), /within the project root/);
  assert.equal(existsSync(path.join(outside, 'report.md')), false);
});

test('containment rejects a dangling external directory link before creating targets', t => {
  const parent = scratch(t), dir = path.join(parent, 'repo');
  mkdirSync(dir);
  symlinkSync(path.join(parent, 'missing'), path.join(dir, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => resolveRepoContainedPath(dir, 'linked/events.jsonl', 'test output'), /within the project root/);
  assert.equal(existsSync(path.join(parent, 'missing')), false);
});

test('usage refuses a dangling external ledger symlink without creating its target', t => {
  const parent = scratch(t), dir = path.join(parent, 'repo'), outside = path.join(parent, 'missing.jsonl');
  mkdirSync(dir);
  try { symlinkSync(outside, path.join(dir, 'events.jsonl'), 'file'); }
  catch (error) { if (error.code === 'EPERM') return t.skip('file symlink privilege unavailable'); throw error; }
  const result = recordUsageEvent(dir, { command: 'test' }, { settings: { enabled: true, eventsPath: 'events.jsonl' } });
  assert.equal(result.recorded, false);
  assert.equal(existsSync(outside), false);
});

test('pin and unpin cannot overwrite a configuration symlink outside the repository', t => {
  const parent = scratch(t), dir = path.join(parent, 'repo'), outside = path.join(parent, 'config.json');
  mkdirSync(dir);
  const original = JSON.stringify({ modules: { pinned: [{ id: 'old', root: 'old' }] } });
  writeFileSync(outside, original);
  try { symlinkSync(outside, path.join(dir, 'plan-product.config.json'), 'file'); }
  catch (error) { if (error.code === 'EPERM') return t.skip('file symlink privilege unavailable'); throw error; }
  assert.throws(() => pinModule(dir, 'new', [{ id: 'new', root: 'new' }]), /within the project root/);
  assert.throws(() => unpinModule(dir, 'old'), /within the project root/);
  assert.equal(readFileSync(outside, 'utf8'), original);
});
