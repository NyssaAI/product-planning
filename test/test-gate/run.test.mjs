import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runGate } from '../../scripts/test-gate/run.mjs';

/** @type {string[]} */
const tempDirs = [];

/** @returns {string} */
function tempRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'test-gate-run-'));
  tempDirs.push(dir);
  return dir;
}

/**
 * @param {string} root
 * @param {string} rel
 * @param {string} content
 */
function write(root, rel, content) {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8');
}

/**
 * Build a fake spawn that returns scripted statuses (one per call) and records
 * the commands it was invoked with.
 * @param {number[]} statuses
 */
function fakeSpawn(statuses) {
  const calls = [];
  let i = 0;
  const spawn = (cmd) => {
    calls.push(cmd);
    const status = i < statuses.length ? statuses[i] : 0;
    i += 1;
    return { status };
  };
  spawn.calls = calls;
  return spawn;
}

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('all commands pass → exit 0, every command invoked in order', () => {
  const root = tempRepo();
  write(
    root,
    'ai-plan.config.json',
    JSON.stringify({ test: { commands: ['cmd-a', 'cmd-b'] } })
  );
  const spawn = fakeSpawn([0, 0]);
  const code = runGate(root, { spawn });
  assert.equal(code, 0);
  assert.deepEqual(spawn.calls, ['cmd-a', 'cmd-b']);
});

test('first command fails → exit 1 and second command NOT invoked', () => {
  const root = tempRepo();
  write(
    root,
    'ai-plan.config.json',
    JSON.stringify({ test: { commands: ['cmd-a', 'cmd-b'] } })
  );
  const spawn = fakeSpawn([1, 0]);
  const code = runGate(root, { spawn });
  assert.equal(code, 1);
  assert.deepEqual(spawn.calls, ['cmd-a']);
});

test('second command fails → exit 1, both invoked, none after', () => {
  const root = tempRepo();
  write(
    root,
    'ai-plan.config.json',
    JSON.stringify({ test: { commands: ['cmd-a', 'cmd-b', 'cmd-c'] } })
  );
  const spawn = fakeSpawn([0, 2, 0]);
  const code = runGate(root, { spawn });
  assert.equal(code, 1);
  assert.deepEqual(spawn.calls, ['cmd-a', 'cmd-b']);
});

test('empty commands (no tests, no config) → exit 0, spawn never called', () => {
  const root = tempRepo();
  // empty repo → no detection, no config
  const spawn = fakeSpawn([]);
  const code = runGate(root, { spawn });
  assert.equal(code, 0);
  assert.deepEqual(spawn.calls, []);
});

test('test.enabled:false → exit 0, spawn never called', () => {
  const root = tempRepo();
  // detection would yield a command, but disabled
  write(root, 'go.mod', 'module x\n');
  write(
    root,
    'ai-plan.config.json',
    JSON.stringify({ test: { enabled: false } })
  );
  const spawn = fakeSpawn([1]);
  const code = runGate(root, { spawn });
  assert.equal(code, 0);
  assert.deepEqual(spawn.calls, []);
});

test('detected commands (no config) are run', () => {
  const root = tempRepo();
  write(root, 'go.mod', 'module x\n');
  const spawn = fakeSpawn([0]);
  const code = runGate(root, { spawn });
  assert.equal(code, 0);
  assert.deepEqual(spawn.calls, ['go test ./...']);
});

test('e2e is never run by the gate', () => {
  const root = tempRepo();
  write(
    root,
    'ai-plan.config.json',
    JSON.stringify({
      test: { commands: ['cmd-a'], e2e: ['npx playwright test'] },
    })
  );
  const spawn = fakeSpawn([0]);
  const code = runGate(root, { spawn });
  assert.equal(code, 0);
  assert.deepEqual(spawn.calls, ['cmd-a']);
  assert.ok(!spawn.calls.includes('npx playwright test'));
});

test('a spawn result with null status is treated as failure', () => {
  const root = tempRepo();
  write(
    root,
    'ai-plan.config.json',
    JSON.stringify({ test: { commands: ['cmd-a', 'cmd-b'] } })
  );
  const spawn = (cmd) => {
    spawn.calls.push(cmd);
    return { status: null };
  };
  spawn.calls = [];
  const code = runGate(root, { spawn });
  assert.equal(code, 1);
  assert.deepEqual(spawn.calls, ['cmd-a']);
});
