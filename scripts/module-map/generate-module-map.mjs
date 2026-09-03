#!/usr/bin/env node
/**
 * Generate the plan-product module map for any repository.
 *
 * Usage:
 *   node scripts/module-map/generate-module-map.mjs              # generate
 *   node scripts/module-map/generate-module-map.mjs --init       # bootstrap repo
 *   node scripts/module-map/generate-module-map.mjs --doctor     # validate setup
 *   node scripts/module-map/generate-module-map.mjs --doctor --runtimes
 *   node scripts/module-map/generate-module-map.mjs --migrate    # normalize generated docs/code-map layout
 *   node scripts/module-map/generate-module-map.mjs --arch       # refresh system architecture doc
 *   node scripts/module-map/generate-module-map.mjs --effectiveness # write usage/effectiveness report
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
} from 'node:fs';
import path from 'node:path';
import { writeArtifactIfChanged } from '../lib/write-artifact.mjs';
import { buildPlanProductModel } from './lib/build.mjs';
import { bootstrapRepo } from './lib/bootstrap.mjs';
import {
  loadPlanProductConfig,
  validateRequiredDocs,
} from './lib/config.mjs';
import { runDoctor, formatDoctorReport } from './lib/doctor.mjs';
import { runMigrate, formatMigrateReport } from './lib/migrate.mjs';
import { embedModuleMap, renderModuleMapTable } from './lib/embed.mjs';
import { createLogger } from './lib/logger.mjs';
import { findProjectRoot } from './lib/project-root.mjs';
import { renderIndex, renderModuleScope } from './lib/render.mjs';
import { discoverModules } from './lib/discover-modules.mjs';
import { pinModule, unpinModule } from './lib/pin.mjs';
import {
  loadArchitectureModel,
  renderSystemArchitecture,
} from './lib/architecture.mjs';
import {
  recordUsageEvent,
  writeEffectivenessReport,
} from '../lib/usage.mjs';

const log = createLogger({ module: 'generate' });

const args = process.argv.slice(2);
const initMode = args.includes('--init') || args.includes('-i');
const doctorMode = args.includes('--doctor');
const migrateMode = args.includes('--migrate');
const archMode = args.includes('--arch');
const effectivenessMode =
  args.includes('--effectiveness') || args.includes('--usage-report');
const jsonMode = args.includes('--json');
const runtimesMode = args.includes('--runtimes');
const writeScripts = args.includes('--write-scripts');
const withProjectManifest = args.includes('--with-project-manifest');
const helpMode = args.includes('--help') || args.includes('-h');
const pinId = flagValue(args, '--pin');
const unpinId = flagValue(args, '--unpin');
const REPO_ROOT = findProjectRoot();
let commandStarted = Date.now();

/**
 * Value following a `--flag` (e.g. `--pin <id>`). Returns null when the flag
 * is absent, undefined when present without a value.
 * @param {string[]} argv
 * @param {string} flag
 */
function flagValue(argv, flag) {
  const i = argv.indexOf(flag);
  if (i < 0) {
    return null;
  }
  const next = argv[i + 1];
  return next && !next.startsWith('--') ? next : undefined;
}

/**
 * @param {string} repoRoot
 * @param {string} codeMapOutput
 */
function loadCodeMap(repoRoot, codeMapOutput) {
  const mapPath = path.join(repoRoot, codeMapOutput);
  if (!existsSync(mapPath)) {
    log.warn('CODE_MAP missing', { path: codeMapOutput });
    return { files: [], endpoints: [] };
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(mapPath, 'utf8'));
  } catch {
    const err = new Error(`INVALID_CODE_MAP: ${codeMapOutput} is not valid JSON`);
    err.code = 'INVALID_CODE_MAP';
    throw err;
  }
  const files = Array.isArray(raw.files) ? raw.files : [];
  const endpoints = Array.isArray(raw.endpoints) ? raw.endpoints : [];
  log.debug('loaded CODE_MAP', { files: files.length, endpoints: endpoints.length });
  return { files, endpoints };
}

function runInit() {
  log.info('init mode start', { repoRoot: REPO_ROOT });
  const result = bootstrapRepo(REPO_ROOT, {
    withProjectManifest,
    writeScripts,
  });
  process.stdout.write(
    `plan-product init:\n  created: ${result.created.length}\n  skipped: ${result.skipped.length}\n`
  );
  for (const file of result.created) {
    process.stdout.write(`  + ${file}\n`);
  }
  log.info('init mode complete', {
    created: result.created.length,
    skipped: result.skipped.length,
  });
}

