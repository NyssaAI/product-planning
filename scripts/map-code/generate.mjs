#!/usr/bin/env node
/**
 * Public map-code workflow.
 *
 * This intentionally chains the implementation-specific generators:
 * 1. code-map symbol/endpoint index
 * 2. module-map graph and planning docs
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordUsageEvent } from '../lib/usage.mjs';
import { findProjectRoot } from '../module-map/lib/project-root.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(__dirname, '../..');
const REPO_ROOT = findProjectRoot();
const started = Date.now();

const CODE_MAP_SCRIPT = path.join(
  PLUGIN_ROOT,
  'scripts/code-map/generate-code-map.mjs'
);
const MODULE_MAP_SCRIPT = path.join(
  PLUGIN_ROOT,
  'scripts/module-map/generate-module-map.mjs'
);

const codeMapArgs = [];
const moduleMapArgs = [];
const args = process.argv.slice(2);

for (const arg of args) {
  if (
    arg === '--include-comments' ||
    arg === '--omit-comments' ||
    arg === '--no-comments'
  ) {
    codeMapArgs.push(arg);
    continue;
  }
  if (arg === '--help' || arg === '-h') {
    printHelp();
    process.exit(0);
  }
  process.stderr.write(
    `map-code: unsupported option ${arg}. Use generate-module-map.mjs for module-only operations.\n`
  );
  printHelp();
  process.exit(1);
}

main();

function main() {
  try {
    runStep('code-map', CODE_MAP_SCRIPT, codeMapArgs);
    runStep('module-map', MODULE_MAP_SCRIPT, moduleMapArgs);
    recordUsageEvent(REPO_ROOT, {
      command: 'map-code',
      status: 'ok',
      durationMs: Date.now() - started,
      summary: 'code-map and module-map generation completed',
      outputs: ['docs/code-map/code-map.json', 'docs/code-map/module-map.json'],
      metrics: { steps: 2 },
      warnings: [],
      errors: [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    recordUsageEvent(REPO_ROOT, {
      command: 'map-code',
      status: 'error',
      durationMs: Date.now() - started,
      summary: `map-code failed - ${message}`,
      outputs: [],
      warnings: [],
      errors: [message],
    });
    process.stderr.write(`map-code: ${message}\n`);
    process.exit(1);
  }
}

/**
 * @param {string} name
 * @param {string} script
 * @param {string[]} stepArgs
 */
function runStep(name, script, stepArgs) {
  const result = spawnSync(process.execPath, [script, ...stepArgs], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
  if (result.error) {
    throw new Error(`${name} failed: ${result.error.message}`);
  }
  if ((result.status ?? 1) !== 0) {
    throw new Error(`${name} exited ${result.status ?? 1}`);
  }
}

function printHelp() {
  process.stdout.write(`Usage: map-code [--include-comments|--omit-comments]

Generate code-map context by running:
  1. scripts/code-map/generate-code-map.mjs
  2. scripts/module-map/generate-module-map.mjs

Module-only operations:
  node <PLUGIN_ROOT>/scripts/module-map/generate-module-map.mjs --init
  node <PLUGIN_ROOT>/scripts/module-map/generate-module-map.mjs --doctor
  node <PLUGIN_ROOT>/scripts/module-map/generate-module-map.mjs --arch
`);
}
