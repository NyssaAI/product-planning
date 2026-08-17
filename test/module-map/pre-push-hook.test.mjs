import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const PRE_PUSH_REGEN = path.resolve('scripts/module-map/pre-push-regen.mjs');
const INSTALLER = path.resolve('scripts/module-map/install-git-hook.mjs');

function runHook(input, env = {}) {
  return spawnSync(process.execPath, [PRE_PUSH_REGEN], {
    encoding: 'utf8',
    input,
    env: { ...process.env, PLAN_PRODUCT_HOOK_DRY_RUN: '1', ...env },
  });
}

test('plugin ships a PreToolUse pre-push hook referencing an existing script', () => {
  const manifest = JSON.parse(readFileSync('hooks/hooks.json', 'utf8'));
  const [entry] = manifest.hooks.PreToolUse;
  assert.equal(entry.matcher, 'Bash');
  const [hook] = entry.hooks;
  assert.equal(hook.type, 'command');
  assert.match(hook.command, /\$\{CLAUDE_PLUGIN_ROOT\}/);
  assert.match(hook.command, /pre-push-regen\.mjs/);
  assert.ok(existsSync(PRE_PUSH_REGEN), 'pre-push-regen.mjs exists');
});

test('pre-push-regen matches only git push commands and never blocks', () => {
  const nonPush = runHook(JSON.stringify({ tool_input: { command: 'git status' } }));
  assert.equal(nonPush.status, 0);
  assert.equal(nonPush.stdout.trim(), '');

  const push = runHook(
    JSON.stringify({ tool_input: { command: 'git push origin main' } })
  );
  assert.equal(push.status, 0);
  assert.match(push.stdout, /would regenerate/);

  const chained = runHook(
    JSON.stringify({ tool_input: { command: 'npm test && git push' } })
  );
  assert.equal(chained.status, 0);
  assert.match(chained.stdout, /would regenerate/);

  const lookalike = runHook(
    JSON.stringify({ tool_input: { command: 'echo push it to the git log' } })
  );
  assert.equal(lookalike.status, 0);
  assert.equal(lookalike.stdout.trim(), '');

  // A path containing "push" is not a push. `\b` treats the hyphen in
  // `pre-push` as a word boundary, so the old regex fired a full regeneration
  // on ordinary file operations against a hook file.
  for (const command of [
    'git add .githooks/pre-push',
    'git rm -q .githooks/pre-push scripts/setup-git-hooks.mjs',
    'git log --oneline -- .githooks/pre-push',
    'git commit -m "remove pre-push hook"',
  ]) {
    const result = runHook(JSON.stringify({ tool_input: { command } }));
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), '', `must not regenerate for: ${command}`);
  }

  // Git global options precede the subcommand and must be skipped, including
  // the ones that consume the following token as a value.
  for (const command of [
    'git -C /repo push origin main',
    'git --no-pager push',
    'git -c user.name=x push',
  ]) {
    const result = runHook(JSON.stringify({ tool_input: { command } }));
    assert.equal(result.status, 0);
    assert.match(result.stdout, /would regenerate/, `must regenerate for: ${command}`);
  }

  const noPayload = runHook('');
  assert.equal(noPayload.status, 0);
});

test('install-git-hook installs an idempotent warn-only pre-push block', (t) => {
  if (spawnSync('git', ['--version'], { encoding: 'utf8' }).status !== 0) {
    t.skip('git unavailable');
    return;
  }
  const repo = mkdtempSync(path.join(os.tmpdir(), 'pp-hook-'));
  assert.equal(spawnSync('git', ['init'], { cwd: repo }).status, 0);
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
  const skill = readFileSync('skills/install-code-map-hook/SKILL.md', 'utf8');
  assert.match(skill, /^name: install-code-map-hook$/m);
  assert.match(skill, /install-git-hook\.mjs/);
  assert.match(skill, /\$\{PLUGIN_ROOT\}/);
  assert.match(skill, /prePushRegenerate/);
  assert.match(skill, /never blocks a push/i);

  const command = readFileSync('commands/install-code-map-hook.md', 'utf8');
  assert.match(command, /Load the `install-code-map-hook` skill/);
  assert.match(command, /install-git-hook\.mjs/);
  assert.match(command, /--uninstall/);

  const readme = readFileSync('README.md', 'utf8');
  assert.match(readme, /`install-code-map-hook`/);
  assert.match(readme, /prePushRegenerate/);
});
