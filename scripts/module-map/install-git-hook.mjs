#!/usr/bin/env node
/**
 * Installs a warn-only git pre-push hook that regenerates the code map via
 * pre-push-regen.mjs --git-hook. Intended for runtimes without native hook
 * support (Codex, Gemini, plain terminals); Claude Code already gets the
 * plugin's PreToolUse hook from hooks/hooks.json.
 *
 * The hook block is marker-delimited: re-running the installer replaces the
 * block in place, foreign hook content outside the markers is preserved, and
 * --uninstall removes only the block.
 */

import {
  chmodSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BEGIN_MARKER = '# >>> plan-product pre-push hook >>>';
const END_MARKER = '# <<< plan-product pre-push hook <<<';

/**
 * @param {string} repoRoot
 * @returns {string | null} absolute hooks directory, or null outside a git repo
 */
function resolveHooksDir(repoRoot) {
  const result = spawnSync('git', ['rev-parse', '--git-path', 'hooks'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    return null;
  }
  return path.resolve(repoRoot, result.stdout.trim());
}

/** @returns {string} the marker-delimited hook block */
function hookBlock() {
  const script = path
    .join(__dirname, 'pre-push-regen.mjs')
    .replace(/\\/g, '/');
  return [
    BEGIN_MARKER,
    '# Warn-only: regenerates the code map before push; never blocks the push.',
    `node "${script}" --git-hook || true`,
    END_MARKER,
  ].join('\n');
}

/**
 * @param {string} text
 * @returns {string} text with the marker-delimited block removed
 */
function removeBlock(text) {
  const begin = text.indexOf(BEGIN_MARKER);
  const end = text.indexOf(END_MARKER);
  if (begin === -1 || end === -1) {
    return text;
  }
  const before = text.slice(0, begin).replace(/\n+$/, '\n');
  const after = text.slice(end + END_MARKER.length).replace(/^\n+/, '\n');
  return `${before}${after}`.replace(/\n{3,}/g, '\n\n');
}

function main() {
  const uninstall = process.argv.includes('--uninstall');
  const repoRoot = process.cwd();

  const hooksDir = resolveHooksDir(repoRoot);
  if (!hooksDir) {
    console.error(
      'plan-product: not a git repository (or git is unavailable); run from the target project root'
    );
    process.exit(1);
  }
  const hookFile = path.join(hooksDir, 'pre-push');

  if (uninstall) {
    if (!existsSync(hookFile)) {
      console.log('plan-product: no pre-push hook installed');
      return;
    }
    const text = readFileSync(hookFile, 'utf8');
    if (!text.includes(BEGIN_MARKER)) {
      console.log('plan-product: pre-push hook has no plan-product block');
      return;
    }
    writeFileSync(hookFile, removeBlock(text), 'utf8');
    console.log(`plan-product: removed pre-push block from ${hookFile}`);
    return;
  }

  let content;
  let action;
  if (!existsSync(hookFile)) {
    content = `#!/bin/sh\n\n${hookBlock()}\n`;
    action = 'installed';
  } else {
    const text = readFileSync(hookFile, 'utf8');
    if (text.includes(BEGIN_MARKER)) {
      content = `${removeBlock(text).replace(/\n+$/, '\n')}\n${hookBlock()}\n`;
      action = 'updated';
    } else {
      content = `${text.replace(/\n+$/, '\n')}\n${hookBlock()}\n`;
      action = 'appended to existing';
    }
  }
  writeFileSync(hookFile, content, 'utf8');
  try {
    chmodSync(hookFile, 0o755);
  } catch {
    // chmod is a no-op on Windows; git for Windows runs hooks regardless.
  }
  console.log(`plan-product: ${action} pre-push hook at ${hookFile}`);
}

main();
