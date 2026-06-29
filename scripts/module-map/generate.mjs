#!/usr/bin/env node
/**
 * code-indexer — planning context for any repository.
 *
 * Usage:
 *   node scripts/module-map/generate.mjs              # generate
 *   node scripts/module-map/generate.mjs --init       # bootstrap repo
 *   node scripts/module-map/generate.mjs --doctor     # validate setup
 *   node scripts/module-map/generate.mjs --doctor --runtimes
 *   node scripts/module-map/generate.mjs --migrate    # move legacy layout to docs/code-index/
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { buildAiPlanModel } from './lib/build.mjs';
import { bootstrapRepo } from './lib/bootstrap.mjs';
import {
  loadAiPlanConfig,
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

const log = createLogger({ module: 'generate' });

const args = process.argv.slice(2);
const initMode = args.includes('--init') || args.includes('-i');
const doctorMode = args.includes('--doctor');
const migrateMode = args.includes('--migrate');
const jsonMode = args.includes('--json');
const runtimesMode = args.includes('--runtimes');
const writeScripts = args.includes('--write-scripts');
const withProjectManifest = args.includes('--with-project-manifest');
const pinId = flagValue(args, '--pin');
const unpinId = flagValue(args, '--unpin');
const REPO_ROOT = findProjectRoot();

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
  const raw = JSON.parse(readFileSync(mapPath, 'utf8'));
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
    `code-indexer init:\n  created: ${result.created.length}\n  skipped: ${result.skipped.length}\n`
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
  log.info('doctor mode start', { repoRoot: REPO_ROOT, runtimes: runtimesMode });
  const report = runDoctor(REPO_ROOT, { runtimes: runtimesMode });
  process.stdout.write(formatDoctorReport(report));
  if (!report.ok) {
    process.exit(1);
  }
}

/**
 * @typedef {object} GenerateResult
 * @property {boolean} ok
 * @property {boolean} skipped
 * @property {number} modules
 * @property {string[]} warnings Named codes: CODE_MAP_STALE, …
 * @property {string[]} errors Named codes: MISSING_DOCS, NO_MODULES_FOUND, AST_GREP_NOT_FOUND, …
 * @property {string} summary
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

  const config = loadAiPlanConfig(REPO_ROOT);
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
      summary: `generation skipped — missing required docs: ${missing.join(', ')}. Run --init or configure code-indexer.config.json → docs.`,
    };
  }

  const codeMap = loadCodeMap(REPO_ROOT, config.codeMapOutput);
  if (codeMap.files.length === 0) {
    warnings.push(
      `CODE_MAP_STALE: ${config.codeMapOutput} missing or empty — run npm run code-map first`
    );
  }

  const model = buildAiPlanModel(REPO_ROOT, config, codeMap);
  model.project.docs = {
    product: resolved.product,
    roadmap: resolved.roadmap,
    techStack: resolved.techStack,
  };

  const outDir = path.join(REPO_ROOT, config.outputDir);
  const modulesDir = path.join(outDir, 'modules');
  mkdirSync(modulesDir, { recursive: true });

  writeFileSync(
    path.join(outDir, 'index.md'),
    renderIndex(model, config),
    'utf8'
  );
  writeFileSync(
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
    )}\n`,
    'utf8'
  );

  let modulesWritten = 0;
  for (const mod of model.modules) {
    if (mod.preserveModule) {
      log.debug('skip preserveModule module', { moduleId: mod.id });
      continue;
    }
    writeFileSync(
      path.join(modulesDir, `${mod.id}.md`),
      renderModuleScope(model, mod),
      'utf8'
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
    model.generated
  );

  if (model.modules.length === 0) {
    errors.push(
      'NO_MODULES_FOUND: module discovery produced zero modules — check code-indexer.config.json → modules'
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
    warnings,
    errors,
    summary: `${model.modules.length} modules → ${config.outputDir}/ (docs: ${resolved.product}, ${resolved.roadmap}, ${resolved.techStack})${embeddedNote}`,
  };
}

/**
 * @param {GenerateResult} result
 */
function reportGenerateResult(result) {
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`code-indexer: ${result.summary}\n`);
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
        ? `code-indexer: unpinned ${id} — returns to auto-derivation on next regen\n`
        : `code-indexer: cannot unpin — ${result.error}\n`
    );
    if (!result.ok) {
      process.exit(1);
    }
    return;
  }

  const config = loadAiPlanConfig(REPO_ROOT);
  const modules = discoverModules(REPO_ROOT, config);
  const result = pinModule(REPO_ROOT, id, modules);
  if (result.ok) {
    process.stdout.write(
      `code-indexer: pinned ${id} (root ${result.pin.root}) — edit code-indexer.config.json → modules.pinned to adjust\n`
    );
  } else {
    process.stderr.write(`code-indexer: cannot pin — ${result.error}\n`);
    process.exit(1);
  }
}

function main() {
  log.debug('code-indexer CLI invoked', { args, repoRoot: REPO_ROOT });

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

  if (migrateMode) {
    const actions = runMigrate(REPO_ROOT);
    process.stdout.write(formatMigrateReport(actions));
    return;
  }

  if (initMode) {
    runInit();
    return;
  }

  reportGenerateResult(runGenerate());
}

main();
