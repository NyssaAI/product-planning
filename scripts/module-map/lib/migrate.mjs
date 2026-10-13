import {
  existsSync,
  mkdirSync,
  realpathSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { resolveRepoContainedPath, resolveRepoRelativePath } from '../../lib/repo-paths.mjs';
import { createLogger } from './logger.mjs';

const log = createLogger({ module: 'migrate' });

const DEFAULT_OUTPUT_DIR = 'docs/code-map';

/**
 * Legacy artifact names (as found under the old `context/` dir or at the
 * output-dir top level) mapped to their current names.
 * @type {Record<string, string>}
 */
const LEGACY_NAMES = {
  'INDEX.md': 'index.md',
  'CODE_MAP.json': 'code-map.json',
  'MODULE_MAP.json': 'module-map.json',
  scopes: 'modules',
};

const FEATURES_STUB = `# Features

Feature-level breakdown of the application. The Inventory is the scan list; the Definitions section carries each feature's definition. Features are numbered \`F-001\`, \`F-002\`, … A checked box (\`[x]\`) means delivered.

## Inventory

<!-- - [ ] F-001: Example Feature -->

## Definitions

<!--
### F-001: Example Feature

One to three sentences: what the feature is, who it serves, and where its boundary lies.
-->
`;

/**
 * @typedef {object} MigrateAction
 * @property {'moved' | 'created' | 'skipped' | 'patched' | 'removed'} kind
 * @property {string} detail
 */

/**
 * @param {MigrateAction[]} actions
 * @param {string} repoRoot
 * @param {string} fromRel
 * @param {string} toRel
 */
function moveIfPresent(actions, repoRoot, fromRel, toRel) {
  const from = resolveRepoContainedPath(repoRoot, fromRel, 'migration path');
  const to = resolveRepoContainedPath(repoRoot, toRel, 'migration path');
  const caseOnlyRename = from.toLowerCase() === to.toLowerCase();

  if (!existsSync(from)) {
    actions.push({ kind: 'skipped', detail: `${fromRel} (source not present)` });
    return;
  }

  if (caseOnlyRename) {
    // Case-insensitive filesystems (Windows, macOS default) report the target
    // as existing whenever the source does — compare the on-disk name instead.
    const dir = path.dirname(from);
    const actualName = readdirSync(dir).find(
      (name) => name.toLowerCase() === path.basename(from).toLowerCase()
    );
    if (actualName === path.basename(to)) {
      actions.push({ kind: 'skipped', detail: `${toRel} (already renamed)` });
      return;
    }
    renameSync(path.join(dir, actualName), to);
    actions.push({ kind: 'moved', detail: `${fromRel} → ${toRel}` });
    return;
  }

  if (existsSync(to)) {
    actions.push({ kind: 'skipped', detail: `${fromRel} → ${toRel} (target exists)` });
    return;
  }
  mkdirSync(path.dirname(to), { recursive: true });
  renameSync(from, to);
  actions.push({ kind: 'moved', detail: `${fromRel} → ${toRel}` });
}

/**
 * Move every entry of `fromDirRel` into `toDirRel`, renaming legacy artifact
 * names to their current ones. Files whose target already exists are left in
 * place (reported as skipped); a directory whose target already exists is
 * merged one file at a time. The source dir is removed once it is empty.
 *
 * @param {MigrateAction[]} actions
 * @param {string} repoRoot
 * @param {string} fromDirRel
 * @param {string} toDirRel
 * @param {boolean} [renameLegacy] map INDEX.md / CODE_MAP.json / scopes → current names
 */
function moveDirContents(actions, repoRoot, fromDirRel, toDirRel, renameLegacy = true) {
  const fromDir = resolveRepoContainedPath(repoRoot, fromDirRel, 'migration path');
  const toDir = resolveRepoContainedPath(repoRoot, toDirRel, 'migration path');
  mkdirSync(toDir, { recursive: true });

  for (const name of readdirSync(fromDir)) {
    const target = renameLegacy ? LEGACY_NAMES[name] ?? name : name;
    const from = resolveRepoContainedPath(repoRoot, `${fromDirRel}/${name}`, 'migration source');
    const to = resolveRepoContainedPath(repoRoot, `${toDirRel}/${target}`, 'migration destination');
    const fromRel = `${fromDirRel}/${name}`;
    const toRel = `${toDirRel}/${target}`;

    if (existsSync(to)) {
      if (statSync(from).isDirectory() && statSync(to).isDirectory()) {
        moveDirContents(actions, repoRoot, fromRel, toRel, false);
      } else {
        actions.push({ kind: 'skipped', detail: `${fromRel} → ${toRel} (target exists)` });
      }
      continue;
    }
    renameSync(from, to);
    actions.push({ kind: 'moved', detail: `${fromRel} → ${toRel}` });
  }

  if (readdirSync(fromDir).length === 0) {
    rmdirSync(fromDir);
    actions.push({ kind: 'removed', detail: `${fromDirRel}/ (empty legacy dir)` });
  } else {
    actions.push({
      kind: 'skipped',
      detail: `${fromDirRel}/ (left in place — some entries could not be moved)`,
    });
  }
}

/**
 * Flatten the legacy `<outputDir>/context/` layout into `<outputDir>/`.
 *
 * @param {MigrateAction[]} actions
 * @param {string} repoRoot
 * @param {string} outputDir
 */
function flattenLegacyContextDir(actions, repoRoot, outputDir) {
  const legacyRel = `${outputDir}/context`;
  const legacy = resolveRepoContainedPath(repoRoot, legacyRel, 'migration path');
  if (!existsSync(legacy) || !statSync(legacy).isDirectory()) {
    actions.push({ kind: 'skipped', detail: `${legacyRel} (source not present)` });
    return;
  }
  moveDirContents(actions, repoRoot, legacyRel, outputDir, true);
}

/**
 * Patch cross-references inside generated context files.
 *
 * @param {MigrateAction[]} actions
 * @param {string} repoRoot
 * @param {string} outputDir
 */
function patchContextReferences(actions, repoRoot, outputDir) {
  const moduleMapPath = resolveRepoContainedPath(repoRoot, `${outputDir}/module-map.json`, 'migration artifact');
  if (existsSync(moduleMapPath)) {
    let text = readFileSync(moduleMapPath, 'utf8');
    const before = text;
    text = text
      .split('"planningScope"')
      .join('"planningModule"')
      .split('/scopes/')
      .join('/modules/');
    if (text !== before) {
      writeFileSync(moduleMapPath, text, 'utf8');
      actions.push({
        kind: 'patched',
        detail:
          'module-map.json (codeMap path, planningScope → planningModule, scopes → modules)',
      });
    } else {
      actions.push({ kind: 'skipped', detail: 'module-map.json (no old references)' });
    }
  }

  const indexPath = resolveRepoContainedPath(repoRoot, `${outputDir}/index.md`, 'migration artifact');
  if (existsSync(indexPath)) {
    let text = readFileSync(indexPath, 'utf8');
    const before = text;
    text = text
      .split('./scopes/')
      .join('./modules/')
      .split('scopes/')
      .join('modules/')
      .split('CODE_MAP.json')
      .join('code-map.json')
      .split('MODULE_MAP.json')
      .join('module-map.json');
    if (text !== before) {
      writeFileSync(indexPath, text, 'utf8');
      actions.push({
        kind: 'patched',
        detail: 'index.md (relative links, lowercase artifact names)',
      });
    } else {
      actions.push({ kind: 'skipped', detail: 'index.md (no old references)' });
    }
  }
}

/** Validate legacy trees and their mapped destinations before moving anything. */
function preflightTree(repoRoot, fromRel, toRel, renameLegacy = false, ancestors = new Set()) {
  const from = resolveRepoContainedPath(repoRoot, fromRel, 'migration source');
  resolveRepoContainedPath(repoRoot, toRel, 'migration destination');
  if (!existsSync(from) || !statSync(from).isDirectory()) return;
  const real = realpathSync(from);
  if (ancestors.has(real)) throw new Error(`migration source contains a directory cycle: ${fromRel}`);
  const next = new Set(ancestors).add(real);
  for (const name of readdirSync(from)) {
    const target = renameLegacy ? LEGACY_NAMES[name] ?? name : name;
    preflightTree(repoRoot, `${fromRel}/${name}`, `${toRel}/${target}`, false, next);
  }
}

/**
 * Normalize generated code-map artifact names under the configured output
 * dir (default docs/code-map/). Every step is idempotent — re-running reports
 * "skipped" for completed steps.
 *
 * @param {string} repoRoot
 * @param {{ outputDir?: string }} [options] configured code-map output dir
 * @returns {MigrateAction[]}
 */
export function runMigrate(repoRoot, options = {}) {
  const outputDir = resolveRepoRelativePath(
    repoRoot,
    options.outputDir ?? DEFAULT_OUTPUT_DIR,
    'migration output directory'
  );
  log.info('migrate start', { repoRoot, outputDir });
  /** @type {MigrateAction[]} */
  const actions = [];

  resolveRepoContainedPath(repoRoot, 'docs/features.md', 'migration features');
  preflightTree(repoRoot, `${outputDir}/context`, outputDir, true);
  for (const [legacy, current] of Object.entries(LEGACY_NAMES)) {
    preflightTree(repoRoot, `${outputDir}/${legacy}`, `${outputDir}/${current}`);
  }

  // 1. Flatten <outputDir>/context/ into <outputDir>/ (legacy names mapped).
  flattenLegacyContextDir(actions, repoRoot, outputDir);
  for (const [legacy, current] of Object.entries(LEGACY_NAMES)) {
    moveIfPresent(actions, repoRoot, `${outputDir}/${legacy}`, `${outputDir}/${current}`);
  }

  // 2. Patch cross-references in moved files
  patchContextReferences(actions, repoRoot, outputDir);

  // 3. features.md stub
  const featuresPath = resolveRepoContainedPath(repoRoot, 'docs/features.md', 'migration features');
  if (existsSync(featuresPath)) {
    actions.push({ kind: 'skipped', detail: 'docs/features.md (exists)' });
  } else {
    mkdirSync(path.dirname(featuresPath), { recursive: true });
    writeFileSync(featuresPath, FEATURES_STUB, 'utf8');
    actions.push({ kind: 'created', detail: 'docs/features.md (stub)' });
  }

  log.info('migrate complete', {
    moved: actions.filter((a) => a.kind === 'moved').length,
    created: actions.filter((a) => a.kind === 'created').length,
    patched: actions.filter((a) => a.kind === 'patched').length,
    removed: actions.filter((a) => a.kind === 'removed').length,
    skipped: actions.filter((a) => a.kind === 'skipped').length,
  });

  return actions;
}

/**
 * @param {MigrateAction[]} actions
 * @returns {string}
 */
export function formatMigrateReport(actions) {
  const lines = ['plan-product migrate:'];
  for (const action of actions) {
    lines.push(`  ${action.kind.padEnd(7)} ${action.detail}`);
  }
  const counts = ['moved', 'created', 'patched', 'removed', 'skipped']
    .map((k) => `${actions.filter((a) => a.kind === k).length} ${k}`)
    .join(', ');
  lines.push(`  (${counts})`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}
