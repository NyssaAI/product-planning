#!/usr/bin/env node
/**
 * PostToolUse hook wrapper: regenerates the code map and module graph in the
 * background when scan inputs change. The hook invocation checks freshness,
 * then respawns itself detached with
 * --run to do the actual regeneration.
 *
 * Input (hook mode): Claude Code PostToolUse JSON on stdin
 * ({ tool_input: { file_path } }), or CLAUDE_TOOL_INPUT_FILE_PATH env var.
 *
 * Run mode (--run): runs both generators synchronously. Exits 1 and writes the
 * failing generator's stderr to this process's stderr when either generator
 * fails, so a caller such as pre-push-regen.mjs can tell success from failure.
 *
 * Opt-out: "autoRegenerate": false in plan-product.config.json.
 * Log: .temp/regen.log in the project repo. The directory self-ignores through
 * a generated .temp/.gitignore so the log never shows up as an uncommitted
 * change beside the code-map artifacts.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkMapFreshness } from '../lib/map-freshness.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const LOG_DIR = '.temp';
const LOG_FILE = 'regen.log';

/**
 * @param {string} repoRoot
 * @returns {string}
 */
function regenLogPath(repoRoot) {
  return path.join(repoRoot, LOG_DIR, LOG_FILE);
}

/**
 * @param {string} repoRoot
 * @param {string} message
 */
function appendLog(repoRoot, message) {
  try {
    const file = regenLogPath(repoRoot);
    const dir = path.dirname(file);
    mkdirSync(dir, { recursive: true });
    const ignore = path.join(dir, '.gitignore');
    if (!existsSync(ignore)) {
      writeFileSync(ignore, '*\n', 'utf8');
    }
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

/**
 * Run mode: run the regeneration pipeline, log the outcome, and exit non-zero
 * on the first generator failure so callers can react.
 */
function runRegeneration() {
  const repoRoot = process.cwd();
  if (checkMapFreshness(repoRoot).fresh) {
    return;
  }
  const script = path.join(__dirname, '../map-code/generate.mjs');
  const result = spawnSync(process.execPath, [script], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 240_000,
  });
  if (result.status !== 0) {
    const detail = (result.stderr || result.error?.message || 'unknown')
      .trim()
      .slice(0, 500);
    const name = path.basename(script);
    appendLog(repoRoot, `ERROR ${name}: ${detail}`);
    process.stderr.write(
      `plan-product: ${name} failed (exit ${result.status ?? 'signal'}); see ${path.join(LOG_DIR, LOG_FILE)}\n${detail}\n`
    );
    process.exit(1);
  }
  appendLog(repoRoot, 'REGEN complete');
}

/** Hook mode: check shared freshness, then detach a background regeneration. */
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

  const rel = path
    .relative(repoRoot, path.resolve(modifiedFile))
    .replace(/\\/g, '/');
  if (rel.startsWith('../') || path.isAbsolute(rel) || checkMapFreshness(repoRoot).fresh) {
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
