import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadAiPlanConfig, validateRequiredDocs } from './config.mjs';
import { buildAiPlanModel } from './build.mjs';
import { createLogger } from './logger.mjs';

const log = createLogger({ module: 'doctor' });

/**
 * @typedef {'pass' | 'warn' | 'fail'} CheckStatus
 */

/**
 * @typedef {object} DoctorCheck
 * @property {string} id
 * @property {CheckStatus} status
 * @property {string} message
 * @property {string} [hint]
 */

/**
 * @typedef {object} RuntimeReadiness
 * @property {string} runtime
 * @property {CheckStatus} status
 * @property {string} message
 * @property {string} [path]
 */

/**
 * @param {string} repoRoot
 * @param {string} codeMapOutput
 * @returns {DoctorCheck[]}
 */
function checkCodeMap(repoRoot, codeMapOutput) {
  const mapPath = path.join(repoRoot, codeMapOutput);
  if (!existsSync(mapPath)) {
    return [{
      id: 'code-map',
      status: 'fail',
      message: `${codeMapOutput} not found`,
      hint: 'Run: npm run code-map or node <PLUGIN_ROOT>/scripts/code-map/generate-code-map.mjs',
    }];
  }

  try {
    const raw = JSON.parse(readFileSync(mapPath, 'utf8'));
    const fileCount = raw.fileCount ?? raw.files?.length ?? 0;
    const symbolCount = raw.symbolCount ?? 0;
    const endpointCount = raw.endpointCount ?? raw.endpoints?.length ?? 0;
    log.debug('doctor code-map stats', { fileCount, symbolCount, endpointCount });

    if (fileCount === 0 && endpointCount === 0) {
      return [{
        id: 'code-map',
        status: 'warn',
        message: 'CODE_MAP has zero files and zero endpoints',
        hint: 'Verify code-map.config.json roots',
      }];
    }

    return [{
      id: 'code-map',
      status: 'pass',
      message: `CODE_MAP ok (${fileCount} files, ${symbolCount} symbols, ${endpointCount} endpoints)`,
    }];
  } catch (error) {
    return [{
      id: 'code-map',
      status: 'fail',
      message: `Invalid CODE_MAP JSON: ${error.message}`,
    }];
  }
}

/**
 * @param {string} repoRoot
 * @param {import('./config.mjs').AiPlanConfig} config
 * @returns {DoctorCheck[]}
 */
function checkModuleMap(repoRoot, config) {
  const mapPath = path.join(repoRoot, config.outputDir, 'module-map.json');
  const modulesDir = path.join(repoRoot, config.outputDir, 'modules');

  if (!existsSync(mapPath)) {
    return [{
      id: 'module-map',
      status: 'fail',
      message: 'module-map.json not found',
      hint: 'Run: npm run code-indexer or node <PLUGIN_ROOT>/scripts/module-map/generate.mjs',
    }];
  }

  const map = JSON.parse(readFileSync(mapPath, 'utf8'));
  const moduleCount = map.modules?.length ?? 0;
  let moduleFiles = 0;
  if (existsSync(modulesDir)) {
    moduleFiles = readdirSync(modulesDir).filter((f) => f.endsWith('.md')).length;
  }

  /** @type {DoctorCheck[]} */
  const checks = [{
    id: 'module-map',
    status: moduleCount > 0 ? 'pass' : 'warn',
    message: `module-map has ${moduleCount} modules, ${moduleFiles} module files`,
  }];

  const fallbackOnly = map.modules?.every((m) => m.source === 'fallback');
  if (fallbackOnly && moduleCount > 0) {
    checks.push({
      id: 'module-discovery',
      status: 'warn',
      message: 'All modules use fallback discovery',
      hint: 'Add code-indexer.config.json manual modules or improve stack detection',
    });
  }

  return checks;
}

/**
 * @param {string} repoRoot
 * @returns {DoctorCheck[]}
 */
function checkAgentEntrypoints(repoRoot) {
  /** @type {DoctorCheck[]} */
  const checks = [];

  for (const [id, rel] of [
    ['agents-md', 'AGENTS.md'],
    ['claude-md', 'CLAUDE.md'],
  ]) {
    const full = path.join(repoRoot, rel);
    checks.push({
      id,
      status: existsSync(full) ? 'pass' : 'warn',
      message: existsSync(full) ? `${rel} present` : `${rel} missing`,
      hint: existsSync(full) ? undefined : 'Run: node <PLUGIN_ROOT>/scripts/module-map/generate.mjs --init',
    });
  }

  return checks;
}

/**
 * @param {string} [repoRoot]
 * @returns {RuntimeReadiness[]}
 */
