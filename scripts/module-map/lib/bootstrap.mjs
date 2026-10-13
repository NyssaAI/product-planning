import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPlanProductConfig, writeStarterConfigs } from './config.mjs';
import { resolveRepoContainedPath } from '../../lib/repo-paths.mjs';
import { createLogger } from './logger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../../bootstrap-templates');
const PLAN_PRODUCT_DIR = path.resolve(__dirname, '../../../.plan-product');
const PLAN_PRODUCT_TEMPLATES_DIR = path.resolve(
  __dirname,
  '../../../.plan-product/templates'
);

const log = createLogger({ module: 'bootstrap' });

/**
 * @typedef {object} BootstrapResult
 * @property {string[]} created
 * @property {string[]} skipped
 */

/**
 * @param {string} name
 * @returns {string}
 */
function readBootstrapTemplate(name) {
  const templatePath = path.join(TEMPLATES_DIR, name);
  if (!existsSync(templatePath)) {
    throw missingBundledAsset('template', name, templatePath);
  }
  return readFileSync(templatePath, 'utf8');
}

/**
 * @param {string} name
 * @returns {string}
 */
function readPlanProductTemplate(name) {
  const templatePath = path.join(PLAN_PRODUCT_TEMPLATES_DIR, name);
  if (!existsSync(templatePath)) {
    throw missingBundledAsset('template', name, templatePath);
  }
  return readFileSync(templatePath, 'utf8');
}

/**
 * @param {string} relPath
 * @returns {string}
 */
function readPlanProductAsset(relPath) {
  const fullPath = path.join(PLAN_PRODUCT_DIR, relPath);
  if (!existsSync(fullPath)) {
    throw missingBundledAsset('asset', relPath, fullPath);
  }
  return readFileSync(fullPath, 'utf8');
}

/**
 * @param {'template' | 'asset'} kind
 * @param {string} name
 * @param {string} filePath
 */
function missingBundledAsset(kind, name, filePath) {
  const error = new Error(
    `MISSING_BUNDLED_${kind.toUpperCase()}: ${name} not found at ${filePath}`
  );
  error.code = `MISSING_BUNDLED_${kind.toUpperCase()}`;
  return error;
}

/**
 * @param {string} repoRoot
 * @param {string} relPath
 * @param {string} content
 * @param {string[]} created
 * @param {string[]} skipped
 */
function writeIfMissing(repoRoot, relPath, content, created, skipped) {
  const full = resolveRepoContainedPath(repoRoot, relPath, 'bootstrap target');
  if (existsSync(full)) {
    log.debug('bootstrap skip existing file', { path: relPath });
    skipped.push(relPath);
    return;
  }
  const dir = path.dirname(full);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    log.debug('bootstrap created directory', { dir: path.relative(repoRoot, dir) });
  }
  writeFileSync(full, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
  log.info('bootstrap created file', { path: relPath });
  created.push(relPath);
}

/**
 * @param {string} repoRoot
 * @param {string} relDir
 * @param {string[]} created
 * @param {string[]} skipped
 */
function ensureDirIfMissing(repoRoot, relDir, created, skipped) {
  const full = resolveRepoContainedPath(repoRoot, relDir, 'bootstrap directory');
  if (existsSync(full)) {
    skipped.push(relDir);
    return;
  }
  mkdirSync(full, { recursive: true });
  log.info('bootstrap created directory', { path: relDir });
  created.push(relDir);
}

/**
 * @param {string} repoRoot
 * @param {{ withProjectManifest?: boolean, writeScripts?: boolean }} [options]
 * @returns {BootstrapResult}
 */
