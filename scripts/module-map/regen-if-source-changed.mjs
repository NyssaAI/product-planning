#!/usr/bin/env node
/**
 * PostToolUse hook wrapper: regenerates the code map and module graph in the
 * background when a source file changes. Never blocks the agent — the hook
 * invocation only performs cheap checks, then respawns itself detached with
 * --run to do the actual regeneration.
 *
 * Input (hook mode): Claude Code PostToolUse JSON on stdin
 * ({ tool_input: { file_path } }), or CLAUDE_TOOL_INPUT_FILE_PATH env var.
 *
 * Opt-out: "autoRegenerate": false in plan-product.config.json.
 * Log: docs/code-map/.regen.log in the project repo.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const DEFAULT_SOURCE_ROOTS = ['src', 'app', 'lib', 'native', 'scripts', 'test'];

/**
 * @param {string} repoRoot
 * @returns {string}
 */
function logFile(repoRoot) {
  return path.join(repoRoot, 'docs/code-map/.regen.log');
}

/**
 * @param {string} repoRoot
 * @param {string} message
 */
function appendLog(repoRoot, message) {
  try {
    const file = logFile(repoRoot);
    mkdirSync(path.dirname(file), { recursive: true });
    appendFileSync(file, `${new Date().toISOString()} ${message}\n`, 'utf8');
  } catch {
    // Logging must never break the hook.
  }
}

/**
 * @param {string} repoRoot
 * @returns {Record<string, unknown>}
 */
function readJsonIfPresent(repoRoot, name) {
  try {
    const file = path.join(repoRoot, name);
    if (existsSync(file)) {
      return JSON.parse(readFileSync(file, 'utf8'));
    }
  } catch {
    // Malformed config — treat as absent.
  }
  return {};
}

/**
 * @returns {string | null} the modified file path from hook stdin or env
 */
function readModifiedFilePath() {
  try {
    const stdin = readFileSync(0, 'utf8');
    if (stdin.trim()) {
      const payload = JSON.parse(stdin);
      const fromStdin = payload?.tool_input?.file_path;
      if (typeof fromStdin === 'string' && fromStdin) {
        return fromStdin;
      }
    }
  } catch {
    // No stdin (manual invocation) or non-JSON payload.
  }
  const fromEnv = process.env.CLAUDE_TOOL_INPUT_FILE_PATH;
  return typeof fromEnv === 'string' && fromEnv ? fromEnv : null;
}

/** Background mode: run the regeneration pipeline and log the outcome. */
function runRegeneration() {
  const repoRoot = process.cwd();
  const codeMapScript = path.join(
    __dirname,
    '../code-map/generate-code-map.mjs'
  );
  const planProductScript = path.join(__dirname, 'generate-module-map.mjs');

  for (const script of [codeMapScript, planProductScript]) {
    const result = spawnSync(process.execPath, [script], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 120_000,
    });
    if (result.status !== 0) {
      appendLog(
        repoRoot,
        `ERROR ${path.basename(script)}: ${(result.stderr || result.error?.message || 'unknown').trim().slice(0, 500)}`
      );
      process.exit(0);
    }
  }
  appendLog(repoRoot, 'REGEN complete');
}

/** Hook mode: cheap checks, then detach a background regeneration. */
function handleHook() {
  const repoRoot = process.cwd();

  const modifiedFile = readModifiedFilePath();
  if (!modifiedFile) {
    process.exit(0);
  }

  const planProductConfig = readJsonIfPresent(repoRoot, 'plan-product.config.json');
  if (planProductConfig.autoRegenerate === false) {
    process.exit(0);
  }

  const sourceRoots = Array.isArray(planProductConfig.sourceRoots)
    ? planProductConfig.sourceRoots
    : Array.isArray(planProductConfig.roots)
      ? planProductConfig.roots
      : DEFAULT_SOURCE_ROOTS;

  const rel = path
    .relative(repoRoot, path.resolve(modifiedFile))
    .replace(/\\/g, '/');
  const isSourceFile =
    !rel.startsWith('..') &&
    sourceRoots.some((root) => rel === root || rel.startsWith(`${root}/`));
  if (!isSourceFile) {
    process.exit(0);
  }

  const child = spawn(process.execPath, [SELF, '--run'], {
    cwd: repoRoot,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  appendLog(repoRoot, `REGEN triggered by ${rel}`);
  process.exit(0);
}

if (process.argv.includes('--run')) {
  runRegeneration();
} else {
  handleHook();
}