function runDoctorCommand() {
  const started = Date.now();
  log.info('doctor mode start', { repoRoot: REPO_ROOT, runtimes: runtimesMode });
  const report = runDoctor(REPO_ROOT, { runtimes: runtimesMode });
  recordUsageEvent(REPO_ROOT, {
    command: 'doctor',
    status: report.ok ? 'ok' : 'error',
    durationMs: Date.now() - started,
    summary: `doctor ${report.ok ? 'PASS' : 'FAIL'}`,
    outputs: [],
    metrics: {
      checks: report.checks.length,
      pass: report.checks.filter((check) => check.status === 'pass').length,
      warn: report.checks.filter((check) => check.status === 'warn').length,
      fail: report.checks.filter((check) => check.status === 'fail').length,
    },
    warnings: report.checks
      .filter((check) => check.status === 'warn')
      .map((check) => `${check.id}: ${check.message}`),
    errors: report.checks
      .filter((check) => check.status === 'fail')
      .map((check) => `${check.id}: ${check.message}`),
  });
  process.stdout.write(formatDoctorReport(report));
  if (!report.ok) {
    process.exit(1);
  }
}

function runEffectivenessCommand() {
  const started = Date.now();
  const doctorReport = runDoctor(REPO_ROOT);
  const result = writeEffectivenessReport(REPO_ROOT, { doctorReport });
  recordUsageEvent(REPO_ROOT, {
    command: 'effectiveness-report',
    status: result.ok ? 'ok' : 'error',
    durationMs: Date.now() - started,
    summary: result.summary,
    outputs: [result.wrote],
    metrics: {
      events: result.eventCount,
      invalidLines: result.invalidLines,
      doctorOk: doctorReport.ok,
    },
    warnings: [],
    errors: result.ok ? [] : [result.summary],
  });
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`plan-product: ${result.summary}\n`);
  }
}

function printHelp() {
  process.stdout.write(`Usage: generate-module-map [options]

Generate or manage plan-product module-map artifacts.

Options:
  --init, -i             Bootstrap plan-product docs/config in this repo
  --write-scripts        With --init, add npm scripts for map-code, map-architecture, and find-code-patterns
  --with-project-manifest With --init, also scaffold jamaynor.project.json
  --doctor               Validate docs, code-map, module-map, and agent files
  --runtimes             With --doctor, include runtime dependency checks
  --migrate              Normalize generated docs/code-map layout
  --arch                 Refresh the system architecture handoff
  --effectiveness        Write usage/effectiveness report
  --usage-report         Alias for --effectiveness
  --json                 Emit machine-readable JSON where supported
  --pin <module-id>      Freeze a derived module into plan-product.config.json
  --unpin <module-id>    Return a pinned module to auto-derivation
  --help, -h             Show this help
`);
}

/**
 * @typedef {object} GenerateResult
 * @property {boolean} ok
 * @property {boolean} skipped
 * @property {number} modules
 * @property {string[]} warnings Named codes: CODE_MAP_STALE, …
 * @property {string[]} errors Named codes: MISSING_DOCS, NO_MODULES_FOUND, AST_GREP_NOT_FOUND, …
 * @property {string} summary
 * @property {string[]} [wrote]
 * @property {number} [edges]
 */

/**
 * @returns {GenerateResult}
 */
