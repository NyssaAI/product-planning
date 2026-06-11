#!/usr/bin/env node
/**
 * AI Plan — planning context for any repository.
 *
 * Usage:
 *   node scripts/ai-plan/generate.mjs              # generate
 *   node scripts/ai-plan/generate.mjs --init       # bootstrap repo
 *   node scripts/ai-plan/generate.mjs --doctor     # validate setup
 *   node scripts/ai-plan/generate.mjs --doctor --runtimes
 *   node scripts/ai-plan/generate.mjs --migrate    # move legacy layout to docs/agent-files/
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildAiPlanModel } from './lib/build.mjs';
import { bootstrapRepo } from './lib/bootstrap.mjs';
import {
  loadAiPlanConfig,
  validateRequiredDocs,
} from './lib/config.mjs';
import { runDoctor, formatDoctorReport } from './lib/doctor.mjs';
import { runMigrate, formatMigrateReport } from './lib/migrate.mjs';
import { createLogger } from './lib/logger.mjs';
import { findProjectRoot } from './lib/project-root.mjs';
import { renderIndex, renderModuleScope } from './lib/render.mjs';

const log = createLogger({ module: 'generate' });

const args = process.argv.slice(2);
const initMode = args.includes('--init') || args.includes('-i');
const doctorMode = args.includes('--doctor');
const migrateMode = args.includes('--migrate');
const runtimesMode = args.includes('--runtimes');
const writeScripts = args.includes('--write-scripts');
const withProjectManifest = args.includes('--with-project-manifest');
const REPO_ROOT = findProjectRoot();

/**
 * @param {string} repoRoot
 * @param {string} codeMapOutput
 */
function loadCodeMapFiles(repoRoot, codeMapOutput) {
  const mapPath = path.join(repoRoot, codeMapOutput);
  if (!existsSync(mapPath)) {
    log.warn('CODE_MAP missing', { path: codeMapOutput });
    return [];
  }
  const raw = JSON.parse(readFileSync(mapPath, 'utf8'));
  const files = Array.isArray(raw.files) ? raw.files : [];
  log.debug('loaded CODE_MAP files', { count: files.length });
  return files;
}

function runInit() {
  log.info('init mode start', { repoRoot: REPO_ROOT });
  const result = bootstrapRepo(REPO_ROOT, {
    withProjectManifest,
    writeScripts,
  });
  process.stdout.write(
    `AI Plan init:\n  created: ${result.created.length}\n  skipped: ${result.skipped.length}\n`
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

function runGenerate() {
  log.info('generate mode start', { repoRoot: REPO_ROOT });
  const config = loadAiPlanConfig(REPO_ROOT);
  const { missing, resolved } = validateRequiredDocs(REPO_ROOT, config);

  if (missing.length > 0) {
    log.error('required docs missing', { missing });
    process.stderr.write(
      `AI Plan requires these documents (configure paths in ai-plan.config.json → docs):\n`
    );
    for (const key of missing) {
      process.stderr.write(
        `  - ${key}: tried ${config.docs[key].join(', ')}\n`
      );
    }
    process.stderr.write(
      `\nAdd the missing file(s), or run: node <PLUGIN_ROOT>/scripts/ai-plan/generate.mjs --init\n`
    );
    process.exit(1);
  }

  const codeMapFiles = loadCodeMapFiles(REPO_ROOT, config.codeMapOutput);
  if (codeMapFiles.length === 0) {
    process.stderr.write(
      `Warning: ${config.codeMapOutput} not found — run npm run code-map first.\n`
    );
  }

  const model = buildAiPlanModel(REPO_ROOT, config, codeMapFiles);
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

  log.info('generate mode complete', {
    modules: model.modules.length,
    modulesWritten,
    routeCount: model.stats.routeCount,
  });

  process.stdout.write(
    `AI Plan: ${model.modules.length} modules → ${config.outputDir}/\n`
  );
  process.stdout.write(
    `  Docs: ${resolved.product}, ${resolved.roadmap}, ${resolved.techStack}\n`
  );
}

function main() {
  log.debug('ai-plan CLI invoked', { args, repoRoot: REPO_ROOT });

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

  runGenerate();
}

main();
