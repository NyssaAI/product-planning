import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  detectTestCommands,
  detectPlaywright,
  resolveTestPlan,
} from '../../scripts/test-gate/detect.mjs';

/** @type {string[]} */
const tempDirs = [];

/**
 * Create an empty temp repo dir.
 * @returns {string} absolute path
 */
function tempRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'test-gate-detect-'));
  tempDirs.push(dir);
  return dir;
}

/**
 * Write a file relative to root, creating parent dirs.
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
 * @param {string} root
 * @param {object} pkg
 */
function writePackage(root, pkg) {
  write(root, 'package.json', `${JSON.stringify(pkg, null, 2)}\n`);
}

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// detectTestCommands — node
// ---------------------------------------------------------------------------

test('node with test script defaults to npm test (no lockfile)', () => {
  const root = tempRepo();
  writePackage(root, { name: 'fx', scripts: { test: 'jest' } });
  assert.deepEqual(detectTestCommands(root), ['npm test']);
});

test('node with test script + pnpm lockfile uses pnpm test', () => {
  const root = tempRepo();
  writePackage(root, { name: 'fx', scripts: { test: 'jest' } });
  write(root, 'pnpm-lock.yaml', '');
  assert.deepEqual(detectTestCommands(root), ['pnpm test']);
});

test('node with test script + yarn lockfile uses yarn test', () => {
  const root = tempRepo();
  writePackage(root, { name: 'fx', scripts: { test: 'jest' } });
  write(root, 'yarn.lock', '');
  assert.deepEqual(detectTestCommands(root), ['yarn test']);
});

test('node without a test script yields no command', () => {
  const root = tempRepo();
  writePackage(root, { name: 'fx', scripts: { build: 'tsc' } });
  assert.deepEqual(detectTestCommands(root), []);
});

// ---------------------------------------------------------------------------
// detectTestCommands — other stacks
// ---------------------------------------------------------------------------

test('dotnet .sln yields dotnet test', () => {
  const root = tempRepo();
  write(root, 'App.sln', '');
  assert.deepEqual(detectTestCommands(root), ['dotnet test']);
});

test('dotnet nested .csproj yields dotnet test', () => {
  const root = tempRepo();
  write(root, 'src/App/App.csproj', '<Project></Project>');
  assert.deepEqual(detectTestCommands(root), ['dotnet test']);
});

test('go.mod yields go test ./...', () => {
  const root = tempRepo();
  write(root, 'go.mod', 'module example.com/x\n');
  assert.deepEqual(detectTestCommands(root), ['go test ./...']);
});

test('Cargo.toml yields cargo test', () => {
  const root = tempRepo();
  write(root, 'Cargo.toml', '[package]\nname = "x"\n');
  assert.deepEqual(detectTestCommands(root), ['cargo test']);
});

test('multiple stacks produce an ordered list', () => {
  const root = tempRepo();
  writePackage(root, { name: 'fx', scripts: { test: 'jest' } });
  write(root, 'App.sln', '');
  write(root, 'go.mod', 'module x\n');
  assert.deepEqual(detectTestCommands(root), [
    'npm test',
    'dotnet test',
    'go test ./...',
  ]);
});

// ---------------------------------------------------------------------------
// pytest strictness — positive
// ---------------------------------------------------------------------------

test('pytest detected via pytest.ini', () => {
  const root = tempRepo();
  write(root, 'pytest.ini', '[pytest]\n');
  assert.deepEqual(detectTestCommands(root), ['pytest']);
});

test('pytest detected via pyproject [tool.pytest.ini_options]', () => {
  const root = tempRepo();
  write(
    root,
    'pyproject.toml',
    '[tool.pytest.ini_options]\nminversion = "6.0"\n'
  );
  assert.deepEqual(detectTestCommands(root), ['pytest']);
});

test('pytest detected via a test_*.py file', () => {
  const root = tempRepo();
  write(root, 'pyproject.toml', '[project]\nname = "x"\n');
  write(root, 'src/test_foo.py', 'def test_x():\n    assert True\n');
  assert.deepEqual(detectTestCommands(root), ['pytest']);
});

test('pytest detected via a *_test.py file', () => {
  const root = tempRepo();
  write(root, 'foo_test.py', 'def test_x():\n    assert True\n');
  assert.deepEqual(detectTestCommands(root), ['pytest']);
});

test('pytest detected via pytest dependency in pyproject', () => {
  const root = tempRepo();
  write(
    root,
    'pyproject.toml',
    '[project]\nname = "x"\ndependencies = ["pytest>=7"]\n'
  );
  assert.deepEqual(detectTestCommands(root), ['pytest']);
});