function runGenerate() {
  log.info('generate mode start', { repoRoot: REPO_ROOT });
  /** @type {string[]} */
  const warnings = [];
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const wrote = [];

  const config = loadPlanProductConfig(REPO_ROOT);
  const { missing, resolved } = validateRequiredDocs(REPO_ROOT, config);

  if (missing.length > 0) {
    log.error('required docs missing', { missing });
    for (const key of missing) {
      errors.push(
        `MISSING_DOCS: ${key} not found (tried ${config.docs[key].join(', ')})`
      );
    }
    return {
      ok: false,
      skipped: true,
      modules: 0,
      warnings,
      errors,
      summary: `generation skipped — missing required docs: ${missing.join(', ')}. Run --init or configure plan-product.config.json → docs.`,
    };
  }

  const codeMap = loadCodeMap(REPO_ROOT, config.codeMapOutput);
  if (codeMap.files.length === 0) {
    warnings.push(
      `CODE_MAP_STALE: ${config.codeMapOutput} missing or empty — run npm run map-code first`
    );
  }

  const model = buildPlanProductModel(REPO_ROOT, config, codeMap);
  model.project.docs = {
    product: resolved.product,
    features: resolved.features,
    techStack: resolved.techStack,
  };

  const outDir = path.join(REPO_ROOT, config.outputDir);
  const modulesDir = path.join(outDir, 'modules');
  mkdirSync(modulesDir, { recursive: true });

  writeArtifactIfChanged(
    path.join(outDir, 'index.md'),
    renderIndex(model, config)
  );
  wrote.push(path.join(config.outputDir, 'index.md').replace(/\\/g, '/'));
  writeArtifactIfChanged(
    path.join(outDir, 'module-map.json'),
    `${JSON.stringify(
      {
        schemaVersion: model.schemaVersion,
        generated: model.generated,
        project: model.project,
        progressiveDisclosure: model.progressiveDisclosure,
        modules: model.modules.map((m) => {
          /** @type {Record<string, unknown>} */
          const entry = {
            id: m.id,
            name: m.name,
            root: m.root,
            source: m.source,
            dependsOn: m.dependsOn,
            usedBy: m.usedBy,
            routeCount: m.httpRoutes.length,
            symbolCount: m.symbolCount,
            planningModule: m.planningModule,
          };
          if (m.description) {
            entry.description = m.description;
          }
          if (m.capabilities?.length) {
            entry.capabilities = m.capabilities;
          }
          return entry;
        }),
        edges: model.moduleGraph.edges,
        codeMap: model.codeMap,
        stats: model.stats,
      },
      null,
      2
    )}\n`
  );
  wrote.push(path.join(config.outputDir, 'module-map.json').replace(/\\/g, '/'));

  let modulesWritten = 0;
  for (const mod of model.modules) {
    if (mod.preserveModule) {
      log.debug('skip preserveModule module', { moduleId: mod.id });
      continue;
    }
    writeArtifactIfChanged(
      path.join(modulesDir, `${mod.id}.md`),
      renderModuleScope(model, mod)
    );
    wrote.push(
      path
        .join(config.outputDir, 'modules', `${mod.id}.md`)
        .replace(/\\/g, '/')
    );
    modulesWritten += 1;
  }

  // Prune stale generated module files (ids no longer in the model). Only files
  // whose header marks them a generated module scope are removed — human docs
  // dropped into modules/ are left untouched.
  const currentIds = new Set(model.modules.map((m) => m.id));
  for (const file of readdirSync(modulesDir)) {
    if (!file.endsWith('.md') || currentIds.has(file.slice(0, -3))) {
      continue;
    }
    const full = path.join(modulesDir, file);
    const firstLine = readFileSync(full, 'utf8').split('\n', 1)[0] ?? '';
    if (firstLine.includes('— module')) {
      unlinkSync(full);
      log.info('pruned stale module file', { file });
    }
  }

  const embedded = embedModuleMap(
    REPO_ROOT,
    renderModuleMapTable(model.modules),
    model.generated,
    { outputDir: config.outputDir }
  );

  if (model.modules.length === 0) {
    errors.push(
      'NO_MODULES_FOUND: module discovery produced zero modules — check plan-product.config.json → modules'
    );
  }

  log.info('generate mode complete', {
    modules: model.modules.length,
    modulesWritten,
    routeCount: model.stats.routeCount,
    embedded,
  });

  const embeddedNote =
    embedded.length > 0 ? `; module map embedded in ${embedded.join(', ')}` : '';
  return {
    ok: errors.length === 0,
    skipped: false,
    modules: model.modules.length,
    wrote,
    warnings,
    errors,
    summary: `${model.modules.length} modules → ${config.outputDir}/ (docs: ${resolved.product}, ${resolved.features}, ${resolved.techStack})${embeddedNote}`,
  };
}

/**
 * @returns {GenerateResult}
 */
function runArchitecture() {
  log.info('architecture mode start', { repoRoot: REPO_ROOT });
  /** @type {string[]} */
  const warnings = [];
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const wrote = [];

  let config;
  let model;
  try {
    config = loadPlanProductConfig(REPO_ROOT);
    model = loadArchitectureModel(REPO_ROOT, config);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    return {
      ok: false,
      skipped: true,
      modules: 0,
      edges: 0,
      wrote,
      warnings,
      errors,
      summary: `architecture skipped — ${message}`,
    };
  }

  if (model.modules.length === 0) {
    errors.push(
      'NO_MODULES_FOUND: module-map.json contains zero modules — run map-code first'
    );
    return {
      ok: false,
      skipped: true,
      modules: 0,
      edges: model.edges.length,
      wrote,
      warnings,
      errors,
      summary: 'architecture skipped — module-map.json contains zero modules',
    };
  }

  const outDir = path.join(REPO_ROOT, config.outputDir);
  const archPath = path.join(outDir, 'system-architecture.md');
  const existingMarkdown = existsSync(archPath)
    ? readFileSync(archPath, 'utf8')
    : '';

  try {
    mkdirSync(outDir, { recursive: true });
    const moduleMapPath = path.join(config.outputDir, 'module-map.json');
    writeArtifactIfChanged(
      archPath,
      renderSystemArchitecture(model, { existingMarkdown, moduleMapPath })
    );
    wrote.push(path.relative(REPO_ROOT, archPath).replace(/\\/g, '/'));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`ARCH_WRITE_FAILED: ${message}`);
  }

  const summary =
    errors.length > 0
      ? `architecture failed — ${errors.join('; ')}`
      : `${model.modules.length} modules, ${model.edges.length} edges → ${config.outputDir}/system-architecture.md`;

  log.info('architecture mode complete', {
    ok: errors.length === 0,
    modules: model.modules.length,
    edges: model.edges.length,
    wrote,
  });

  return {
    ok: errors.length === 0,
    skipped: false,
    modules: model.modules.length,
    edges: model.edges.length,
    wrote,
    warnings,
    errors,
    summary,
  };
}

