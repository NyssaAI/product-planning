#!/usr/bin/env node
// Non-destructive installer for the pre-push test gate.
//
// Runs under the agent (where the plugin root IS resolvable). It:
//   1. Vendors the self-contained runner (run.mjs + detect.mjs) into the
//      consumer repo at .githooks/test-gate.mjs + .githooks/detect.mjs.
//      Always refreshed on every run so a plugin upgrade re-vendors.
//   2. Wires a pre-push hook NON-DESTRUCTIVELY (integrate, never clobber),
//      picking the first applicable of: husky, tracked core.hooksPath,
//      or a fresh .githooks/pre-push + `git config core.hooksPath .githooks`.
//
// Idempotent via a guard marker so re-runs never duplicate the injected line
// and existing hook bodies are preserved.

import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  chmodSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { findPluginRoot } from './lib/plugin-root.mjs';

const GUARD_OPEN = '# >>> dev-tools test-gate >>>';
const GUARD_CLOSE = '# <<< dev-tools test-gate <<<';
const GATE_INVOKE = 'node .githooks/test-gate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the dev-tools plugin root. Honors CLAUDE_PLUGIN_ROOT /
 * CURSOR_PLUGIN_ROOT, then falls back to findPluginRoot() from this script's dir.
 * @returns {string}
 */
function resolvePluginRoot() {
  const env =
    process.env.CLAUDE_PLUGIN_ROOT?.trim() ||
    process.env.CURSOR_PLUGIN_ROOT?.trim();
  if (env) return path.resolve(env);

  const found = findPluginRoot(HERE);
  if (found) return found;

  throw new Error(
    'setup-test-gate: could not resolve the dev-tools plugin root. ' +
      'Set CLAUDE_PLUGIN_ROOT or CURSOR_PLUGIN_ROOT.'
  );
}

/**
 * Run a git command in the repo, returning trimmed stdout or '' on failure.
 * @param {string} repo
 * @param {string[]} args
 * @returns {string}
 */
function git(repo, args) {
  try {
    return execFileSync('git', ['-C', repo, ...args], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Build the guarded block injected into shell hooks.
 * @returns {string}
 */
function guardedBlock() {
  return `${GUARD_OPEN}\n${GATE_INVOKE}\n${GUARD_CLOSE}`;
}

/**
 * Ensure the guarded test-gate block is present exactly once in `file`,
 * creating the file with `shebang` if it does not exist. Existing content is
 * preserved; re-runs are idempotent (the guard markers are replaced in place).
 * @param {string} file
 * @param {string} shebang line with no trailing newline
 * @returns {'created'|'appended'|'unchanged'}
 */
function ensureGuardedLine(file, shebang) {
  const block = guardedBlock();

  if (!existsSync(file)) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `${shebang}\n\n${block}\n`);
    try {
      chmodSync(file, 0o755);
    } catch {
      /* chmod is a best-effort no-op on some platforms */
    }
    return 'created';
  }

  const existing = readFileSync(file, 'utf8');

  // Already guarded → replace the block in place (refresh), report unchanged
  // if byte-identical.
  const open = existing.indexOf(GUARD_OPEN);
  if (open !== -1) {
    const closeIdx = existing.indexOf(GUARD_CLOSE, open);
    if (closeIdx !== -1) {
      const end = closeIdx + GUARD_CLOSE.length;
      const replaced =
        existing.slice(0, open) + block + existing.slice(end);
      if (replaced === existing) return 'unchanged';
      writeFileSync(file, replaced);
      return 'unchanged';
    }
  }

  // Append the guarded block, preserving existing body.
  const sep = existing.endsWith('\n') ? '' : '\n';
  writeFileSync(file, `${existing}${sep}\n${block}\n`);
  try {
    chmodSync(file, 0o755);
  } catch {
    /* best effort */
  }
  return 'appended';
}

/**
 * Vendor run.mjs → .githooks/test-gate.mjs and detect.mjs → .githooks/detect.mjs.
 * Always refreshed.
 * @param {string} pluginRoot
 * @param {string} repo
 * @returns {string[]} log lines
 */
function vendorRunner(pluginRoot, repo) {
  const srcDir = path.join(pluginRoot, 'scripts', 'test-gate');
  const destDir = path.join(repo, '.githooks');
  mkdirSync(destDir, { recursive: true });

  const pairs = [
    ['run.mjs', 'test-gate.mjs'],
    ['detect.mjs', 'detect.mjs'],
  ];
  const log = [];
  for (const [src, dest] of pairs) {
    const from = path.join(srcDir, src);
    if (!existsSync(from)) {
      throw new Error(`setup-test-gate: missing source runner ${from}`);
    }
    copyFileSync(from, path.join(destDir, dest));
    log.push(`vendored .githooks/${dest}`);
  }
  return log;
}

/**
 * Wire the pre-push hook non-destructively. Returns log lines.
 * @param {string} repo
 * @returns {string[]}
 */
function wireHook(repo) {
  const log = [];

  // (a) husky
  if (existsSync(path.join(repo, '.husky'))) {
    const huskyHook = path.join(repo, '.husky', 'pre-push');
    const action = ensureGuardedLine(
      huskyHook,
      '#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh" 2>/dev/null || true'
    );
    log.push(`husky: .husky/pre-push ${action}`);
    return log;
  }

  // (b) tracked core.hooksPath
  const hooksPath = git(repo, ['config', '--get', 'core.hooksPath']);
  if (hooksPath) {
    const dir = path.isAbsolute(hooksPath)
      ? hooksPath
      : path.join(repo, hooksPath);
    const hook = path.join(dir, 'pre-push');
    const action = ensureGuardedLine(hook, '#!/usr/bin/env bash');
    log.push(`core.hooksPath (${hooksPath}): pre-push ${action}`);
    return log;
  }

  // (c) fresh .githooks/pre-push + set core.hooksPath
  const hook = path.join(repo, '.githooks', 'pre-push');
  const action = ensureGuardedLine(hook, '#!/usr/bin/env bash');
  log.push(`.githooks/pre-push ${action}`);
  git(repo, ['config', 'core.hooksPath', '.githooks']);
  log.push('set core.hooksPath .githooks');
  return log;
}

/**
 * Install (or refresh) the test gate into `repo`.
 * @param {string} repo
 * @param {string} pluginRoot
 * @returns {string[]} log lines
 */
export function setupTestGate(repo, pluginRoot) {
  const log = [];
  log.push(...vendorRunner(pluginRoot, repo));
  log.push(...wireHook(repo));
  return log;
}

/* c8 ignore start — CLI entry, exercised via integration test */
function isMain() {
  if (!process.argv[1]) return false;
  try {
    return fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
}

if (isMain()) {
  const repo = path.resolve(process.argv[2] || process.cwd());
  const pluginRoot = resolvePluginRoot();
  const log = setupTestGate(repo, pluginRoot);
  process.stdout.write(
    `dev-tools test-gate installed into ${repo}\n` +
      log.map((l) => `  - ${l}`).join('\n') +
      '\n'
  );
}
/* c8 ignore stop */

export { GUARD_OPEN, GUARD_CLOSE, GATE_INVOKE };
