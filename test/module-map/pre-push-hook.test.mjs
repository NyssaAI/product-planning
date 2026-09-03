import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const PRE_PUSH_REGEN = path.join(REPO_ROOT, 'scripts/module-map/pre-push-regen.mjs');
const REGEN = path.join(REPO_ROOT, 'scripts/module-map/regen-if-source-changed.mjs');
const INSTALLER = path.join(REPO_ROOT, 'scripts/module-map/install-git-hook.mjs');

function gitAvailable() {
  return spawnSync('git', ['--version'], { encoding: 'utf8' }).status === 0;
}

/** @param {import('node:test').TestContext} t */
function scratchRepo(t) {
  const repo = mkdtempSync(path.join(os.tmpdir(), 'pp-hook-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  assert.equal(spawnSync('git', ['init', '-q'], { cwd: repo }).status, 0);
  return repo;
}

function runPrePush(cwd, env = {}) {
  return spawnSync(process.execPath, [PRE_PUSH_REGEN, '--git-hook'], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

test('plugin ships no runtime hook manifest', () => {
  assert.equal(existsSync(path.join(REPO_ROOT, 'hooks')), false, 'hooks/ must not exist');
  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.files.includes('hooks/'), false);
});

test('pre-push-regen does nothing in a repo without .plan-product/config.json', (t) => {
  if (!gitAvailable()) {
    t.skip('git unavailable');
    return;
  }
  const repo = scratchRepo(t);
  writeFileSync(path.join(repo, 'a.txt'), 'hello\n');

  const result = runPrePush(repo);
  assert.equal(result.status, 0);
  assert.equal(result.stderr.trim(), '');
  assert.equal(existsSync(path.join(repo, 'docs')), false, 'no docs/ created');
  assert.equal(existsSync(path.join(repo, '.temp')), false, 'no .temp/ created');
});

test('pre-push-regen honors the dry run and opt-out in a plan-product repo', (t) => {
  if (!gitAvailable()) {
    t.skip('git unavailable');
    return;
  }
  const repo = scratchRepo(t);
  mkdirSync(path.join(repo, '.plan-product'));
  writeFileSync(path.join(repo, '.plan-product/config.json'), '{}');

  const dry = runPrePush(repo, { PLAN_PRODUCT_HOOK_DRY_RUN: '1' });
  assert.equal(dry.status, 0);
  assert.match(dry.stderr, /would regenerate/);

  writeFileSync(
    path.join(repo, 'plan-product.config.json'),
    JSON.stringify({ prePushRegenerate: false })
  );
  const optedOut = runPrePush(repo, { PLAN_PRODUCT_HOOK_DRY_RUN: '1' });
  assert.equal(optedOut.status, 0);
  assert.equal(optedOut.stderr.trim(), '');
});

test('a failing generator exits non-zero from --run, logs under .temp, and warns without blocking', (t) => {
  if (!gitAvailable()) {
    t.skip('git unavailable');
    return;
  }
  const repo = scratchRepo(t);
  mkdirSync(path.join(repo, '.plan-product'));
  writeFileSync(path.join(repo, '.plan-product/config.json'), '{}');
  // No docs/ at all, so generate-module-map fails with MISSING_DOCS.

  const run = spawnSync(process.execPath, [REGEN, '--run'], {
    cwd: repo,
    encoding: 'utf8',
  });
  assert.notEqual(run.status, 0, 'run mode must report the generator failure');
  assert.match(run.stderr, /generate-module-map\.mjs failed/);

  const logFile = path.join(repo, '.temp', 'regen.log');
  assert.ok(existsSync(logFile), '.temp/regen.log written');
  assert.match(readFileSync(logFile, 'utf8'), /ERROR generate-module-map\.mjs/);
  assert.equal(readFileSync(path.join(repo, '.temp', '.gitignore'), 'utf8').trim(), '*');
  assert.equal(
    existsSync(path.join(repo, 'docs/code-map/.regen.log')),
    false,
    'log must not live in the code-map directory'
  );

  const hook = runPrePush(repo);
  assert.equal(hook.status, 0, 'hook never blocks');
  assert.match(hook.stderr, /regeneration failed; push continues/);
  assert.match(hook.stderr, /generate-module-map\.mjs/);
});

test('install-git-hook installs an idempotent warn-only pre-push block', (t) => {
  if (!gitAvailable()) {
    t.skip('git unavailable');
    return;
  }
  const repo = scratchRepo(t);
  const hookFile = path.join(repo, '.git', 'hooks', 'pre-push');

  const install = spawnSync(process.execPath, [INSTALLER], {
    cwd: repo,
    encoding: 'utf8',
  });
  assert.equal(install.status, 0, install.stderr);
  const text = readFileSync(hookFile, 'utf8');
  assert.match(text, />>> plan-product pre-push hook >>>/);
  assert.match(text, /pre-push-regen\.mjs" --git-hook \|\| true/);

  const reinstall = spawnSync(process.execPath, [INSTALLER], {
    cwd: repo,
    encoding: 'utf8',
  });
  assert.equal(reinstall.status, 0, reinstall.stderr);
  const markers = readFileSync(hookFile, 'utf8').match(/>>> plan-product/g);
  assert.equal(markers.length, 1, 'reinstall keeps a single block');

  const uninstall = spawnSync(process.execPath, [INSTALLER, '--uninstall'], {
    cwd: repo,
    encoding: 'utf8',
  });
  assert.equal(uninstall.status, 0, uninstall.stderr);
  assert.doesNotMatch(readFileSync(hookFile, 'utf8'), />>> plan-product/);
});

test('install-code-map-hook skill and command route through the installer', () => {
  const skill = readFileSync(path.join(REPO_ROOT, 'skills/install-code-map-hook/SKILL.md'), 'utf8');
  assert.match(skill, /^name: install-code-map-hook$/m);
  assert.match(skill, /install-git-hook\.mjs/);
  assert.match(skill, /\$\{PLUGIN_ROOT\}/);
  assert.match(skill, /prePushRegenerate/);
  assert.match(skill, /never blocks a push/i);
  assert.match(skill, /ships no runtime-level hook/);
  assert.doesNotMatch(skill, /hooks\/hooks\.json/);

  const command = readFileSync(path.join(REPO_ROOT, 'commands/install-code-map-hook.md'), 'utf8');
  assert.match(command, /Load the `install-code-map-hook` skill/);
  assert.match(command, /install-git-hook\.mjs/);
  assert.match(command, /--uninstall/);
  assert.doesNotMatch(command, /hooks\/hooks\.json/);

  const readme = readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8');
  assert.match(readme, /`install-code-map-hook`/);
  assert.match(readme, /prePushRegenerate/);
  assert.doesNotMatch(readme, /hooks\/hooks\.json/);
});