export function bootstrapRepo(repoRoot, options = {}) {
  log.info('bootstrap start', { repoRoot, options });
  /** @type {string[]} */
  const created = [];
  /** @type {string[]} */
  const skipped = [];

  // Validate all concrete destinations before the first initialization write.
  const projectManifest = options.withProjectManifest
    ? readBootstrapTemplate('jamaynor.project.json') : null;
  const templates = ['product.md', 'features.md', 'tech-stack.md', 'feature.md',
    'use-case.md', 'roadmap.md', 'pattern-library.json', 'pattern-expectations.json'];
  const targets = ['plan-product.config.json', '.plan-product/config.json',
    '.plan-product/schema.json', ...templates.map(name => `.plan-product/templates/${name}`),
    'docs/product.md', 'docs/features.md', 'docs/tech-stack.md', 'docs/features',
    'test/unit', '.plan-product/patterns/library.json', '.plan-product/patterns/expectations.json',
    'AGENTS.md', 'CLAUDE.md', '.cursor/rules/code-map.mdc', 'package.json'];
  if (options.withProjectManifest) targets.push('jamaynor.project.json');
  if (options.writeScripts) targets.push('.claude/settings.json');
  for (const target of targets) resolveRepoContainedPath(repoRoot, target, 'bootstrap target');
  const config = loadPlanProductConfig(repoRoot);
  resolveRepoContainedPath(repoRoot, path.join(config.outputDir, 'modules'), 'bootstrap modules');
  writeStarterConfigs(repoRoot);

  writeIfMissing(
    repoRoot,
    '.plan-product/config.json',
    readPlanProductAsset('config.json'),
    created,
    skipped
  );
  writeIfMissing(
    repoRoot,
    '.plan-product/schema.json',
    readPlanProductAsset('schema.json'),
    created,
    skipped
  );
  for (const template of [
    'product.md',
    'features.md',
    'tech-stack.md',
    'feature.md',
    'use-case.md',
    'roadmap.md',
    'pattern-library.json',
    'pattern-expectations.json',
  ]) {
    writeIfMissing(
      repoRoot,
      `.plan-product/templates/${template}`,
      readPlanProductTemplate(template),
      created,
      skipped
    );
  }

  writeIfMissing(
    repoRoot,
    'docs/product.md',
    readPlanProductTemplate('product.md'),
    created,
    skipped
  );
  writeIfMissing(
    repoRoot,
    'docs/features.md',
    readPlanProductTemplate('features.md'),
    created,
    skipped
  );
  writeIfMissing(
    repoRoot,
    'docs/tech-stack.md',
    readPlanProductTemplate('tech-stack.md'),
    created,
    skipped
  );

  ensureDirIfMissing(repoRoot, 'test/unit', created, skipped);
  ensureDirIfMissing(repoRoot, 'docs/features', created, skipped);
  ensureDirIfMissing(
    repoRoot,
    path.join(config.outputDir, 'modules').replace(/\\/g, '/'),
    created,
    skipped
  );
  writeIfMissing(
    repoRoot,
    '.plan-product/patterns/library.json',
    readPlanProductTemplate('pattern-library.json'),
    created,
    skipped
  );
  writeIfMissing(
    repoRoot,
    '.plan-product/patterns/expectations.json',
    readPlanProductTemplate('pattern-expectations.json'),
    created,
    skipped
  );

  writeIfMissing(repoRoot, 'AGENTS.md', readBootstrapTemplate('AGENTS.md'), created, skipped);
  writeIfMissing(repoRoot, 'CLAUDE.md', readBootstrapTemplate('CLAUDE.md'), created, skipped);
  writeIfMissing(
    repoRoot,
    '.cursor/rules/code-map.mdc',
    readBootstrapTemplate('code-map.mdc'),
    created,
    skipped
  );

  if (options.withProjectManifest) {
    writeIfMissing(
      repoRoot,
      'jamaynor.project.json',
      projectManifest,
      created,
      skipped
    );
  }

  if (options.writeScripts) {
    mergePackageScripts(repoRoot, created, skipped);
    writeClaudeHook(repoRoot, created, skipped);
  }

  log.info('bootstrap complete', {
    createdCount: created.length,
    skippedCount: skipped.length,
  });

  return { created, skipped };
}

/**
 * @param {string} repoRoot
 * @param {string[]} created
 * @param {string[]} skipped
 */
