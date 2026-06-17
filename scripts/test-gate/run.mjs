#!/usr/bin/env node
// Self-contained pre-push test gate runner.
//
// Vendored into consumer repos alongside detect.mjs (single self-contained
// scripts/test-gate/ dir). Imports nothing from the plugin and reads
// ai-plan.config.json from the repo root (cwd) — runs under plain `git push`
// with CLAUDE_PLUGIN_ROOT / CURSOR_PLUGIN_ROOT unset.
//
// Behavior:
//   - test.enabled:false        → exit 0 silently
//   - no commands resolved       → warn on stderr, exit 0 (no sentinel)
//   - run each command in order  → on first non-zero exit, report + exit 1
//   - all pass                   → exit 0
//   - E2E (test.e2e) is NEVER run here.

import { spawnSync as realSpawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveTestPlan } from './detect.mjs';

const NO_TESTS_WARNING =
  'test-gate: no tests detected and no `test.commands` configured — skipping. ' +
  'Configure ai-plan.config.json `test.commands` to enforce.';

/**
 * Run the gate for a repo. Returns the exit code the CLI should use.
 * Output (test results) is streamed via the injected spawn's stdio:'inherit'.
 *
 * @param {string} repoRoot
 * @param {{ spawn?: (cmd: string) => { status: number | null } }} [opts]
 * @returns {number} exit code (0 pass / 1 block)
 */
export function runGate(repoRoot, { spawn } = {}) {
  const run =
    spawn || ((cmd) => realSpawnSync(cmd, { shell: true, stdio: 'inherit' }));

  const plan = resolveTestPlan(repoRoot);

  if (plan.enabled === false) {
    return 0;
  }

  if (!plan.commands || plan.commands.length === 0) {
    process.stderr.write(`${NO_TESTS_WARNING}\n`);
    return 0;
  }

  for (const cmd of plan.commands) {
    const result = run(cmd);
    const status = result && typeof result.status === 'number' ? result.status : 1;
    if (status !== 0) {
      process.stderr.write(`test-gate: command failed (exit ${status}): ${cmd}\n`);
      return 1;
    }
  }

  return 0;
}

/* c8 ignore start — CLI entry, exercised via integration tests */
function isMain() {
  if (!process.argv[1]) return false;
  try {
    return fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
}

if (isMain()) {
  process.exit(runGate(process.cwd()));
}
/* c8 ignore stop */

export { NO_TESTS_WARNING };