function checkRuntimeReadiness(repoRoot = process.cwd()) {
  log.debug('doctor runtime check start', { repoRoot });
  const home = os.homedir();

  /** @type {RuntimeReadiness[]} */
  const results = [];

  const runtimePaths = [
    { runtime: 'claude-code', path: path.join(home, '.claude', 'plugins') },
    { runtime: 'cursor', path: path.join(home, '.cursor', 'plugins', 'local') },
    { runtime: 'codex', path: path.join(home, '.agents', 'skills') },
    { runtime: 'openclaw', path: path.join(home, '.openclaw', 'skills') },
    { runtime: 'hermes', path: path.join(home, '.hermes', 'skills') },
  ];

  for (const entry of runtimePaths) {
    const exists = existsSync(entry.path);
    results.push({
      runtime: entry.runtime,
      status: exists ? 'pass' : 'warn',
      message: exists ? 'Global skills/plugins path exists' : 'Global path not found (may be ok before first publish)',
      path: entry.path,
    });
  }

  for (const rel of ['.cursor/rules/code-indexer.mdc', 'skills', '.agents/skills']) {
    const full = path.join(repoRoot, rel);
    results.push({
      runtime: `project:${rel}`,
      status: existsSync(full) ? 'pass' : 'warn',
      message: existsSync(full) ? 'Project entry present' : 'Project entry not configured',
      path: full,
    });
  }

  log.debug('doctor runtime check complete', { count: results.length });
  return results;
}

/**
 * @param {string} repoRoot
 * @param {{ runtimes?: boolean }} [options]
 * @returns {{ checks: DoctorCheck[], runtimes?: RuntimeReadiness[], ok: boolean }}
 */
export function runDoctor(repoRoot, options = {}) {
  log.info('doctor start', { repoRoot, runtimes: options.runtimes === true });
  const config = loadAiPlanConfig(repoRoot);
  const { missing, resolved } = validateRequiredDocs(repoRoot, config);

  /** @type {DoctorCheck[]} */
  const checks = [];

  if (missing.length > 0) {
    for (const key of missing) {
      checks.push({
        id: `doc-${key}`,
        status: 'fail',
        message: `Missing required doc: ${key}`,
        hint: `Tried: ${config.docs[key].join(', ')}`,
      });
    }
  } else {
    checks.push({
      id: 'required-docs',
      status: 'pass',
      message: `Docs ok: ${resolved.product}, ${resolved.roadmap}, ${resolved.techStack}`,
    });
  }

  checks.push(...checkCodeMap(repoRoot, config.codeMapOutput));
  checks.push(...checkModuleMap(repoRoot, config));
  checks.push(...checkAgentEntrypoints(repoRoot));

  if (existsSync(path.join(repoRoot, config.codeMapOutput))) {
    const codeMap = JSON.parse(
      readFileSync(path.join(repoRoot, config.codeMapOutput), 'utf8')
    );
    const model = buildAiPlanModel(repoRoot, config, codeMap);
    log.debug('doctor built model for validation', {
      moduleCount: model.modules.length,
      routeCount: model.stats.routeCount,
    });
  }

  const ok = checks.every((c) => c.status !== 'fail');
  /** @type {{ checks: DoctorCheck[], runtimes?: RuntimeReadiness[], ok: boolean }} */
  const result = { checks, ok };

  if (options.runtimes) {
    result.runtimes = checkRuntimeReadiness(repoRoot);
  }

  log.info('doctor complete', {
    ok,
    pass: checks.filter((c) => c.status === 'pass').length,
    warn: checks.filter((c) => c.status === 'warn').length,
    fail: checks.filter((c) => c.status === 'fail').length,
  });

  return result;
}

/**
 * @param {{ checks: DoctorCheck[], runtimes?: RuntimeReadiness[], ok: boolean }} report
 * @returns {string}
 */
export function formatDoctorReport(report) {
  const lines = [];
  lines.push(`code-indexer doctor: ${report.ok ? 'PASS' : 'FAIL'}`);
  lines.push('');

  for (const check of report.checks) {
    const tag = check.status.toUpperCase();
    lines.push(`[${tag}] ${check.id}: ${check.message}`);
    if (check.hint) {
      lines.push(`       hint: ${check.hint}`);
    }
  }

  if (report.runtimes?.length) {
    lines.push('');
    lines.push('Runtime readiness:');
    for (const rt of report.runtimes) {
      lines.push(`  [${rt.status.toUpperCase()}] ${rt.runtime}: ${rt.message}`);
      if (rt.path) {
        lines.push(`         ${rt.path}`);
      }
    }
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}
