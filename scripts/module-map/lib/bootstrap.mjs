import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeStarterConfigs } from './config.mjs';
import { createLogger } from './logger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '../../bootstrap-templates');

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
function readTemplate(name) {
  const templatePath = path.join(TEMPLATES_DIR, name);
  if (!existsSync(templatePath)) {
    log.warn('bootstrap template missing', { template: name, path: templatePath });
    return '';
  }
  return readFileSync(templatePath, 'utf8');
}

/**
 * @param {string} repoRoot
 * @param {string} relPath
 * @param {string} content
 * @param {string[]} created
 * @param {string[]} skipped
 */
function writeIfMissing(repoRoot, relPath, content, created, skipped) {
  const full = path.join(repoRoot, relPath);
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
  const full = path.join(repoRoot, relDir);
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

  writeStarterConfigs(repoRoot);

  writeIfMissing(
    repoRoot,
    'docs/product.md',
    readTemplate('docs-product.md'),
    created,
    skipped
  );
  writeIfMissing(
    repoRoot,
    'docs/features.md',
    readTemplate('docs-features.md'),
    created,
    skipped
  );
  writeIfMissing(
    repoRoot,
    'docs/roadmap.md',
    readTemplate('docs-roadmap.md'),
    created,
    skipped
  );
  writeIfMissing(
    repoRoot,
    'docs/tech-stack.md',
    readTemplate('docs-tech-stack.md'),
    created,
    skipped
  );

  ensureDirIfMissing(repoRoot, 'test/unit', created, skipped);
  ensureDirIfMissing(repoRoot, 'docs/code-index/modules', created, skipped);

  writeIfMissing(repoRoot, 'AGENTS.md', readTemplate('AGENTS.md'), created, skipped);
  writeIfMissing(repoRoot, 'CLAUDE.md', readTemplate('CLAUDE.md'), created, skipped);
  writeIfMissing(
    repoRoot,
    '.cursor/rules/code-indexer.mdc',
    readTemplate('code-indexer.mdc'),
    created,
    skipped
  );

  if (options.withProjectManifest) {
    writeIfMissing(
      repoRoot,
      'jamaynor.project.json',
      readTemplate('jamaynor.project.json'),
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
  const pkgPath = path.join(repoRoot, 'package.json');
  if (!existsSync(pkgPath)) {
    log.debug('bootstrap no package.json for scripts merge');
    return;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const scripts = pkg.scripts ?? {};
  const additions = {
    'code-map': pluginScriptCommand('scripts/code-map/generate-code-map.mjs'),
    'code-indexer': pluginScriptCommand('scripts/module-map/generate.mjs'),
  };
  const legacyLocalScripts = {
    'code-map': 'scripts/code-map/generate-code-map.mjs',
    'code-indexer': 'scripts/module-map/generate.mjs',
  };

  let changed = false;
  for (const [key, value] of Object.entries(additions)) {
    if (
      !scripts[key] ||
      isLegacyLocalScript(scripts[key], legacyLocalScripts[key])
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
 * code-indexer plugin root at runtime instead of using repo-local copied tooling.
 *
 * @param {string} scriptRelPath
 * @returns {string}
 */
function pluginScriptCommand(scriptRelPath) {
  const script = scriptRelPath.replace(/\\/g, '/');
  const js = [
    "const { spawnSync } = require('node:child_process');",
    "const path = require('node:path');",
    "const root = process.env.CODE_INDEXER_PLUGIN_ROOT || process.env.CLAUDE_PLUGIN_ROOT || process.env.CURSOR_PLUGIN_ROOT;",
    "if (!root) { console.error('code-indexer plugin root not found. Set CODE_INDEXER_PLUGIN_ROOT, CLAUDE_PLUGIN_ROOT, or CURSOR_PLUGIN_ROOT, or run the plugin script directly.'); process.exit(1); }",
    `const script = path.join(root, ${JSON.stringify(script)});`,
    "const result = spawnSync(process.execPath, [script, ...process.argv.slice(1)], { stdio: 'inherit' });",
    "if (result.error) { console.error(result.error.message); process.exit(1); }",
    'process.exit(result.status ?? 1);',
  ].join('');
  return `node -e ${JSON.stringify(js)} --`;
}

/**
 * @param {unknown} value
 * @param {string} scriptRelPath
 * @returns {boolean}
 */
function isLegacyLocalScript(value, scriptRelPath) {
  if (typeof value !== 'string') {
    return false;
  }
  const normalized = value.trim().replace(/\\/g, '/');
  return (
    normalized === `node ${scriptRelPath}` ||
    normalized === `node ./${scriptRelPath}`
  );
}

const REGEN_HOOK_MATCHER = 'Write|Edit';

/**
 * Adds the PostToolUse auto-regeneration hook to the project's
 * .claude/settings.json. Existing hooks are preserved; if a hook entry
 * already references regen-if-source-changed.mjs nothing is written.
 * Opt-out at runtime via "autoRegenerate": false in code-indexer.config.json.
 *
 * @param {string} repoRoot
 * @param {string[]} created
 * @param {string[]} skipped
 */
function writeClaudeHook(repoRoot, created, skipped) {
  const settingsDir = path.join(repoRoot, '.claude');
  const settingsPath = path.join(settingsDir, 'settings.json');
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
        command: `node "${hookScript}"`,
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