/**
 * @param {GenerateResult} result
 * @param {string} command
 */
function reportGenerateResult(result, command) {
  recordUsageEvent(REPO_ROOT, {
    command,
    status: result.ok ? 'ok' : 'error',
    durationMs: Date.now() - commandStarted,
    summary: result.summary,
    outputs: result.wrote ?? [],
    metrics: {
      modules: result.modules,
      edges: result.edges,
      skipped: result.skipped,
    },
    warnings: result.warnings,
    errors: result.errors,
  });
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`plan-product: ${result.summary}\n`);
    for (const warning of result.warnings) {
      process.stderr.write(`  warning: ${warning}\n`);
    }
    for (const error of result.errors) {
      process.stderr.write(`  error: ${error}\n`);
    }
  }
  if (!result.ok) {
    process.exit(1);
  }
}

/**
 * `--pin <id>` ejects a currently-derived module into config (frozen,
 * editable); `--unpin <id>` returns it to auto-derivation.
 * @param {string | undefined} id
 * @param {boolean} remove
 */
function runPinCommand(id, remove) {
  if (!id) {
    process.stderr.write(
      `usage: ${remove ? '--unpin' : '--pin'} <module-id>\n`
    );
    process.exit(1);
  }
  if (remove) {
    const result = unpinModule(REPO_ROOT, id);
    process.stdout.write(
      result.ok
        ? `plan-product: unpinned ${id} — returns to auto-derivation on next regen\n`
        : `plan-product: cannot unpin — ${result.error}\n`
    );
    if (!result.ok) {
      process.exit(1);
    }
    return;
  }

  const config = loadPlanProductConfig(REPO_ROOT);
  const modules = discoverModules(REPO_ROOT, config);
  const result = pinModule(REPO_ROOT, id, modules);
  if (result.ok) {
    process.stdout.write(
      `plan-product: pinned ${id} (root ${result.pin.root}) — edit plan-product.config.json → modules.pinned to adjust\n`
    );
  } else {
    process.stderr.write(`plan-product: cannot pin — ${result.error}\n`);
    process.exit(1);
  }
}

function main() {
  commandStarted = Date.now();
  log.debug('plan-product CLI invoked', { args, repoRoot: REPO_ROOT });

  if (helpMode) {
    printHelp();
    return;
  }

  warnIgnoredModeFlags();

  if (pinId !== null) {
    runPinCommand(pinId, false);
    return;
  }

  if (unpinId !== null) {
    runPinCommand(unpinId, true);
    return;
  }

  if (doctorMode) {
    runDoctorCommand();
    return;
  }

  if (effectivenessMode) {
    runEffectivenessCommand();
    return;
  }

  if (migrateMode) {
    const config = loadPlanProductConfig(REPO_ROOT);
    const actions = runMigrate(REPO_ROOT, { outputDir: config.outputDir });
    process.stdout.write(formatMigrateReport(actions));
    return;
  }

  if (initMode) {
    runInit();
    return;
  }

  if (archMode) {
    reportGenerateResult(runArchitecture(), 'map-architecture');
    return;
  }

  try {
    reportGenerateResult(runGenerate(), 'generate-module-map');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    reportGenerateResult({
      ok: false,
      skipped: false,
      modules: 0,
      warnings: [],
      errors: [message],
      summary: `generation failed — ${message}`,
    }, 'generate-module-map');
  }
}

function warnIgnoredModeFlags() {
  const winner =
    pinId !== null
      ? '--pin'
      : unpinId !== null
        ? '--unpin'
        : doctorMode
          ? '--doctor'
          : migrateMode
            ? '--migrate'
            : initMode
              ? '--init'
              : null;

  if (pinId !== null && unpinId !== null) {
    warnIgnoredFlag('--unpin', '--pin');
  }
  if (doctorMode && initMode && pinId === null && unpinId === null) {
    warnIgnoredFlag('--init', '--doctor');
  }
  if (jsonMode && winner) {
    warnIgnoredFlag('--json', winner);
  }
}

/**
 * @param {string} ignored
 * @param {string} winner
 */
function warnIgnoredFlag(ignored, winner) {
  process.stderr.write(
    `plan-product: warning: ${ignored} ignored because ${winner} mode takes precedence\n`
  );
}

main();
