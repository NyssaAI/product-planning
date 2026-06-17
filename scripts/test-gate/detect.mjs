// Self-contained polyglot test detection for the test push-gate.
//
// This file is vendored into consumer repos (alongside run.mjs) and must
// import nothing outside scripts/test-gate/. Pure file reads only — no process
// spawning. Reads ai-plan.config.json from the repo root for config overrides.

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import path from 'node:path';

/** Directories never descended into during recursive marker scans. */
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'venv',
  '.venv',
  'env',
  '.env',
  '.tox',
  '__pycache__',
  'dist',
  'build',
  'target',
  '.next',
  'bin',
  'obj',
]);

/**
 * Safely read + JSON.parse a file. Returns null on any error (missing/invalid).
 * @param {string} file
 * @returns {any}
 */
function readJsonSafe(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Safely read a text file. Returns '' on any error.
 * @param {string} file
 * @returns {string}
 */
function readTextSafe(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

/**
 * Walk the repo tree (skipping SKIP_DIRS) testing each file basename against a
 * predicate. Returns true on first match. Bounded by directory skip list.
 * @param {string} root
 * @param {(name: string) => boolean} matchFile
 * @returns {boolean}
 */
function anyFile(root, matchFile) {
  /** @type {string[]} */
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    /** @type {import('node:fs').Dirent[]} */
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        stack.push(path.join(dir, entry.name));
      } else if (entry.isFile() && matchFile(entry.name)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * True if any file in the tree (skip list applied) has an extension in `exts`.
 * @param {string} root
 * @param {string[]} exts lowercase, with leading dot
 * @returns {boolean}
 */
function anyFileWithExt(root, exts) {
  return anyFile(root, (name) =>
    exts.includes(path.extname(name).toLowerCase())
  );
}

/**
 * Choose the package-manager test command from the lockfile present.
 * @param {string} repoRoot
 * @returns {string}
 */
function nodeTestCommand(repoRoot) {
  if (existsSync(path.join(repoRoot, 'pnpm-lock.yaml'))) return 'pnpm test';
  if (existsSync(path.join(repoRoot, 'yarn.lock'))) return 'yarn test';
  return 'npm test';
}

/**
 * Detect whether pytest should be considered present, applying strictness rules:
 * a bare `tests/` dir must NOT trigger pytest. Detect only when:
 *   - pytest.ini exists; OR
 *   - pyproject.toml / setup.cfg contains [tool.pytest.ini_options] / [pytest]
 *     or lists pytest as a dependency; OR
 *   - a test_*.py / *_test.py file exists anywhere (skip list applied).
 * @param {string} repoRoot
 * @returns {boolean}
 */
function detectPytest(repoRoot) {
  if (existsSync(path.join(repoRoot, 'pytest.ini'))) return true;

  for (const name of ['pyproject.toml', 'setup.cfg']) {
    const file = path.join(repoRoot, name);
    if (!existsSync(file)) continue;
    const text = readTextSafe(file);
    if (
      text.includes('[tool.pytest.ini_options]') ||
      text.includes('[pytest]') ||
      /(^|\W)pytest(\W|$)/m.test(text)
    ) {
      return true;
    }
  }

  return anyFile(
    repoRoot,
    (name) => /^test_.*\.py$/.test(name) || /.*_test\.py$/.test(name)
  );
}

/**
 * Produce the ordered polyglot list of unit/integration test commands.
 * @param {string} repoRoot
 * @returns {string[]}
 */
export function detectTestCommands(repoRoot) {
  /** @type {string[]} */
  const commands = [];

  const pkgPath = path.join(repoRoot, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = readJsonSafe(pkgPath);
    if (pkg && pkg.scripts && typeof pkg.scripts.test === 'string') {
      commands.push(nodeTestCommand(repoRoot));
    }
  }

  if (anyFileWithExt(repoRoot, ['.sln', '.csproj'])) {
    commands.push('dotnet test');
  }

  if (detectPytest(repoRoot)) {
    commands.push('pytest');
  }

  if (existsSync(path.join(repoRoot, 'go.mod'))) {
    commands.push('go test ./...');
  }

  if (existsSync(path.join(repoRoot, 'Cargo.toml'))) {
    commands.push('cargo test');
  }

  return commands;
}

/**
 * Detect Playwright E2E. True only when a playwright config exists AND
 * @playwright/test is a (dev)dependency in package.json.
 * @param {string} repoRoot
 * @returns {{ present: boolean, commands: string[] }}
 */
export function detectPlaywright(repoRoot) {
  const hasConfig = ['ts', 'js', 'mjs', 'cjs'].some((ext) =>
    existsSync(path.join(repoRoot, `playwright.config.${ext}`))
  );
  if (!hasConfig) return { present: false, commands: [] };

  const pkg = readJsonSafe(path.join(repoRoot, 'package.json'));
  const hasDep = Boolean(
    pkg &&
      ((pkg.dependencies && pkg.dependencies['@playwright/test']) ||
        (pkg.devDependencies && pkg.devDependencies['@playwright/test']))
  );
  if (!hasDep) return { present: false, commands: [] };

  return { present: true, commands: ['npx playwright test'] };
}

/**
 * @typedef {object} TestPlan
 * @property {boolean} enabled
 * @property {string[]} commands
 * @property {string[]} e2e
 */

/**
 * Resolve the effective test plan, honoring ai-plan.config.json `test` field.
 * Missing/invalid config is treated as absent (auto-detect); never throws.
 * @param {string} repoRoot
 * @returns {TestPlan}
 */
export function resolveTestPlan(repoRoot) {
  const config = readJsonSafe(path.join(repoRoot, 'ai-plan.config.json'));
  const test =
    config && typeof config === 'object' ? config.test : undefined;

  // No (valid) test config → full auto-detect.
  if (!test || typeof test !== 'object') {
    return {
      enabled: true,
      commands: detectTestCommands(repoRoot),
      e2e: detectPlaywright(repoRoot).commands,
    };
  }

  if (test.enabled === false) {
    return { enabled: false, commands: [], e2e: [] };
  }

  const commands = Array.isArray(test.commands)
    ? test.commands.slice()
    : detectTestCommands(repoRoot);

  const e2e = Array.isArray(test.e2e)
    ? test.e2e.slice()
    : detectPlaywright(repoRoot).commands;

  return { enabled: true, commands, e2e };
}