function mergePackageScripts(repoRoot, created, skipped) {
  const pkgPath = resolveRepoContainedPath(repoRoot, 'package.json', 'bootstrap package');
  if (!existsSync(pkgPath)) {
    log.debug('bootstrap no package.json for scripts merge');
    return;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const scripts = pkg.scripts ?? {};
  const additions = {
    'map-code': pluginScriptCommand('scripts/map-code/generate.mjs'),
    'map-architecture': pluginScriptCommand('scripts/module-map/generate-module-map.mjs', ['--arch']),
    'find-code-patterns': pluginScriptCommand('scripts/code-map/generate-patterns.mjs'),
  };
  const staleLocalScripts = {
    'code-map': ['scripts/code-map/generate-code-map.mjs'],
    'plan-product': [
      'scripts/module-map/generate.mjs',
      'scripts/module-map/generate-module-map.mjs',
    ],
    'map-code': [
      'scripts/module-map/generate.mjs',
      'scripts/map-code/generate.mjs',
    ],
    'map-architecture': [
      'scripts/module-map/generate.mjs',
      'scripts/module-map/generate-module-map.mjs',
    ],
    'find-code-patterns': ['scripts/code-map/generate-patterns.mjs'],
  };

  let changed = false;
  for (const [key, relPaths] of Object.entries(staleLocalScripts)) {
    if (!(key in additions) && isStaleLocalScript(scripts[key], relPaths)) {
      delete scripts[key];
      changed = true;
    }
  }

  for (const [key, value] of Object.entries(additions)) {
    if (
      !scripts[key] ||
      isStaleLocalScript(scripts[key], staleLocalScripts[key])
    ) {
      scripts[key] = value;
      changed = true;
    }
  }

  if (!changed) {
    skipped.push('package.json scripts');
    return;
  }

  pkg.scripts = scripts;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  log.info('bootstrap merged package.json scripts');
  created.push('package.json (scripts)');
}

/**
 * Build a cross-platform npm script that resolves the current installed
 * plan-product plugin root at runtime instead of using repo-local copied tooling.
 *
 * @param {string} scriptRelPath
 * @param {string[]} [defaultArgs]
 * @returns {string}
 */
function pluginScriptCommand(scriptRelPath, defaultArgs = []) {
  const script = scriptRelPath.replace(/\\/g, '/');
  const args = defaultArgs.map((arg) => String(arg));
  const js = [
    "const { spawnSync } = require('node:child_process');",
    "const path = require('node:path');",
    "const root = process.env.PLAN_PRODUCT_PLUGIN_ROOT || process.env.PLUGIN_ROOT || process.env.CLAUDE_PLUGIN_ROOT || process.env.CURSOR_PLUGIN_ROOT;",
    "if (!root) { console.error('plan-product plugin root not found. Set PLAN_PRODUCT_PLUGIN_ROOT, PLUGIN_ROOT, CLAUDE_PLUGIN_ROOT, or CURSOR_PLUGIN_ROOT, or run the plugin script directly.'); process.exit(1); }",
    `const script = path.join(root, ${JSON.stringify(script)});`,
    `const defaultArgs = ${JSON.stringify(args)};`,
    "const result = spawnSync(process.execPath, [script, ...defaultArgs, ...process.argv.slice(1)], { stdio: 'inherit' });",
    "if (result.error) { console.error(result.error.message); process.exit(1); }",
    'process.exit(result.status ?? 1);',
  ].join('');
  return `node -e ${JSON.stringify(js)} --`;
}

/**
 * @param {unknown} value
 * @param {string | string[]} scriptRelPath
 * @returns {boolean}
 */
function isStaleLocalScript(value, scriptRelPath) {
  if (typeof value !== 'string') {
    return false;
  }
  const normalized = value.trim().replace(/\\/g, '/');
  const paths = Array.isArray(scriptRelPath) ? scriptRelPath : [scriptRelPath];
  return paths.some(
    (relPath) =>
      normalized === `node ${relPath}` ||
      normalized === `node ./${relPath}` ||
      normalized.startsWith(`node ${relPath} `) ||
      normalized.startsWith(`node ./${relPath} `)
  );
}

const REGEN_HOOK_MATCHER = 'Write|Edit';

/**
 * Adds the PostToolUse auto-regeneration hook to the project's
 * .claude/settings.json. Existing hooks are preserved; if a hook entry
 * already references regen-if-source-changed.mjs nothing is written.
 * Opt-out at runtime via "autoRegenerate": false in plan-product.config.json.
 *
 * @param {string} repoRoot
 * @param {string[]} created
 * @param {string[]} skipped
 */
function writeClaudeHook(repoRoot, created, skipped) {
  const settingsDir = path.join(repoRoot, '.claude');
  const settingsPath = resolveRepoContainedPath(repoRoot, '.claude/settings.json', 'bootstrap settings');
  const pluginRoot = path.resolve(__dirname, '../../..');
  const hookScript = path
    .join(pluginRoot, 'scripts/module-map/regen-if-source-changed.mjs')
    .replace(/\\/g, '/');

  /** @type {Record<string, any>} */
  let settings = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    } catch {
      log.warn('bootstrap could not parse .claude/settings.json — skipping hook', {
        path: settingsPath,
      });
      skipped.push('.claude/settings.json (unparseable)');
      return;
    }
  }

  settings.hooks = settings.hooks ?? {};
  settings.hooks.PostToolUse = settings.hooks.PostToolUse ?? [];

  const alreadyPresent = JSON.stringify(settings.hooks.PostToolUse).includes(
    'regen-if-source-changed.mjs'
  );
  if (alreadyPresent) {
    skipped.push('.claude/settings.json (hook present)');
    return;
  }

  settings.hooks.PostToolUse.push({
    matcher: REGEN_HOOK_MATCHER,
    hooks: [
      {
        type: 'command',
        // Exec form preserves the script path across POSIX and Windows hosts.
        command: 'node',
        args: [hookScript],
      },
    ],
  });

  if (!existsSync(settingsDir)) {
    mkdirSync(settingsDir, { recursive: true });
  }
  writeFileSync(
    settingsPath,
    `${JSON.stringify(settings, null, 2)}\n`,
    'utf8'
  );
  log.info('bootstrap wrote PostToolUse regen hook', { path: settingsPath });
  created.push('.claude/settings.json (PostToolUse regen hook)');
}
