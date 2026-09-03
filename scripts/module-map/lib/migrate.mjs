import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
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
  const from = path.join(repoRoot, fromRel);
  const to = path.join(repoRoot, toRel);
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
  const fromDir = path.join(repoRoot, fromDirRel);
  const toDir = path.join(repoRoot, toDirRel);
  mkdirSync(toDir, { recursive: true });

  for (const name of readdirSync(fromDir)) {
    const target = renameLegacy ? LEGACY_NAMES[name] ?? name : name;
    const from = path.join(fromDir, name);
    const to = path.join(toDir, target);
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
  const legacy = path.join(repoRoot, legacyRel);
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
  const moduleMapPath = path.join(repoRoot, outputDir, 'module-map.json');
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

  const indexPath = path.join(repoRoot, outputDir, 'index.md');
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
  const outputDir = (options.outputDir ?? DEFAULT_OUTPUT_DIR)
    .replace(/\\/g, '/')
    .replace(/\/$/, '');
  log.info('migrate start', { repoRoot, outputDir });
  /** @type {MigrateAction[]} */
  const actions = [];

  // 1. Flatten <outputDir>/context/ into <outputDir>/ (legacy names mapped).
  flattenLegacyContextDir(actions, repoRoot, outputDir);
  for (const [legacy, current] of Object.entries(LEGACY_NAMES)) {
    moveIfPresent(actions, repoRoot, `${outputDir}/${legacy}`, `${outputDir}/${current}`);
  }

  // 2. Patch cross-references in moved files
  patchContextReferences(actions, repoRoot, outputDir);

  // 3. features.md stub
  const featuresPath = path.join(repoRoot, 'docs/features.md');
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