// ---------------------------------------------------------------------------
// pytest strictness — negative
// ---------------------------------------------------------------------------

test('bare tests/ dir with no pytest config/dep does NOT trigger pytest', () => {
  const root = tempRepo();
  write(root, 'pyproject.toml', '[project]\nname = "x"\n');
  write(root, 'tests/helper.py', 'def helper():\n    return 1\n');
  assert.deepEqual(detectTestCommands(root), []);
});

// ---------------------------------------------------------------------------
// playwright
// ---------------------------------------------------------------------------

test('playwright present when config + dep both exist', () => {
  const root = tempRepo();
  write(root, 'playwright.config.ts', 'export default {};');
  writePackage(root, {
    name: 'fx',
    devDependencies: { '@playwright/test': '^1.40.0' },
  });
  assert.deepEqual(detectPlaywright(root), {
    present: true,
    commands: ['npx playwright test'],
  });
});

test('playwright absent when config exists but dep missing', () => {
  const root = tempRepo();
  write(root, 'playwright.config.ts', 'export default {};');
  writePackage(root, { name: 'fx' });
  assert.deepEqual(detectPlaywright(root), { present: false, commands: [] });
});

test('playwright absent when dep exists but config missing', () => {
  const root = tempRepo();
  writePackage(root, {
    name: 'fx',
    devDependencies: { '@playwright/test': '^1.40.0' },
  });
  assert.deepEqual(detectPlaywright(root), { present: false, commands: [] });
});

// ---------------------------------------------------------------------------
// resolveTestPlan — config override
// ---------------------------------------------------------------------------

test('config test.commands wins verbatim over detection', () => {
  const root = tempRepo();
  // detection would yield npm test, but commands override
  writePackage(root, { name: 'fx', scripts: { test: 'jest' } });
  write(
    root,
    'ai-plan.config.json',
    JSON.stringify({ test: { commands: ['npm test', 'dotnet test'] } })
  );
  const plan = resolveTestPlan(root);
  assert.deepEqual(plan.commands, ['npm test', 'dotnet test']);
  assert.equal(plan.enabled, true);
});

test('config test.enabled:false yields a disabled empty plan', () => {
  const root = tempRepo();
  writePackage(root, { name: 'fx', scripts: { test: 'jest' } });
  write(
    root,
    'ai-plan.config.json',
    JSON.stringify({ test: { enabled: false } })
  );
  assert.deepEqual(resolveTestPlan(root), {
    enabled: false,
    commands: [],
    e2e: [],
  });
});

test('config e2e never appears in commands', () => {
  const root = tempRepo();
  writePackage(root, { name: 'fx', scripts: { test: 'jest' } });
  write(
    root,
    'ai-plan.config.json',
    JSON.stringify({ test: { e2e: ['npx playwright test'] } })
  );
  const plan = resolveTestPlan(root);
  assert.deepEqual(plan.commands, ['npm test']);
  assert.deepEqual(plan.e2e, ['npx playwright test']);
  assert.ok(!plan.commands.includes('npx playwright test'));
});

test('absent config falls back to auto-detect', () => {
  const root = tempRepo();
  write(root, 'go.mod', 'module x\n');
  const plan = resolveTestPlan(root);
  assert.deepEqual(plan.commands, ['go test ./...']);
  assert.equal(plan.enabled, true);
});

test('invalid config json is treated as absent (auto-detect, no throw)', () => {
  const root = tempRepo();
  write(root, 'Cargo.toml', '[package]\nname="x"\n');
  write(root, 'ai-plan.config.json', '{ this is not json');
  const plan = resolveTestPlan(root);
  assert.deepEqual(plan.commands, ['cargo test']);
  assert.equal(plan.enabled, true);
});

test('config without a test field falls back to auto-detect', () => {
  const root = tempRepo();
  write(root, 'go.mod', 'module x\n');
  write(root, 'ai-plan.config.json', JSON.stringify({ projectName: 'x' }));
  assert.deepEqual(resolveTestPlan(root).commands, ['go test ./...']);
});

test('config e2e falls back to detectPlaywright when absent', () => {
  const root = tempRepo();
  write(root, 'playwright.config.ts', 'export default {};');
  writePackage(root, {
    name: 'fx',
    scripts: { test: 'jest' },
    devDependencies: { '@playwright/test': '^1.40.0' },
  });
  write(
    root,
    'ai-plan.config.json',
    JSON.stringify({ test: { commands: ['npm test'] } })
  );
  const plan = resolveTestPlan(root);
  assert.deepEqual(plan.e2e, ['npx playwright test']);
});
